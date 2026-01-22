"""Middleware for Supabase WebSocket authentication."""

import logging
from urllib.parse import parse_qs

from apps.core.exceptions import AuthenticationError
from apps.core.supabase_client import supabase_client
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


class SupabaseWebSocketMiddleware(BaseMiddleware):
    """
    Middleware to authenticate WebSocket connections via Supabase JWT.

    Expects 'token' in the query string.
    Example: ws://.../ws/user/?token=eyJ...
    """

    async def __call__(self, scope, receive, send):
        # Parse query string
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token = query_params.get("token", [None])[0]

        scope["user"] = AnonymousUser()
        scope["user_id"] = None

        if token:
            try:
                # Verify token (sync call wrapped in async)
                user_data = await self.verify_token(token)

                if user_data:
                    # We can't really set a Django User object because we aren't syncing users
                    # perfectly to a local DB in this architecture.
                    # But we can set a dict-like object or just the ID.
                    # For compatibility with Channels, usually 'user' is expected.
                    # We'll attach the raw Supabase user data and the ID.
                    scope["user_data"] = user_data
                    scope["user_id"] = user_data.get("id")

                    # Create a fake user object for "is_authenticated" checks if needed
                    # or just rely on scope['user_id']

            except AuthenticationError as e:
                logger.warning(f"WebSocket authentication failed: {e}")
            except Exception as e:
                logger.error(f"WebSocket auth error: {e}")

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def verify_token(self, token):
        """Verify token using shared Supabase client."""
        return supabase_client.verify_token(token)
