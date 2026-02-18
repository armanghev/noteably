"""
Authentication views for Supabase integration.

Note: Actual authentication is handled by Supabase Auth on the frontend.
These endpoints are for checking auth status and user info.
"""

import logging
import os
from datetime import datetime, timezone

import requests as http_requests
from apps.core.supabase_client import supabase_client
from apps.core.utils.email import (
    send_deletion_confirmation_email,
    send_welcome_email,
)
from apps.core.utils.token import generate_recovery_token
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .permissions import IsAuthenticated

logger = logging.getLogger(__name__)


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

        return Response(
            {
                "user": response.user.model_dump(),
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
                email=user_email,
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
