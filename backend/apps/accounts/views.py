"""
Authentication views for Supabase integration.

Note: Actual authentication is handled by Supabase Auth on the frontend.
These endpoints are for checking auth status and user info.
"""

import logging

from apps.core.supabase_client import supabase_client
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
    Called after signup (email or OAuth) to set first/last name and optional phone.
    """
    first_name = request.data.get("first_name", "").strip()
    last_name = request.data.get("last_name", "").strip()
    phone_number = request.data.get("phone_number", "").strip() or None

    if not first_name or not last_name:
        return Response(
            {"error": "First name and last name are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        response = supabase_client.client.auth.admin.update_user_by_id(
            request.user_id,
            {
                "user_metadata": {
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone_number": phone_number,
                    "profile_completed": True,
                }
            },
        )

        if not response.user:
            return Response(
                {"error": "Failed to update profile"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Profile completed successfully",
                "user": response.user.model_dump(),
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.error(f"Profile completion failed for {request.user_id}: {e}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    """
    Get current user's profile information.
    Includes profile fields from user_metadata.
    """
    user_metadata = {}
    if hasattr(request.user, 'data') and isinstance(request.user.data, dict):
        user_metadata = request.user.data.get("user_metadata", {}) or {}

    return Response({
        "user": request.user,
        "user_id": request.user_id,
        "first_name": user_metadata.get("first_name"),
        "last_name": user_metadata.get("last_name"),
        "phone_number": user_metadata.get("phone_number"),
        "profile_completed": user_metadata.get("profile_completed", False),
    })


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
        user_id=request.user_id,
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

    keys = APIKey.objects.filter(user_id=request.user_id)
    serializer = APIKeySerializer(keys, many=True)
    return Response(serializer.data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def revoke_api_key(request, key_id):
    """Revoke (delete) an API key."""
    from .models import APIKey

    try:
        key = APIKey.objects.get(id=key_id, user_id=request.user_id)
        key.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except APIKey.DoesNotExist:
        return Response(
            {"error": "API key not found"}, status=status.HTTP_404_NOT_FOUND
        )
