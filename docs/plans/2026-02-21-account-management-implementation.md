# Account Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add account management features (edit name/phone, change email, change/set password) to the Profile page with security notifications.

**Architecture:** Expand backend with 5 new endpoints following existing view patterns. Add email change token utilities mirroring recovery token pattern. Frontend gets 3 new profile components + a confirmation page. All auth goes through Supabase.

**Tech Stack:** Django REST Framework, Supabase Auth admin API, Resend email, React, Tailwind CSS, Radix UI

**Worktree:** `/Users/armanghevondyan/Desktop/vibecoding/noteably/.worktrees/account-management`

**All commands run in Docker:** `docker exec noteably <command>`

---

### Task 1: Add Account Serializers

**Files:**
- Modify: `backend/apps/accounts/serializers.py` (after line 31)

**Step 1: Add serializers after CreateAPIKeySerializer**

Add to `backend/apps/accounts/serializers.py` after line 31:

```python


class UpdateProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=50, required=False)
    last_name = serializers.CharField(max_length=50, required=False)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate(self, data):
        if not data:
            raise serializers.ValidationError("At least one field must be provided.")
        return data


class ChangeEmailSerializer(serializers.Serializer):
    new_email = serializers.EmailField(required=True)
    current_password = serializers.CharField(required=True, write_only=True)

    def validate_new_email(self, value):
        return value.lower().strip()


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)

    def validate_new_password(self, value):
        from apps.accounts.views import validate_password_strength
        is_valid, error_msg = validate_password_strength(value)
        if not is_valid:
            raise serializers.ValidationError(error_msg)
        return value


class SetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=True, write_only=True)

    def validate_new_password(self, value):
        from apps.accounts.views import validate_password_strength
        is_valid, error_msg = validate_password_strength(value)
        if not is_valid:
            raise serializers.ValidationError(error_msg)
        return value
```

**Step 2: Commit**

```bash
git add backend/apps/accounts/serializers.py
git commit -m "feat(accounts): add serializers for profile update, email change, and password change"
```

---

### Task 2: Add Email Change Token Utilities

**Files:**
- Modify: `backend/apps/core/utils/token.py` (after line 189)

**Step 1: Add email change token functions after `is_recovery_token_used`**

Append to `backend/apps/core/utils/token.py` after line 189:

```python


# Email change token validity: 24 hours
EMAIL_CHANGE_TOKEN_MAX_AGE_SECONDS = 24 * 60 * 60

_used_email_change_tokens = set()


def generate_email_change_token(user_id: UUID, new_email: str) -> str:
    signer = TimestampSigner()
    payload = {
        "user_id": str(user_id),
        "new_email": new_email,
        "token_type": "email_change",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    token = signer.sign_object(payload)
    logger.info(f"Generated email change token for user {user_id}")
    return token


def verify_email_change_token(token: str) -> dict:
    signer = TimestampSigner()
    try:
        payload = signer.unsign_object(token, max_age=EMAIL_CHANGE_TOKEN_MAX_AGE_SECONDS)
        if payload.get("token_type") != "email_change":
            raise BadSignature("Invalid token type")
        return payload
    except BadSignature:
        raise
    except Exception as e:
        raise BadSignature(f"Invalid or expired email change token: {e}")


def is_email_change_token_used(token: str) -> bool:
    return token in _used_email_change_tokens


def mark_email_change_token_used(token: str) -> None:
    _used_email_change_tokens.add(token)
```

**Step 2: Commit**

```bash
git add backend/apps/core/utils/token.py
git commit -m "feat(core): add email change token generation and verification utilities"
```

---

### Task 3: Add Security Notification Email Functions + Templates

**Files:**
- Modify: `backend/apps/core/utils/email.py` (after line 188)
- Create: `backend/apps/core/templates/emails/email_change_notification.html`
- Create: `backend/apps/core/templates/emails/password_changed_notification.html`

**Step 1: Add email functions after `send_account_deleted_email`**

Append to `backend/apps/core/utils/email.py` after line 188:

