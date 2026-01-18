"""Permission classes for API views."""

from rest_framework import permissions


class IsAuthenticated(permissions.BasePermission):
    """
    Permission class that requires authentication via Supabase JWT.
    User data is attached by the auth middleware.
    """

    message = "Authentication required"

    def has_permission(self, request, view):
        """Check if request has valid user from middleware."""
        return (
            hasattr(request, "user")
            and request.user is not None
            and hasattr(request, "user_id")
            and request.user_id is not None
        )


class IsPaidUser(permissions.BasePermission):
    """
    Permission class that requires paid subscription tier.
    Used for gated features like PDF export.
    """

    message = "This feature requires a paid subscription"

    def has_permission(self, request, view):
        """Check if user has paid subscription."""
        if not hasattr(request, "user") or request.user is None:
            return False

        # Check subscription tier (Would query user_subscriptions table)
        # For now, simplified check
        subscription_tier = request.user.get("app_metadata", {}).get(
            "subscription_tier", "free"
        )
        return subscription_tier in ["pro", "enterprise"]


class IsOwner(permissions.BasePermission):
    """
    Permission class that checks if user owns the resource.
    Object must have 'user_id' attribute.
    """

    message = "You don't have permission to access this resource"

    def has_object_permission(self, request, view, obj):
        """Check if user owns the object."""
        if not hasattr(request, "user_id") or request.user_id is None:
            return False

        return str(obj.user_id) == str(request.user_id)
