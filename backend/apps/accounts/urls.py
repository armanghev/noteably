"""URL configuration for accounts app."""

from django.urls import path

from . import views

urlpatterns = [
    path("signup", views.signup, name="signup"),
    path("login", views.login, name="login"),
    path("me", views.get_user_profile, name="user_profile"),
    path("subscription", views.get_subscription_status, name="subscription_status"),
    path("api-keys", views.list_api_keys, name="list_api_keys"),
    path("api-keys/create", views.create_api_key, name="create_api_key"),
    path("api-keys/<uuid:key_id>", views.revoke_api_key, name="revoke_api_key"),
]
