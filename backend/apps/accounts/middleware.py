"""Middleware for Supabase JWT authentication."""

import logging

from apps.core.exceptions import AuthenticationError, InvalidTokenError
from apps.core.supabase_client import supabase_client
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def supabase_auth_middleware(get_response):
    """
    Middleware to validate Supabase JWT tokens and attach user to request.

    Extracts token from Authorization header and validates it with Supabase.
    Adds 'user' and 'user_id' attributes to request object.
    """

    def middleware(request):
        # Skip auth for certain paths
        exempt_paths = [
            "/admin/",
            "/health/",
            "/api/auth/login",
            "/api/auth/register",
        ]

        if any(request.path.startswith(path) for path in exempt_paths):
            return get_response(request)

        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization", "")
        token = None

        if auth_header.startswith("Bearer "):
            token = auth_header[7:]  # Remove 'Bearer ' prefix

        if not token:
            # Allow requests without token (will be handled by view permissions)
            request.user = None
            request.user_id = None
            return get_response(request)

        # CHECK FOR API KEY (sk_...)
        if token.startswith("sk_"):
            try:
                from django.utils import timezone

                from .api_key_utils import hash_key, split_key_string
                from .models import APIKey

                key_parts = split_key_string(token)
                if not key_parts:
                    raise AuthenticationError("Invalid API key format")

                prefix, secret = key_parts
                hashed = hash_key(secret)

                # Find key in DB
                api_key = APIKey.objects.get(
                    prefix=prefix, hashed_key=hashed, is_active=True
                )

                # Update usage stats
                api_key.last_used_at = timezone.now()
                api_key.save(update_fields=["last_used_at"])

                # Set user data from Supabase (to mimic JWT auth)
                # We need to fetch the user to get the 'app_metadata' etc. if needed later
                # For now, we construct a basic user object
                user_data = {
                    "id": str(api_key.user_id),
                    "aud": "authenticated",
                    "role": "authenticated",
                    "app_metadata": {"provider": "api_key", "key_name": api_key.name},
                }

                request.user = user_data
                request.user_id = str(api_key.user_id)
                return get_response(request)

            except APIKey.DoesNotExist:
                return JsonResponse({"error": "Invalid API key"}, status=401)
            except Exception as e:
                logger.error(f"API Key auth error: {e}", exc_info=True)
                return JsonResponse({"error": "Authentication error"}, status=500)

        # STANDARD JWT AUTH
        try:
            # Verify token with Supabase
            user_data = supabase_client.verify_token(token)

            if not user_data.get("id"):
                raise AuthenticationError("User data missing ID")

            request.user = user_data
            request.user_id = user_data.get("id")

        except (AuthenticationError, InvalidTokenError) as e:
            logger.warning(f"Authentication failed: {e}")
            return JsonResponse(
                {"error": "Invalid or expired token", "detail": str(e)}, status=401
            )
        except Exception as e:
            logger.error(f"Unexpected error in auth middleware: {e}", exc_info=True)
            return JsonResponse({"error": "Authentication error"}, status=500)

        return get_response(request)

    return middleware
