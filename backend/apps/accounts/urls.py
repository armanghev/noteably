"""URL configuration for accounts app."""

from django.urls import path

from . import views

urlpatterns = [
    path("signup", views.signup, name="signup"),
    path("login", views.login, name="login"),
    path("complete-profile", views.complete_profile, name="complete_profile"),
    path("me", views.get_user_profile, name="user_profile"),
    path("me/delete", views.delete_account, name="delete_account"),
    path("recover", views.recover_account, name="recover_account"),
    path("confirm-recovery", views.confirm_recovery, name="confirm_recovery"),
    path("confirm-recovery-oauth", views.confirm_recovery_oauth, name="confirm_recovery_oauth"),
    path("me/restore", views.restore_account, name="restore_account"),
    path("me/update", views.update_profile, name="update_profile"),
    path("me/fix-oauth-metadata", views.fix_oauth_metadata, name="fix_oauth_metadata"),
    path("me/request-email-otp", views.request_email_otp, name="request_email_otp"),
    path("me/verify-email-otp", views.verify_email_change_otp, name="verify_email_change_otp"),
    path("me/request-email-change", views.request_email_change, name="request_email_change"),
    path("confirm-email-change", views.confirm_email_change, name="confirm_email_change"),
    path("me/change-password", views.change_password, name="change_password"),
    path("me/set-password", views.set_password, name="set_password"),
    path("security-action", views.security_action, name="security_action"),
    path("security-set-password", views.security_set_password, name="security_set_password"),
    path("forgot-password/request-otp", views.forgot_password_request_otp, name="forgot_password_request_otp"),
    path("forgot-password/verify-otp", views.forgot_password_verify_otp, name="forgot_password_verify_otp"),
    path("forgot-password/reset", views.forgot_password_reset, name="forgot_password_reset"),
    path("subscription", views.get_subscription_status, name="subscription_status"),
    path("api-keys", views.list_api_keys, name="list_api_keys"),
    path("api-keys/create", views.create_api_key, name="create_api_key"),
    path("api-keys/<uuid:key_id>", views.revoke_api_key, name="revoke_api_key"),
]
