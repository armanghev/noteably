from rest_framework import authentication


class SupabaseAuthentication(authentication.BaseAuthentication):
    """
    DRF Authentication class that works with Supabase Auth Middleware.

    This ensures that DRF views see the user that was attached by the
    Supabase middleware, instead of overwriting it with AnonymousUser.
    """

    def authenticate(self, request):
        # The user should have been set by the middleware already
        # request._request is the underlying Django request
        user = getattr(request._request, "user", None)

        if not user or (hasattr(user, "is_anonymous") and user.is_anonymous):
            return None

        # If we have a valid user dict/object from our middleware
        if isinstance(user, dict) or (hasattr(user, "id") and user.id):
            return (user, None)

        return None