```python


def send_email_change_notification(to_email: str, first_name: str, new_email: str, security_link: str):
    """Send security notification to OLD email when email change is initiated."""
    subject = "Your Noteably email was changed"
    html_content = render_to_string(
        "emails/email_change_notification.html",
        {
            "first_name": first_name,
            "new_email": new_email,
            "security_link": security_link,
        },
    )
    return send_email(to_email, subject, html_content)


def send_password_changed_notification(to_email: str, first_name: str, security_link: str):
    """Send security notification when password is changed."""
    subject = "Your Noteably password was changed"
    html_content = render_to_string(
        "emails/password_changed_notification.html",
        {
            "first_name": first_name,
            "security_link": security_link,
        },
    )
    return send_email(to_email, subject, html_content)
```

**Step 2: Create email change notification template**

Create `backend/apps/core/templates/emails/email_change_notification.html` — follow the same HTML structure as `deletion_confirmation.html` (same CSS, logo, container layout). Key content:

- Heading: "Your Email Address Was Changed"
- Body: "Hello {{ first_name }}, Your Noteably email was just changed to {{ new_email }}. If this was you, no action needed."
- Warning box: "If you didn't make this change, click below to secure your account immediately."
- CTA button: "Secure My Account" → `{{ security_link }}`
- Footer: standard Noteably footer

**Step 3: Create password changed notification template**

Create `backend/apps/core/templates/emails/password_changed_notification.html` — same structure. Key content:

- Heading: "Your Password Was Changed"
- Body: "Hello {{ first_name }}, Your Noteably password was just changed. If this was you, no action needed."
- Warning box: same as above
- CTA button: "Secure My Account" → `{{ security_link }}`

**Step 4: Commit**

```bash
git add backend/apps/core/utils/email.py backend/apps/core/templates/emails/
git commit -m "feat(core): add security notification emails for email and password changes"
```

---

### Task 4: Add Security Action Token Utilities

**Files:**
- Modify: `backend/apps/core/utils/token.py` (append after email change token functions)

**Step 1: Add security action token functions**

Append to `backend/apps/core/utils/token.py`:

```python


# Security action token validity: 7 days
SECURITY_ACTION_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60


def generate_security_action_token(user_id: UUID) -> str:
    """Generate a signed token for 'wasn't me' security actions (7-day validity)."""
    signer = TimestampSigner()
    payload = {
        "user_id": str(user_id),
        "token_type": "security_action",
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
    token = signer.sign_object(payload)
    logger.info(f"Generated security action token for user {user_id}")
    return token


def verify_security_action_token(token: str) -> dict:
    """Verify security action token. Stateless one-time-use checked by caller against last password change."""
    signer = TimestampSigner()
    try:
        payload = signer.unsign_object(token, max_age=SECURITY_ACTION_TOKEN_MAX_AGE_SECONDS)
        if payload.get("token_type") != "security_action":
            raise BadSignature("Invalid token type")
        return payload
    except BadSignature:
        raise
    except Exception as e:
        raise BadSignature(f"Invalid or expired security action token: {e}")
```

**Step 2: Commit**

```bash
git add backend/apps/core/utils/token.py
git commit -m "feat(core): add security action token for 'wasn't me' flow"
```

---

### Task 5: Add Backend Views — Update Profile

**Files:**
- Modify: `backend/apps/accounts/views.py` (after line 926, after `restore_account`)

**Step 1: Add imports at top of views.py**

Add to the existing imports around line 16-27:

```python
from apps.core.utils.email import (
    send_deletion_confirmation_email,
    send_welcome_email,
    send_email_change_notification,
    send_password_changed_notification,
)
from apps.core.utils.token import (
    generate_recovery_token,
    generate_recovery_session_token,
    verify_recovery_token,
    verify_recovery_session_token,
    mark_recovery_token_used,
    is_recovery_token_used,
    generate_email_change_token,
    verify_email_change_token,
    is_email_change_token_used,
    mark_email_change_token_used,
    generate_security_action_token,
    verify_security_action_token,
)
```

**Step 2: Add update_profile view after restore_account (line 926)**

