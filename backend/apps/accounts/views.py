"""
Authentication views for Supabase integration.

Note: Actual authentication is handled by Supabase Auth on the frontend.
These endpoints are for checking auth status and user info.
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from uuid import UUID

import requests as http_requests
from django.core import signing
from apps.core.supabase_client import supabase_client
from apps.core.utils.email import (
    send_deletion_confirmation_email,
    send_welcome_email,
)
from apps.core.utils.token import (
    generate_recovery_token,
    generate_recovery_session_token,
    verify_recovery_token,
    verify_recovery_session_token,
    mark_recovery_token_used,
    is_recovery_token_used,
)
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .permissions import IsAuthenticated

logger = logging.getLogger(__name__)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength.

    Returns a tuple of (is_valid: bool, error_message: str).
    Error message is empty string if password is valid.

    Requirements:
    - At least 8 characters
    - At least one uppercase letter
    - At least one digit
    """
    if not password:
        return False, "Password is required"
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    return True, ""


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    """
    Register a new user via Supabase Auth.
    """
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response(
            {"error": "Email and password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Sign up with Supabase
        response = supabase_client.client.auth.sign_up(
            {"email": email, "password": password}
        )

        if not response.user:
            return Response(
                {"error": "Signup failed. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Signup successful. Please check your email for verification.",
                "user": response.user.model_dump(),
                # Note: Session might be None if email confirmation is enabled
                "session": response.session.model_dump() if response.session else None,
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        logger.error(f"Signup failed for {email}: {e}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """
    Login user via Supabase Auth.

    Checks if account is scheduled for deletion before allowing login.
    If deleted_at is set and within 14-day grace period, returns 403.
    """
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response(
            {"error": "Email and password are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Sign in with Supabase
        response = supabase_client.client.auth.sign_in_with_password(
            {"email": email, "password": password}
        )

        if not response.user or not response.session:
            return Response(
                {"error": "Login failed. Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Check if account is scheduled for deletion
        user_data = response.user.model_dump()
        user_metadata = user_data.get("user_metadata", {}) or {}
        deleted_at = user_metadata.get("deleted_at")

        if deleted_at:
            # Account is pending deletion, check if within grace period
            try:
                parsed_dt = datetime.fromisoformat(deleted_at)
                # Ensure datetime is timezone-aware
                if parsed_dt.tzinfo is None:
                    parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                deletion_scheduled = parsed_dt + timedelta(days=14)
                if datetime.now(timezone.utc) < deletion_scheduled:
                    # Still in grace period, prevent login
                    logger.info(
                        f"Login attempt on deleted account: {email} (ID: {user_data.get('id')})"
                    )
                    return Response(
                        {
                            "error": "Account scheduled for deletion. You have 14 days to recover your account.",
                            "recovery_available": True,
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
            except (ValueError, TypeError) as e:
                logger.error(f"Error parsing deleted_at timestamp for {email}: {e}")
                # If there's an error parsing the date, still block the account as a safety measure
                return Response(
                    {
                        "error": "Account scheduled for deletion. You have 14 days to recover your account.",
                        "recovery_available": True,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        return Response(
            {
                "user": user_data,
                "session": response.session.model_dump(),
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Login failed for {email}: {e}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def complete_profile(request):
    """
    Complete user profile by updating Supabase user_metadata.
    Uses the user's own JWT to update their metadata directly.
    """
    import os

    import requests as http_requests

    first_name = request.data.get("first_name", "").strip()
    last_name = request.data.get("last_name", "").strip()
    phone_number = request.data.get("phone_number", "").strip() or None

    if not first_name or not last_name:
        return Response(
            {"error": "First name and last name are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Extract the user's JWT from the Authorization header
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    user_token = auth_header[7:] if auth_header.startswith("Bearer ") else ""

    if not user_token:
        return Response({"error": "Missing token"}, status=status.HTTP_401_UNAUTHORIZED)

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    try:
        # Check if profile was already completed to avoid duplicate welcome emails
        # request.user is a SupabaseUser wrapper around the JWT claims/user data
        user_metadata = {}
        if hasattr(request.user, "data") and isinstance(request.user.data, dict):
            user_metadata = request.user.data.get("user_metadata", {}) or {}

        is_first_completion = not user_metadata.get("profile_completed", False)

        # Use the user endpoint with their JWT — avoids admin API restrictions
        resp = http_requests.put(
            f"{supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {user_token}",
                "apikey": service_key,
                "Content-Type": "application/json",
            },
            json={
                "data": {
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone_number": phone_number,
                    "profile_completed": True,
                }
            },
            timeout=10,
        )
        resp.raise_for_status()

        # Send welcome email only on first completion
        if is_first_completion:
            try:
                # User's email is in request.user.email (from SupabaseUser wrapper)
                to_email = request.user.email
                if to_email:
                    send_welcome_email(to_email, first_name)
                    logger.info(f"Welcome email sent to {to_email}")
            except Exception as e:
                logger.error(
                    f"Failed to send welcome email to {request.user.email}: {e}"
                )

        return Response(
            {
                "message": "Profile completed successfully",
                "profile_completed": True,
                "first_name": first_name,
                "last_name": last_name,
                "phone_number": phone_number,
            },
            status=status.HTTP_200_OK,
        )
    except http_requests.HTTPError as e:
        error_body = e.response.json() if e.response is not None else {}
        error_msg = error_body.get("msg") or error_body.get("message") or str(e)
        logger.error(f"Profile completion failed for {request.user_id}: {error_msg}")
        return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Profile completion failed for {request.user_id}: {e}")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    """
    Get current user's profile information.
    Includes profile fields from user_metadata.
    """
    user_metadata = {}
    if hasattr(request.user, "data") and isinstance(request.user.data, dict):
        user_metadata = request.user.data.get("user_metadata", {}) or {}

    return Response(
        {
            "user": request.user,
            "user_id": request.user_id,
            "first_name": user_metadata.get("first_name"),
            "last_name": user_metadata.get("last_name"),
            "phone_number": user_metadata.get("phone_number"),
            "profile_completed": user_metadata.get("profile_completed", False),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_subscription_status(request):
    """
    Get user's subscription tier and usage stats.

    Returns:
        Subscription details including tier, limits, and current usage
    """
    result = supabase_client.query(
        "user_subscriptions", eq={"user_id": request.user_id}
    )

    if not result:
        # Return free tier defaults if no subscription found
        return Response(
            {
                "tier": "free",
                "monthly_upload_limit": 5,
                "monthly_minutes_limit": 30,
                "max_file_size_mb": 100,
                "uploads_this_month": 0,
                "minutes_used_this_month": 0,
                "uploads_remaining": 5,
                "minutes_remaining": 30,
            }
        )

    subscription = result[0]
    return Response(
        {
            **subscription,
            "uploads_remaining": subscription["monthly_upload_limit"]
            - subscription["uploads_this_month"],
            "minutes_remaining": subscription["monthly_minutes_limit"]
            - subscription["minutes_used_this_month"],
        }
    )


@api_view(["GET"])
def health_check(request):
    """Health check endpoint (no auth required)."""
    return Response({"status": "healthy", "service": "noteably-api"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_api_key(request):
    """
    Create a new API key.
    Returns the full key string ONLY ONCE.
    """
    from .api_key_utils import (
        generate_api_key_prefix,
        generate_full_key_string,
        generate_secret_key,
        hash_key,
    )
    from .models import APIKey
    from .serializers import APIKeySerializer, CreateAPIKeySerializer

    serializer = CreateAPIKeySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    name = serializer.validated_data["name"]
    prefix = generate_api_key_prefix()
    secret = generate_secret_key()
    hashed_key = hash_key(secret)
    full_key = generate_full_key_string(prefix, secret)

    api_key = APIKey.objects.create(
        user=request.user_id,
        name=name,
        prefix=prefix,
        hashed_key=hashed_key,
    )

    # Return the full key and the key object
    return Response(
        {
            "key": full_key,
            "api_key": APIKeySerializer(api_key).data,
            "warning": "This is the only time the full key will be shown. Please save it securely.",
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_api_keys(request):
    """List all API keys for the user."""
    from .models import APIKey
    from .serializers import APIKeySerializer

    keys = APIKey.objects.filter(user=request.user_id)
    serializer = APIKeySerializer(keys, many=True)
    return Response(serializer.data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def revoke_api_key(request, key_id):
    """Revoke (delete) an API key."""
    from .models import APIKey

    try:
        key = APIKey.objects.get(id=key_id, user=request.user_id)
        key.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except APIKey.DoesNotExist:
        return Response(
            {"error": "API key not found"}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """
    Soft-delete the authenticated user's account.

    Sets deleted_at in user metadata (marking account for pending deletion),
    sends recovery email with 14-day grace period.

    Account is locked immediately by middleware.
    After 14 days, a background task performs hard deletion.

    Returns:
        204 No Content on success
        500 Internal Server Error if critical updates fail
    """
    user_id = request.user_id
    user_email = request.user.email
    first_name = (
        request.user.user_metadata.get("first_name", "there")
        if hasattr(request.user, "user_metadata")
        else "there"
    )

    # 1. Generate signed recovery token (valid 14 days)
    try:
        recovery_token = generate_recovery_token(user_id)
        logger.info(f"Generated recovery token for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to generate recovery token for {user_id}: {e}")
        return Response(
            {"error": "Failed to initiate deletion. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # 2. Set deleted_at timestamp in Supabase user metadata
    try:
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        user_token = auth_header[7:] if auth_header.startswith("Bearer ") else ""

        if not user_token:
            logger.error(f"No token in auth header for user {user_id}")
            return Response(
                {"error": "Missing authentication token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        deleted_at = datetime.now(timezone.utc).isoformat()

        supabase_url = os.getenv("SUPABASE_URL")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        resp = http_requests.put(
            f"{supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {user_token}",
                "apikey": service_key,
                "Content-Type": "application/json",
            },
            json={
                "data": {
                    "deleted_at": deleted_at,
                }
            },
            timeout=10,
        )
        resp.raise_for_status()
        logger.info(f"Set deleted_at for user {user_id}")
    except http_requests.HTTPError as e:
        error_msg = e.response.json() if e.response is not None else {}
        logger.error(f"Failed to set deleted_at for {user_id}: {error_msg}")
        return Response(
            {"error": "Failed to update account status"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    except Exception as e:
        logger.error(f"Failed to set deleted_at for {user_id}: {e}")
        return Response(
            {"error": "Failed to update account status"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # 3. Send deletion confirmation email with recovery link
    if user_email:
        try:
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
            recovery_url = f"{frontend_url}/recover?token={recovery_token}"
            send_deletion_confirmation_email(
                to_email=user_email,
                first_name=first_name,
                recovery_link=recovery_url,
                days_remaining=14,
            )
            logger.info(f"Deletion confirmation email sent to {user_email}")
        except Exception as e:
            logger.error(f"Failed to send deletion email to {user_email}: {e}")
            # Note: Don't fail the deletion if email fails to send
            # User account is already marked for deletion

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([AllowAny])
def recover_account(request):
    """
    Verify recovery token and issue short-lived recovery session token.

    This endpoint is called when a user clicks the recovery link from their
    deletion confirmation email. It verifies the recovery token and returns
    a short-lived session token for use in the password reset flow.

    Query Parameters:
        token (required): Signed recovery token from email link

    Response (200 OK):
        {
            "recovery_session_token": "short-lived-token",
            "user_id": "uuid",
            "email": "user@example.com",
            "message": "Recovery verified. Please reset your password.",
            "recovery_expires_in_seconds": 3600
        }

    Error Responses:
        400 Bad Request: No token provided or token parsing failed
        401 Unauthorized: Token is invalid, expired, or not for account deletion
        500 Internal Server Error: Server error during verification
    """
    token = request.query_params.get("token")
    if not token:
        logger.warning("Recover endpoint called without token")
        return Response(
            {"error": "Recovery token is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Verify the recovery token (signature, expiration, recovery_type)
        logger.info(f"Attempting to verify recovery token: {token[:50]}...")
        payload = verify_recovery_token(token)
        user_id = payload.get("user_id")
        recovery_type = payload.get("recovery_type")
        logger.info(f"Token verified successfully for user {user_id}, type: {recovery_type}")

        # Verify it's for account deletion
        if recovery_type != "account_deletion":
            logger.warning(f"Invalid recovery type in token: {recovery_type}")
            return Response(
                {"error": "Invalid recovery token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Fetch minimal user info to detect auth provider (try/fail gracefully)
        user_email = None
        auth_provider = None
        try:
            user_from_supabase = supabase_client.get_user_by_id(user_id)
            if user_from_supabase:
                user_email = user_from_supabase.get("email")
                # Detect if user authenticated via OAuth
                app_metadata = user_from_supabase.get("app_metadata", {})
                if app_metadata.get("provider") and app_metadata.get("provider") != "email":
                    auth_provider = app_metadata.get("provider")
        except Exception as e:
            logger.debug(f"Could not fetch user data during recovery (OK if deleted): {e}")

        # Generate short-lived recovery session token (1 hour)
        try:
            recovery_session_token = generate_recovery_session_token(
                UUID(user_id)
            )
        except Exception as e:
            logger.error(f"Failed to generate recovery session token for {user_id}: {e}")
            return Response(
                {"error": "Failed to generate recovery session"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Log successful recovery verification
        logger.info(f"Recovery verified for user {user_id}")

        return Response(
            {
                "recovery_session_token": recovery_session_token,
                "user_id": user_id,
                "email": user_email,
                "auth_provider": auth_provider,
                "message": "Recovery verified. Please reset your password.",
                "recovery_expires_in_seconds": 3600,
            },
            status=status.HTTP_200_OK,
        )

    except signing.BadSignature as e:
        logger.warning(f"Invalid recovery token signature: {e}")
        return Response(
            {"error": "Invalid or expired recovery token"},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    except Exception as e:
        logger.error(f"Recovery verification failed: {e}")
        return Response(
            {"error": "Failed to verify recovery token"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def confirm_recovery(request):
    """
    Reset password and unlock account after recovery verification.

    This endpoint completes the account recovery flow by:
    1. Validating the recovery session token
    2. Validating the new password strength
    3. Updating the password in Supabase Auth
    4. Clearing the deleted_at flag from user metadata
    5. Marking the token as used (one-time use enforcement)

    Request Body:
        {
            "recovery_session_token": "token-from-recover-endpoint",
            "new_password": "user-entered-password"
        }

    Response (200 OK):
        {
            "message": "Account recovered successfully",
            "user_id": "uuid",
            "email": "string",
            "recovery_completed": true,
            "next_step": "You can now log in with your new password"
        }

    Error Responses:
        400 Bad Request: Missing required fields
        401 Unauthorized: Invalid or expired recovery_session_token
        422 Unprocessable Entity: Weak password
        500 Internal Server Error: Server errors
    """
    # 1. Parse request
    recovery_session_token = request.data.get("recovery_session_token")
    new_password = request.data.get("new_password")

    if not recovery_session_token or not new_password:
        return Response(
            {
                "error": "recovery_session_token and new_password are required"
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 2. Check for token reuse (one-time use enforcement)
    if is_recovery_token_used(recovery_session_token):
        logger.warning(
            "Attempt to reuse recovery session token"
        )
        return Response(
            {
                "error": "Recovery session token has already been used"
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # 3. Validate recovery session token
    try:
        session_payload = verify_recovery_session_token(recovery_session_token)
        user_id = session_payload.get("user_id")
        if not user_id:
            logger.warning(
                "Recovery session token missing user_id"
            )
            return Response(
                {"error": "Invalid recovery session token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
    except signing.BadSignature as e:
        logger.warning(
            f"Recovery session token validation failed: {e}"
        )
        return Response(
            {"error": "Invalid or expired recovery session token"},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    except Exception as e:
        logger.warning(
            f"Recovery session token validation error: {e}"
        )
        return Response(
            {"error": "Invalid or expired recovery session token"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # 4. Validate password strength
    is_valid_password, error_msg = validate_password_strength(new_password)
    if not is_valid_password:
        return Response(
            {"error": error_msg},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    # 5. Clear deleted_at and reset password in a single admin API call
    # Use a fresh Supabase client to avoid auth state pollution from middleware
    try:
        from supabase import create_client as create_supabase_client

        fresh_client = create_supabase_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        )

        # Fetch user email (needed to check if new password differs from old)
        user_record = fresh_client.auth.admin.get_user_by_id(str(user_id))
        user_email_for_check = user_record.user.email if user_record.user else None

        # Reject if new password is the same as the current password
        if user_email_for_check:
            try:
                fresh_client.auth.sign_in_with_password({"email": user_email_for_check, "password": new_password})
                # Sign-in succeeded → new password is the same as the old one
                fresh_client.auth.sign_out()
                return Response(
                    {"error": "New password must be different from your previous passwords."},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )
            except Exception:
                # Sign-in failed → passwords differ → proceed
                pass

        fresh_client.auth.admin.update_user_by_id(
            str(user_id),
            {
                "password": new_password,
                "user_metadata": {"deleted_at": None},
            }
        )
        logger.info(f"Account unlocked and password reset for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to unlock/reset password for user {user_id}: {e}", exc_info=True)
        return Response(
            {"error": "Failed to recover account. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # 7. Mark token as used (one-time use enforcement)
    mark_recovery_token_used(recovery_session_token)

    # 8. Fetch user info for response
    user_email = "unknown"
    try:
        user_from_supabase = supabase_client.get_user_by_id(str(user_id))
        if user_from_supabase:
            user_email = user_from_supabase.get("email", "unknown")
    except Exception as e:
        logger.error(f"Failed to fetch user {user_id} after recovery: {e}")

    # 9. Log recovery event
    logger.info(
        f"Account recovery completed successfully for user {user_id}"
    )

    return Response(
        {
            "message": "Account recovered successfully",
            "user_id": user_id,
            "email": user_email,
            "recovery_completed": True,
            "next_step": "You can now log in with your new password",
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
def confirm_recovery_oauth(request):
    """
    Complete account recovery for OAuth users.

    OAuth users don't set a new password — instead they verify ownership by
    signing in with their OAuth provider. This endpoint just clears the
    deleted_at flag to unlock the account.

    Request Body:
        {
            "recovery_session_token": "short-lived-token-from-/recover"
        }

    Response (200 OK):
        {
            "message": "Account recovered successfully",
            "user_id": "uuid",
            "recovery_completed": True
        }

    Error Responses:
        400 Bad Request: Missing recovery_session_token
        401 Unauthorized: Invalid or expired token, or token already used
        500 Internal Server Error: Server errors
    """
    # 1. Parse request
    recovery_session_token = request.data.get("recovery_session_token")

    if not recovery_session_token:
        return Response(
            {"error": "recovery_session_token is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 2. Check for token reuse (one-time use enforcement)
    if is_recovery_token_used(recovery_session_token):
        logger.warning("Attempt to reuse recovery session token in OAuth recovery")
        return Response(
            {"error": "Recovery session token has already been used"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # 3. Validate recovery session token
    try:
        session_payload = verify_recovery_session_token(recovery_session_token)
        user_id = session_payload.get("user_id")
        if not user_id:
            logger.warning("Recovery session token missing user_id")
            return Response(
                {"error": "Invalid recovery session token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
    except signing.BadSignature as e:
        logger.warning(f"Recovery session token validation failed: {e}")
        return Response(
            {"error": "Invalid or expired recovery session token"},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    except Exception as e:
        logger.warning(f"Recovery session token validation error: {e}")
        return Response(
            {"error": "Invalid or expired recovery session token"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # 4. Clear deleted_at from user metadata to unlock account
    try:
        from supabase import create_client as create_supabase_client

        fresh_client = create_supabase_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        )
        fresh_client.auth.admin.update_user_by_id(
            str(user_id),
            {"user_metadata": {"deleted_at": None}},
        )
        logger.info(f"Account unlocked (OAuth recovery) for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to unlock account for OAuth recovery {user_id}: {e}", exc_info=True)
        return Response(
            {"error": "Failed to recover account. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # 5. Mark token as used (one-time use enforcement)
    mark_recovery_token_used(recovery_session_token)

    # 6. Log recovery event
    logger.info(f"OAuth account recovery completed successfully for user {user_id}")

    return Response(
        {
            "message": "Account recovered successfully",
            "user_id": user_id,
            "recovery_completed": True,
        },
        status=status.HTTP_200_OK,
    )