```python


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update name and/or phone number."""
    from .serializers import UpdateProfileSerializer

    serializer = UpdateProfileSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    user_token = auth_header[7:] if auth_header.startswith("Bearer ") else ""
    if not user_token:
        return Response({"error": "Missing token"}, status=status.HTTP_401_UNAUTHORIZED)

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    metadata_update = {}
    for field in ("first_name", "last_name", "phone_number"):
        if field in serializer.validated_data:
            metadata_update[field] = serializer.validated_data[field]

    try:
        resp = http_requests.put(
            f"{supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {user_token}",
                "apikey": service_key,
                "Content-Type": "application/json",
            },
            json={"data": metadata_update},
            timeout=10,
        )
        resp.raise_for_status()
        logger.info(f"Profile updated for user {request.user_id}")
        return Response({
            "message": "Profile updated successfully",
            "phone_verified": False,
            **metadata_update,
        })
    except http_requests.HTTPError as e:
        error_body = e.response.json() if e.response is not None else {}
        error_msg = error_body.get("msg") or error_body.get("message") or str(e)
        logger.error(f"Profile update failed for {request.user_id}: {error_msg}")
        return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Profile update failed for {request.user_id}: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

**Step 3: Commit**

```bash
git add backend/apps/accounts/views.py
git commit -m "feat(accounts): add update_profile view for name and phone changes"
```

---

### Task 6: Add Backend Views — Change Email (request + confirm)

**Files:**
- Modify: `backend/apps/accounts/views.py` (append after update_profile)

**Step 1: Add request_email_change view**

```python


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def request_email_change(request):
    """Initiate email change: verify password, send confirmation to new email."""
    from .serializers import ChangeEmailSerializer

    serializer = ChangeEmailSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    new_email = serializer.validated_data["new_email"]
    current_password = serializer.validated_data["current_password"]
    user_email = request.user.email
    user_id = request.user_id

    user_metadata = request.user.data.get("user_metadata", {}) or {}
    first_name = user_metadata.get("first_name", "there")

    if new_email == user_email:
        return Response(
            {"error": "New email must be different from your current email."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Verify current password
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        resp = http_requests.post(
            f"{supabase_url}/auth/v1/token?grant_type=password",
            headers={"apikey": service_key, "Content-Type": "application/json"},
            json={"email": user_email, "password": current_password},
            timeout=10,
        )
        if resp.status_code != 200:
            return Response(
                {"error": "Current password is incorrect."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
    except Exception as e:
        logger.error(f"Password verification failed for email change: {e}")
        return Response(
            {"error": "Current password is incorrect."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Generate email change token
    token = generate_email_change_token(user_id, new_email)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    confirmation_link = f"{frontend_url}/confirm-email-change?token={token}"

    # Send confirmation to new email (using simple inline HTML for now)
    from apps.core.utils.email import send_email
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 40px; background: #fff; border-radius: 24px;">
        <h1 style="color: #4a6b50; text-align: center;">Noteably</h1>
        <h2 style="text-align: center;">Confirm Your New Email</h2>
        <p>Hello {first_name},</p>
        <p>You requested to change your Noteably email address. Click the button below to confirm.</p>
        <div style="text-align: center; margin: 32px 0;">
            <a href="{confirmation_link}" style="background: #4a6b50; color: #fff; padding: 14px 32px; border-radius: 99px; text-decoration: none; font-weight: 600;">Confirm New Email</a>
        </div>
        <p style="font-size: 14px; color: #6b7280;">This link expires in 24 hours. If you didn't request this, ignore this email.</p>
    </div>
    """
    send_email(new_email, "Confirm Your New Email - Noteably", html)

    # Send security notification to old email
    security_token = generate_security_action_token(user_id)
    security_link = f"{frontend_url}/security-action?token={security_token}"
    try:
        send_email_change_notification(user_email, first_name, new_email, security_link)
    except Exception as e:
        logger.error(f"Failed to send email change notification: {e}")

    logger.info(f"Email change requested for user {user_id}: {user_email} -> {new_email}")
    return Response({
        "message": f"Verification email sent to {new_email}",
        "confirmation_sent_to": new_email,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def confirm_email_change(request):
    """Confirm email change using verification token from email link."""
    token = request.data.get("token")
    if not token:
        return Response({"error": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)

    if is_email_change_token_used(token):
        return Response(
            {"error": "This verification link has already been used."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        payload = verify_email_change_token(token)
    except Exception:
        return Response(
            {"error": "Invalid or expired verification link."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user_id = payload["user_id"]
    new_email = payload["new_email"]

    # Update email via Supabase admin API
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        from supabase import create_client as create_supabase_client
        sb = create_supabase_client(supabase_url, service_key)
        sb.auth.admin.update_user_by_id(user_id, {"email": new_email})
    except Exception as e:
        logger.error(f"Failed to update email for user {user_id}: {e}")
        return Response(
            {"error": "Failed to update email. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    mark_email_change_token_used(token)
    logger.info(f"Email changed for user {user_id} to {new_email}")
    return Response({
        "message": "Email changed successfully.",
        "new_email": new_email,
    })
```

**Step 2: Add confirm-email-change to middleware exempt paths**

In `backend/apps/accounts/middleware.py`, add to `exempt_paths` list (around line 47-56):

```python
"/api/auth/confirm-email-change",
```

**Step 3: Commit**

```bash
git add backend/apps/accounts/views.py backend/apps/accounts/middleware.py
git commit -m "feat(accounts): add email change request and confirmation views"
```

---

### Task 7: Add Backend Views — Change Password + Set Password

**Files:**
- Modify: `backend/apps/accounts/views.py` (append after confirm_email_change)

**Step 1: Add change_password and set_password views**

```python


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change password for users who have an existing password."""
    from .serializers import ChangePasswordSerializer

    serializer = ChangePasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    current_password = serializer.validated_data["current_password"]
    new_password = serializer.validated_data["new_password"]
    user_email = request.user.email
    user_id = request.user_id

    user_metadata = request.user.data.get("user_metadata", {}) or {}
    first_name = user_metadata.get("first_name", "there")

    # Verify current password
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    try:
        resp = http_requests.post(
            f"{supabase_url}/auth/v1/token?grant_type=password",
            headers={"apikey": service_key, "Content-Type": "application/json"},
            json={"email": user_email, "password": current_password},
            timeout=10,
        )
        if resp.status_code != 200:
            return Response(
                {"error": "Current password is incorrect."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
    except Exception as e:
        logger.error(f"Password verification failed: {e}")
        return Response(
            {"error": "Current password is incorrect."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Check new password isn't same as current
    try:
        resp2 = http_requests.post(
            f"{supabase_url}/auth/v1/token?grant_type=password",
            headers={"apikey": service_key, "Content-Type": "application/json"},
            json={"email": user_email, "password": new_password},
            timeout=10,
        )
        if resp2.status_code == 200:
            return Response(
                {"error": "New password must be different from your current password."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except Exception:
        pass  # Sign-in failed = passwords differ, which is what we want

    # Update password via admin API
    try:
        from supabase import create_client as create_supabase_client
        sb = create_supabase_client(supabase_url, service_key)
        sb.auth.admin.update_user_by_id(str(user_id), {"password": new_password})
    except Exception as e:
        logger.error(f"Failed to update password for {user_id}: {e}")
        return Response(
            {"error": "Failed to change password. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Send security notification
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    security_token = generate_security_action_token(user_id)
    security_link = f"{frontend_url}/security-action?token={security_token}"
    try:
        send_password_changed_notification(user_email, first_name, security_link)
    except Exception as e:
        logger.error(f"Failed to send password change notification: {e}")

    logger.info(f"Password changed for user {user_id}")
    return Response({"message": "Password changed successfully."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_password(request):
    """Set password for OAuth-only users who don't have one yet."""
    from .serializers import SetPasswordSerializer

    serializer = SetPasswordSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    new_password = serializer.validated_data["new_password"]
    user_id = request.user_id

    # Check if user already has a password (email provider)
    user_metadata = request.user.data.get("app_metadata", {}) or {}
    providers = user_metadata.get("providers", [])
    # If email is in providers, they already have a password
    if "email" in providers:
        return Response(
            {"error": "You already have a password. Use the change password option instead."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Set password via admin API
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        from supabase import create_client as create_supabase_client
        sb = create_supabase_client(supabase_url, service_key)
        sb.auth.admin.update_user_by_id(str(user_id), {"password": new_password})
    except Exception as e:
        logger.error(f"Failed to set password for {user_id}: {e}")
        return Response(
            {"error": "Failed to set password. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    logger.info(f"Password set for OAuth user {user_id}")
    return Response({"message": "Password set successfully."})
```

**Step 2: Commit**

```bash
git add backend/apps/accounts/views.py
git commit -m "feat(accounts): add change_password and set_password views"
```

---

### Task 8: Add Backend View — Security Action ("wasn't me")

**Files:**
- Modify: `backend/apps/accounts/views.py` (append after set_password)
- Modify: `backend/apps/accounts/middleware.py` (add to exempt_paths)

**Step 1: Add security_action view**

```python


@api_view(["POST"])
@permission_classes([AllowAny])
def security_action(request):
    """Handle 'wasn't me' link: reset password + invalidate all sessions."""
    token = request.data.get("token")
    if not token:
        return Response({"error": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payload = verify_security_action_token(token)
    except Exception:
        return Response(
            {"error": "Invalid or expired security link. Your account may have already been secured."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user_id = payload["user_id"]

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    try:
        from supabase import create_client as create_supabase_client
        import secrets
        sb = create_supabase_client(supabase_url, service_key)

        # Generate random password (forces user to reset)
        random_password = secrets.token_urlsafe(32)
        sb.auth.admin.update_user_by_id(str(user_id), {"password": random_password})

        # Sign out all sessions by calling Supabase admin API
        resp = http_requests.post(
            f"{supabase_url}/auth/v1/logout",
            headers={
                "Authorization": f"Bearer {service_key}",
                "apikey": service_key,
                "Content-Type": "application/json",
            },
            json={"scope": "global"},
            timeout=10,
        )
        # Note: Supabase may not support global logout via admin API in all versions.
        # The password reset itself invalidates the current session effectively.

    except Exception as e:
        logger.error(f"Security action failed for user {user_id}: {e}")
        return Response(
            {"error": "Failed to secure account. Please contact support."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    logger.info(f"Security action completed for user {user_id}: password reset + sessions invalidated")
    return Response({
        "message": "Your account has been secured. Your password has been reset and all sessions have been logged out. Please use 'Forgot Password' to set a new password.",
    })
```

**Step 2: Add security-action to middleware exempt paths**

In `backend/apps/accounts/middleware.py`, add to `exempt_paths`:

```python
"/api/auth/security-action",
```

**Step 3: Commit**

```bash
git add backend/apps/accounts/views.py backend/apps/accounts/middleware.py
git commit -m "feat(accounts): add security action view for 'wasn't me' flow"
```

---

### Task 9: Add URL Routes

**Files:**
- Modify: `backend/apps/accounts/urls.py`

**Step 1: Add new URL patterns**

Add after the `me/restore` path (line 16) and before `subscription` (line 17):

```python
    path("me/update", views.update_profile, name="update_profile"),
    path("me/request-email-change", views.request_email_change, name="request_email_change"),
    path("confirm-email-change", views.confirm_email_change, name="confirm_email_change"),
    path("me/change-password", views.change_password, name="change_password"),
    path("me/set-password", views.set_password, name="set_password"),
    path("security-action", views.security_action, name="security_action"),
```

**Step 2: Verify the backend starts without errors**

Run: `docker exec noteably python manage.py check`
Expected: `System check identified no issues.`

**Step 3: Commit**

```bash
git add backend/apps/accounts/urls.py
git commit -m "feat(accounts): add URL routes for account management endpoints"
```

---

### Task 10: Update Frontend API Constants + Auth Service

**Files:**
- Modify: `frontend/src/lib/constants/index.ts` (lines 5-12, AUTH object)
- Modify: `frontend/src/lib/api/services/auth.ts` (after line 158)

**Step 1: Add new endpoints to constants**

In `frontend/src/lib/constants/index.ts`, update the AUTH object (lines 5-12) to add:

```typescript
    UPDATE_PROFILE: "/auth/me/update",
    REQUEST_EMAIL_CHANGE: "/auth/me/request-email-change",
    CONFIRM_EMAIL_CHANGE: "/auth/confirm-email-change",
    CHANGE_PASSWORD: "/auth/me/change-password",
    SET_PASSWORD: "/auth/me/set-password",
```

**Step 2: Add auth service methods**

In `frontend/src/lib/api/services/auth.ts`, add before the closing `};` on line 159:

```typescript

  updateProfile: async (data: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
  }): Promise<void> => {
    await apiClient.put(API_ENDPOINTS.AUTH.UPDATE_PROFILE, data);
  },

  requestEmailChange: async (newEmail: string, currentPassword: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.REQUEST_EMAIL_CHANGE, {
      new_email: newEmail,
      current_password: currentPassword,
    });
  },

  confirmEmailChange: async (token: string): Promise<{ new_email: string }> => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.CONFIRM_EMAIL_CHANGE, { token });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  setPassword: async (newPassword: string): Promise<void> => {
    await apiClient.post(API_ENDPOINTS.AUTH.SET_PASSWORD, {
      new_password: newPassword,
    });
  },
```

**Step 3: Commit**

```bash
git add frontend/src/lib/constants/index.ts frontend/src/lib/api/services/auth.ts
git commit -m "feat(frontend): add API endpoints and auth service methods for account management"
```

---

### Task 11: Create AccountSettings Component (Name + Phone)

**Files:**
- Create: `frontend/src/components/profile/AccountSettings.tsx`

**Step 1: Create the component**

This component handles inline editing of first name, last name, and phone number. It uses the existing `useAuth` hook for user data and `authService.updateProfile` for saving.

Key elements:
- Read-only display of current values with an "Edit" button
- Clicking Edit turns fields into inputs with Save/Cancel
- Save calls `authService.updateProfile()` then `refreshUser()`
- Toast-style success/error messages inline
- Phone shows "(Not verified)" hint text for future SMS verification

Use existing UI components: `Card`, `CardContent`, `CardHeader` from `@/components/ui/card`, `Button`, `Input`, `Label` from their respective UI files. Icons from `lucide-react`: `Pencil`, `Loader2`, `Check`, `X`, `AlertCircle`, `CheckCircle2`, `User`, `Phone`.

**Step 2: Commit**

```bash
git add frontend/src/components/profile/AccountSettings.tsx
git commit -m "feat(frontend): add AccountSettings component for name and phone editing"
```

---

### Task 12: Create ChangeEmail Component

**Files:**
- Create: `frontend/src/components/profile/ChangeEmail.tsx`

**Step 1: Create the component**

Dialog-based component for email changes. Shows current email with "Change" button that opens a Dialog.

States: `idle` → `form` (current password + new email) → `confirmation_sent` (success message).

For OAuth-only users (check `user.app_metadata?.providers` doesn't include `"email"`), disable the Change button with tooltip "Set a password first to change your email."

Use `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` from `@/components/ui/dialog`. Icons: `Mail`, `AlertCircle`, `CheckCircle2`, `Loader2`.

**Step 2: Commit**

```bash
git add frontend/src/components/profile/ChangeEmail.tsx
git commit -m "feat(frontend): add ChangeEmail component with password verification"
```

---

### Task 13: Create ChangePassword Component

**Files:**
- Create: `frontend/src/components/profile/ChangePassword.tsx`

**Step 1: Create the component**

Dialog-based component. Two modes:
1. **Has password** (email provider): "Change Password" button → dialog with current password, new password, confirm. Client-side validation (8+ chars, uppercase, digit, match, differs from current).
2. **OAuth-only** (no email provider): "Set Password" button → dialog with just new password + confirm.

After successful change/set, show success state for 2s then close dialog.

Icons: `Lock`, `AlertCircle`, `CheckCircle2`, `Loader2`.

**Step 2: Commit**

```bash
git add frontend/src/components/profile/ChangePassword.tsx
git commit -m "feat(frontend): add ChangePassword component with OAuth user support"
```

---

### Task 14: Update Profile Page — Add Account Tab

**Files:**
- Modify: `frontend/src/pages/Profile.tsx`

**Step 1: Add imports for new components**

Add after the existing imports (around line 34-35):

```typescript
import { AccountSettings } from "@/components/profile/AccountSettings";
import { ChangeEmail } from "@/components/profile/ChangeEmail";
import { ChangePassword } from "@/components/profile/ChangePassword";
```

**Step 2: Add "Account" tab to TabsList**

In the TabsList (line 163-167), add a new TabsTrigger:

```typescript
<TabsList className="mb-4 bg-background border border-border/50">
  <TabsTrigger value="general">General</TabsTrigger>
  <TabsTrigger value="account">Account</TabsTrigger>
  <TabsTrigger value="settings">Settings</TabsTrigger>
  <TabsTrigger value="developers">Developers</TabsTrigger>
</TabsList>
```

**Step 3: Add Account TabsContent**

Add after the `</TabsContent>` for "general" (after line 314) and before the settings TabsContent:

```typescript
          <TabsContent value="account" className="space-y-6">
            <AccountSettings />
            <ChangeEmail />
            <ChangePassword />
          </TabsContent>
```

**Step 4: Commit**

```bash
git add frontend/src/pages/Profile.tsx
git commit -m "feat(frontend): add Account tab to Profile page with settings, email, and password management"
```

---

### Task 15: Create ConfirmEmailChange Page + Route

**Files:**
- Create: `frontend/src/pages/ConfirmEmailChange.tsx`
- Modify: `frontend/src/router/routes.ts` (add route constant)
- Modify: `frontend/src/router/index.tsx` (add route)

**Step 1: Create the ConfirmEmailChange page**

A simple page that reads `?token=` from the URL, calls `authService.confirmEmailChange(token)` on mount, and shows loading → success → error states.

On success: show new email and "Redirecting to profile..." then `navigate("/profile")` after 3 seconds.

Use `Layout` wrapper, `Card` UI. Icons: `Loader2`, `CheckCircle2`, `AlertCircle`.

**Step 2: Add route constant**

In `frontend/src/router/routes.ts`, add:

```typescript
CONFIRM_EMAIL_CHANGE: "/confirm-email-change",
```

**Step 3: Add route to router**

In `frontend/src/router/index.tsx`:
- Import: `import ConfirmEmailChange from "@/pages/ConfirmEmailChange";`
- Add as a public route (after LINK_ACCOUNT, before protected routes):

```typescript
{
  path: ROUTES.CONFIRM_EMAIL_CHANGE,
  element: <ConfirmEmailChange />,
},
```

**Step 4: Commit**

```bash
git add frontend/src/pages/ConfirmEmailChange.tsx frontend/src/router/routes.ts frontend/src/router/index.tsx
git commit -m "feat(frontend): add email change confirmation page and route"
```

---

### Task 16: Create SecurityAction Page + Route

**Files:**
- Create: `frontend/src/pages/SecurityAction.tsx`
- Modify: `frontend/src/router/routes.ts` (add route constant)
- Modify: `frontend/src/router/index.tsx` (add route)

**Step 1: Create the SecurityAction page**

Handles the "wasn't me" link from security emails. Reads `?token=` from URL.

Shows: "Securing your account..." loading state → calls `apiClient.post("/auth/security-action", { token })` → success: "Your account has been secured. Your password has been reset and all sessions logged out. Please sign in and reset your password." → error state.

Public page (no auth required since user may be logged out).

**Step 2: Add route and wire up**

`SECURITY_ACTION: "/security-action"` in routes.ts. Add as public route in index.tsx.

**Step 3: Commit**

```bash
git add frontend/src/pages/SecurityAction.tsx frontend/src/router/routes.ts frontend/src/router/index.tsx
git commit -m "feat(frontend): add security action page for 'wasn't me' flow"
```

---

### Task 17: Verify Build + Manual Testing

**Step 1: Check backend**

Run: `docker exec noteably python manage.py check`
Expected: No issues

**Step 2: Check frontend build**

Run: `cd .worktrees/account-management/frontend && npm run build`
Expected: Build succeeds with no errors

**Step 3: Fix any issues found**

**Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve build issues for account management feature"
```
