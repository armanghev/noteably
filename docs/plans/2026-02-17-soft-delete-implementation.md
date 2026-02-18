# Soft Delete with 14-Day Recovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hard account deletion with soft delete, allowing users to recover their account within 14 days via email recovery link with password reset.

**Architecture:** Backend adds deletion state tracking (deleted_at timestamp), modifies DELETE endpoint to soft delete + send recovery email, adds two new endpoints for recovery flow, creates daily Celery task for hard delete after 14 days. Frontend updates to prevent login during grace period and shows recovery message.

**Tech Stack:** Django REST, Supabase Python SDK, Celery, Django signing module for tokens, React/TypeScript frontend

---

## Task 1: Backend — Add deletion state tracking to user metadata

**Files:**
- Modify: `backend/apps/accounts/middleware.py` (add deleted_at checking)
- Create: `backend/apps/core/utils/email.py` (update with send_account_deleted_email function if not exists)

**Step 1: Check existing SupabaseUser wrapper for deleted_at field**

Run: `grep -n "class SupabaseUser" backend/apps/accounts/middleware.py`

Expected: Find the SupabaseUser dataclass around line 10-30

**Step 2: Verify current user metadata access in middleware**

Read: `backend/apps/accounts/middleware.py` lines 1-150

Note how `request.user.data` accesses user metadata from JWT

**Step 3: Add deleted_at validation to auth middleware**

In `backend/apps/accounts/middleware.py`, find the `AuthMiddleware` class and add check after user is set (around line 100-120):

```python
# After request.user is set, add:
if hasattr(request.user, 'data') and request.user.data:
    deleted_at = request.user.data.get('deleted_at')
    if deleted_at:
        # Account is pending deletion
        deletion_scheduled = datetime.fromisoformat(deleted_at) + timedelta(days=14)
        if datetime.now(timezone.utc) < deletion_scheduled:
            # Still in grace period, return 403
            return JsonResponse(
                {"error": "Account scheduled for deletion", "recovery_available": True},
                status=403
            )
```

Add imports at top:
```python
from datetime import datetime, timedelta, timezone
```

**Step 4: Run tests to verify middleware doesn't break**

Run: `docker exec noteably python manage.py test accounts.tests.test_middleware -v 2`

Expected: All middleware tests pass (or create basic test if none exist)

**Step 5: Commit**

```bash
git add backend/apps/accounts/middleware.py
git commit -m "feat: add deleted_at validation to auth middleware for soft delete"
```

---

## Task 2: Backend — Modify DELETE /api/auth/me/delete to soft delete + send email

**Files:**
- Modify: `backend/apps/accounts/views.py` (update delete_account function)
- Ensure: `backend/apps/core/utils/email.py` has `send_account_deleted_email` function

**Step 1: Write test for soft delete behavior**

Create/modify: `backend/apps/accounts/tests/test_delete_account.py`

```python
from django.test import TestCase
from rest_framework.test import APIClient
from unittest.mock import patch
from datetime import datetime, timezone

class SoftDeleteAccountTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_id = "test-uuid-1234"
        self.user_email = "test@example.com"
        # Mock auth token
        self.token = "mock-token"
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    @patch('apps.core.supabase_client.supabase_client.client')
    @patch('apps.core.utils.email.send_account_deleted_email')
    def test_delete_account_soft_deletes(self, mock_email, mock_supabase):
        """Test that DELETE /api/auth/me/delete sets deleted_at but preserves data"""
        mock_supabase.auth.get_user.return_value.user.id = self.user_id
        mock_supabase.auth.get_user.return_value.user.email = self.user_email

        response = self.client.delete('/api/auth/me/delete')

        # Should return 204
        assert response.status_code == 204

        # Email should be called with recovery link
        mock_email.assert_called_once()
        call_args = mock_email.call_args
        assert call_args[0][0] == self.user_email  # email arg
        assert 'recovery' in call_args[0][2].lower()  # recovery link in message

        # Supabase user update should set deleted_at (not delete user)
        mock_supabase.auth.admin.update_user_by_id.assert_called()
        update_call = mock_supabase.auth.admin.update_user_by_id.call_args
        assert 'deleted_at' in str(update_call)  # Check deleted_at is in the update
```

**Step 2: Run test to verify it fails**

Run: `docker exec noteably python manage.py test accounts.tests.test_delete_account::SoftDeleteAccountTests::test_delete_account_soft_deletes -v 2`

Expected: FAIL (delete_account doesn't soft delete yet)

**Step 3: Replace hard delete with soft delete in delete_account view**

Modify: `backend/apps/accounts/views.py` in the `delete_account` function (around line 345-440)

Replace the entire function with:

```python
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """
    Soft delete the authenticated user's account with 14-day recovery window.
    Sets deleted_at timestamp in user metadata, locks account, sends recovery email.
    """
    user_id = request.user_id
    user_email = request.user.email if hasattr(request.user, 'email') else None
    first_name = (
        request.user.user_metadata.get("first_name", "there")
        if hasattr(request.user, "user_metadata")
        else "there"
    )

    try:
        # Generate recovery token (14-day expiration)
        from apps.core.utils.token import generate_recovery_token
        recovery_token = generate_recovery_token(user_id)
        recovery_link = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/auth/recover?token={recovery_token}"

        # Set deleted_at in user metadata (soft delete)
        client = supabase_client.client
        deleted_at = datetime.now(timezone.utc).isoformat()

        client.auth.admin.update_user_by_id(
            str(user_id),
            {"user_metadata": {"deleted_at": deleted_at}}
        )
        logger.info(f"Soft deleted account for user {user_id}, deleted_at: {deleted_at}")

        # Send deletion confirmation email with recovery link
        if user_email:
            try:
                from apps.core.utils.email import send_account_deleted_email
                send_account_deleted_email(user_email, first_name, recovery_link)
                logger.info(f"Account deletion email sent to {user_email}")
            except Exception as e:
                logger.error(f"Failed to send account deletion email to {user_email}: {e}")
                # Don't fail the deletion if email fails

        return Response(status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        logger.error(f"Failed to soft delete account for user {user_id}: {e}")
        return Response(
            {"error": "Failed to delete account", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
```

Add imports at top of file:
```python
import os
from datetime import datetime, timezone
```

**Step 4: Create token generation utility**

Create: `backend/apps/core/utils/token.py`

```python
from django.core import signing
from datetime import timedelta
import os

RECOVERY_TOKEN_SALT = os.getenv('RECOVERY_TOKEN_SALT', 'noteably-recovery')

def generate_recovery_token(user_id: str, expiration_days: int = 14) -> str:
    """
    Generate a signed recovery token that expires in 14 days.
    """
    data = {
        'user_id': str(user_id),
        'recovery_type': 'account_deletion',
    }
    return signing.dumps(data, salt=RECOVERY_TOKEN_SALT, compress=True)

def verify_recovery_token(token: str, max_age_seconds: int = 14 * 24 * 60 * 60) -> dict:
    """
    Verify and decode a recovery token.
    Raises signing.BadSignature or signing.SignatureExpired if invalid.
    """
    return signing.loads(
        token,
        salt=RECOVERY_TOKEN_SALT,
        max_age=max_age_seconds,
        compression=True
    )
```

**Step 5: Update send_account_deleted_email function**

Modify or create: `backend/apps/core/utils/email.py`

Ensure this function exists:

```python
def send_account_deleted_email(to_email: str, first_name: str, recovery_link: str) -> None:
    """Send account deletion confirmation email with recovery link."""
    from django.core.mail import send_mail

    subject = "Your Noteably account is scheduled for deletion"
    message = f"""
Hi {first_name},

Your Noteably account is scheduled for permanent deletion in 14 days.

What will be deleted:
- All study sets and materials
- Uploaded files and transcripts
- Notes, flashcards, and quizzes
- Your account and profile

You can recover your account anytime in the next 14 days by clicking the link below:

{recovery_link}

If you didn't request this deletion, please contact support immediately.

Best regards,
The Noteably Team
"""

    send_mail(
        subject,
        message,
        'noreply@noteably.app',
        [to_email],
        fail_silently=False,
    )
```

**Step 6: Run test to verify it passes**

Run: `docker exec noteably python manage.py test accounts.tests.test_delete_account::SoftDeleteAccountTests::test_delete_account_soft_deletes -v 2`

Expected: PASS

**Step 7: Commit**

```bash
git add backend/apps/accounts/views.py backend/apps/core/utils/token.py backend/apps/core/utils/email.py backend/apps/accounts/tests/test_delete_account.py
git commit -m "feat: implement soft delete with 14-day recovery window"
```

---

## Task 3: Backend — Add POST /api/auth/recover endpoint

**Files:**
- Modify: `backend/apps/accounts/views.py` (add recover endpoint)
- Modify: `backend/apps/accounts/urls.py` (add URL)
- Create: `backend/apps/accounts/tests/test_recover.py`

**Step 1: Write test for recovery token validation**

Create: `backend/apps/accounts/tests/test_recover.py`

```python
from django.test import TestCase
from rest_framework.test import APIClient
from unittest.mock import patch
from apps.core.utils.token import generate_recovery_token, verify_recovery_token

class RecoveryTokenTests(TestCase):
    def test_generate_and_verify_recovery_token(self):
        """Test token generation and verification"""
        user_id = "test-uuid-1234"
        token = generate_recovery_token(user_id)

        # Should not raise exception
        data = verify_recovery_token(token)

        assert data['user_id'] == user_id
        assert data['recovery_type'] == 'account_deletion'

    def test_recovery_token_expires(self):
        """Test that recovery token expires"""
        from django.core import signing
        user_id = "test-uuid-1234"
        token = generate_recovery_token(user_id)

        # Try to verify with max_age=0 (already expired)
        with self.assertRaises(signing.SignatureExpired):
            verify_recovery_token(token, max_age_seconds=0)

class RecoverEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch('apps.core.supabase_client.supabase_client.client')
    def test_recover_endpoint_validates_token(self, mock_supabase):
        """Test that recover endpoint validates token and returns short-lived token"""
        user_id = "test-uuid-1234"
        recovery_token = generate_recovery_token(user_id)

        response = self.client.post(
            '/api/auth/recover',
            {'token': recovery_token},
            format='json'
        )

        assert response.status_code == 200
        assert 'short_lived_token' in response.json()

    def test_recover_endpoint_rejects_invalid_token(self):
        """Test that recover endpoint rejects invalid tokens"""
        response = self.client.post(
            '/api/auth/recover',
            {'token': 'invalid-token'},
            format='json'
        )

        assert response.status_code == 400
        assert 'invalid' in response.json()['error'].lower()
```

**Step 2: Run tests to verify they fail**

Run: `docker exec noteably python manage.py test accounts.tests.test_recover -v 2`

Expected: FAIL (endpoints don't exist yet)

**Step 3: Add recover endpoint to views**

Modify: `backend/apps/accounts/views.py`, add after `delete_account` function:

```python
@api_view(["POST"])
@permission_classes([AllowAny])
def recover_account(request):
    """
    Validate recovery token and return short-lived token for password reset.
    User must provide the recovery token from their email link.
    """
    token = request.data.get('token')

    if not token:
        return Response(
            {"error": "Recovery token required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from apps.core.utils.token import verify_recovery_token, generate_short_lived_token

        # Verify the long-lived recovery token (14 days)
        data = verify_recovery_token(token)
        user_id = data['user_id']

        # Generate a short-lived token for password reset (1 hour)
        short_lived_token = generate_short_lived_token(user_id)

        logger.info(f"Recovery initiated for user {user_id}")

        return Response(
            {"short_lived_token": short_lived_token},
            status=status.HTTP_200_OK
        )

    except Exception as e:
        logger.warning(f"Invalid recovery token: {e}")
        return Response(
            {"error": "Invalid or expired recovery token"},
            status=status.HTTP_400_BAD_REQUEST
        )
```

**Step 4: Add short-lived token utility**

Modify: `backend/apps/core/utils/token.py`, add:

```python
def generate_short_lived_token(user_id: str, expiration_hours: int = 1) -> str:
    """
    Generate a short-lived token for password reset (expires in 1 hour).
    """
    data = {
        'user_id': str(user_id),
        'token_type': 'password_reset_recovery',
    }
    return signing.dumps(data, salt=RECOVERY_TOKEN_SALT, compress=True)

def verify_short_lived_token(token: str, max_age_seconds: int = 3600) -> dict:
    """
    Verify and decode a short-lived token (1 hour expiration).
    """
    return signing.loads(
        token,
        salt=RECOVERY_TOKEN_SALT,
        max_age=max_age_seconds,
        compression=True
    )
```

**Step 5: Add URL pattern**

Modify: `backend/apps/accounts/urls.py`

Add to `urlpatterns`:

```python
path("recover", views.recover_account, name="recover_account"),
```

**Step 6: Run tests to verify they pass**

Run: `docker exec noteably python manage.py test accounts.tests.test_recover -v 2`

Expected: PASS

**Step 7: Commit**

```bash
git add backend/apps/accounts/views.py backend/apps/accounts/urls.py backend/apps/core/utils/token.py backend/apps/accounts/tests/test_recover.py
git commit -m "feat: add POST /api/auth/recover endpoint for recovery token validation"
```

---

## Task 4: Backend — Add POST /api/auth/confirm-recovery endpoint

**Files:**
- Modify: `backend/apps/accounts/views.py` (add confirm-recovery endpoint)
- Modify: `backend/apps/accounts/urls.py` (add URL)
- Create: `backend/apps/accounts/tests/test_confirm_recovery.py`

**Step 1: Write test for confirm recovery**

Create: `backend/apps/accounts/tests/test_confirm_recovery.py`

```python
from django.test import TestCase
from rest_framework.test import APIClient
from unittest.mock import patch, MagicMock
from apps.core.utils.token import generate_short_lived_token

class ConfirmRecoveryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_id = "test-uuid-1234"
        self.short_lived_token = generate_short_lived_token(self.user_id)

    @patch('apps.core.supabase_client.supabase_client.client')
    def test_confirm_recovery_clears_deleted_at(self, mock_supabase):
        """Test that confirm-recovery clears deleted_at and updates password"""
        mock_supabase.auth.admin.update_user_by_id = MagicMock()

        response = self.client.post(
            '/api/auth/confirm-recovery',
            {
                'token': self.short_lived_token,
                'password': 'NewPassword123!'
            },
            format='json'
        )

        assert response.status_code == 200

        # Verify deleted_at was cleared
        mock_supabase.auth.admin.update_user_by_id.assert_called()
        call_args = mock_supabase.auth.admin.update_user_by_id.call_args
        assert 'deleted_at' not in str(call_args) or call_args[1]['user_metadata']['deleted_at'] is None

    def test_confirm_recovery_rejects_invalid_token(self):
        """Test that invalid token is rejected"""
        response = self.client.post(
            '/api/auth/confirm-recovery',
            {
                'token': 'invalid-token',
                'password': 'NewPassword123!'
            },
            format='json'
        )

        assert response.status_code == 400
        assert 'invalid' in response.json()['error'].lower()

    def test_confirm_recovery_requires_password(self):
        """Test that password is required"""
        response = self.client.post(
            '/api/auth/confirm-recovery',
            {'token': self.short_lived_token},
            format='json'
        )

        assert response.status_code == 400
        assert 'password' in response.json()['error'].lower()
```

**Step 2: Run tests to verify they fail**

Run: `docker exec noteably python manage.py test accounts.tests.test_confirm_recovery -v 2`

Expected: FAIL

**Step 3: Add confirm-recovery endpoint**

Modify: `backend/apps/accounts/views.py`, add after `recover_account` function:

```python
@api_view(["POST"])
@permission_classes([AllowAny])
def confirm_recovery(request):
    """
    Complete account recovery: verify short-lived token, update password, clear deleted_at.
    """
    token = request.data.get('token')
    password = request.data.get('password')

    if not token or not password:
        return Response(
            {"error": "Token and password are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(password) < 8:
        return Response(
            {"error": "Password must be at least 8 characters"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from apps.core.utils.token import verify_short_lived_token

        # Verify short-lived token
        data = verify_short_lived_token(token)
        user_id = data['user_id']

        client = supabase_client.client

        # Update password in Supabase Auth
        client.auth.admin.update_user_by_id(
            str(user_id),
            {"password": password}
        )

        # Clear deleted_at flag (restore account)
        client.auth.admin.update_user_by_id(
            str(user_id),
            {"user_metadata": {"deleted_at": None}}
        )

        logger.info(f"Account recovery completed for user {user_id}")

        return Response(
            {"message": "Account recovered successfully. You can now log in with your new password."},
            status=status.HTTP_200_OK
        )

    except Exception as e:
        logger.warning(f"Recovery confirmation failed: {e}")
        return Response(
            {"error": "Invalid or expired recovery token"},
            status=status.HTTP_400_BAD_REQUEST
        )
```

**Step 4: Add URL pattern**

Modify: `backend/apps/accounts/urls.py`, add to `urlpatterns`:

```python
path("confirm-recovery", views.confirm_recovery, name="confirm_recovery"),
```

**Step 5: Run tests to verify they pass**

Run: `docker exec noteably python manage.py test accounts.tests.test_confirm_recovery -v 2`

Expected: PASS

**Step 6: Commit**

```bash
git add backend/apps/accounts/views.py backend/apps/accounts/urls.py backend/apps/accounts/tests/test_confirm_recovery.py
git commit -m "feat: add POST /api/auth/confirm-recovery endpoint to complete account recovery"
```

---

## Task 5: Backend — Create Celery task for hard delete after 14 days

**Files:**
- Create: `backend/apps/accounts/tasks.py` (Celery task)
- Modify: `backend/config/celery.py` (add scheduled task)
- Create: `backend/apps/accounts/tests/test_hard_delete_task.py`

**Step 1: Create the hard delete Celery task**

Create: `backend/apps/accounts/tasks.py`

```python
from celery import shared_task
from datetime import datetime, timedelta, timezone
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def process_pending_deletions(self):
    """
    Find users with deleted_at older than 14 days and perform hard delete.
    This runs daily via Celery Beat.
    """
    from apps.core.supabase_client import supabase_client
    from apps.ingestion.models import Job
    from apps.accounts.models import APIKey

    cutoff_date = datetime.now(timezone.utc) - timedelta(days=14)
    client = supabase_client.client

    hard_delete_count = 0
    failed_count = 0

    try:
        # Get all users with deleted_at older than 14 days
        # Note: Supabase doesn't expose user metadata directly, so we'll need to
        # query via a custom query or check a local deletion table if one exists
        # For now, we'll use a simplified approach assuming you have a deletion log table

        # Query deletion log or custom table for pending deletions
        deleted_users = client.table("account_deletions").select("user_id, deleted_at").eq("status", "pending").execute()

        if not deleted_users.data:
            logger.info("No pending deletions to process")
            return {"processed": 0, "failed": 0}

        for deletion_record in deleted_users.data:
            user_id = deletion_record['user_id']
            deleted_at = datetime.fromisoformat(deletion_record['deleted_at'])

            if deleted_at < cutoff_date:
                try:
                    # Hard delete this user
                    hard_delete_user(user_id, client)
                    hard_delete_count += 1

                    # Mark as completed in deletion log
                    client.table("account_deletions").update(
                        {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}
                    ).eq("user_id", str(user_id)).execute()

                except Exception as e:
                    logger.error(f"Failed to hard delete user {user_id}: {e}")
                    failed_count += 1

                    # Update deletion log with error
                    try:
                        client.table("account_deletions").update(
                            {"status": "failed", "error": str(e)}
                        ).eq("user_id", str(user_id)).execute()
                    except:
                        pass

        logger.info(f"Hard delete task completed: {hard_delete_count} success, {failed_count} failed")
        return {"processed": hard_delete_count, "failed": failed_count}

    except Exception as e:
        logger.error(f"Error in process_pending_deletions: {e}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))

def hard_delete_user(user_id: str, client):
    """
    Perform hard delete of all user data.
    """
    from apps.ingestion.models import Job
    from apps.accounts.models import APIKey
    from apps.ingestion.supabase_storage import delete_job_folder

    logger.info(f"Starting hard delete for user {user_id}")

    # 1. Delete Django models (APIKeys)
    APIKey.objects.filter(user=user_id).delete()
    logger.info(f"Deleted API keys for user {user_id}")

    # 2. Delete storage files
    job_ids = list(Job.objects.filter(user_id=user_id).values_list("id", flat=True))
    for job_id in job_ids:
        try:
            delete_job_folder(str(job_id))
        except Exception as e:
            logger.warning(f"Failed to delete storage for job {job_id}: {e}")

    # Delete avatar
    try:
        client.storage.from_("avatars").remove([f"{str(user_id).lower()}/avatar.jpg"])
    except:
        pass

    logger.info(f"Deleted storage files for user {user_id}")

    # 3. Delete Django models (Jobs cascade)
    Job.objects.filter(user_id=user_id).delete()
    logger.info(f"Deleted jobs for user {user_id}")

    # 4. Delete subscription
    try:
        client.table("user_subscriptions").delete().eq("user_id", str(user_id)).execute()
    except:
        pass

    logger.info(f"Deleted subscription for user {user_id}")

    # 5. Delete Supabase Auth user (last)
    client.auth.admin.delete_user(str(user_id))
    logger.info(f"Deleted Supabase auth user {user_id}")
```

**Step 2: Create migration for deletion tracking table**

Create: `backend/apps/accounts/migrations/0005_create_account_deletions_table.py`

```python
from django.db import migrations, models
import uuid

class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0004_alter_apikey_user'),
    ]

    operations = [
        migrations.RunSQL(
            """
            CREATE TABLE IF NOT EXISTS account_deletions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL UNIQUE,
                deleted_at TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                completed_at TIMESTAMP WITH TIME ZONE,
                error TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """,
            reverse_sql="DROP TABLE IF EXISTS account_deletions;"
        )
    ]
```

**Step 3: Update delete_account to create deletion log entry**

Modify: `backend/apps/accounts/views.py` in `delete_account` function, after setting deleted_at:

```python
        # Log deletion for 14-day hard delete task
        client.table("account_deletions").insert({
            "user_id": str(user_id),
            "deleted_at": deleted_at,
            "status": "pending"
        }).execute()
```

**Step 4: Add scheduled task to Celery Beat**

Modify: `backend/config/celery.py`

In the `app.conf.beat_schedule` dict, add:

```python
'process-pending-deletions': {
    'task': 'apps.accounts.tasks.process_pending_deletions',
    'schedule': crontab(hour=2, minute=0),  # Run daily at 2 AM
},
```

Add import:
```python
from celery.schedules import crontab
```

**Step 5: Write test for hard delete task**

Create: `backend/apps/accounts/tests/test_hard_delete_task.py`

```python
from django.test import TestCase
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from apps.accounts.tasks import process_pending_deletions, hard_delete_user

class HardDeleteTaskTests(TestCase):
    @patch('apps.core.supabase_client.supabase_client.client')
    def test_process_pending_deletions_finds_expired_accounts(self, mock_client):
        """Test that task finds accounts older than 14 days"""
        old_date = (datetime.now(timezone.utc) - timedelta(days=20)).isoformat()

        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"user_id": "user-1", "deleted_at": old_date},
            {"user_id": "user-2", "deleted_at": old_date}
        ]

        with patch('apps.accounts.tasks.hard_delete_user') as mock_hard_delete:
            result = process_pending_deletions()

            # Should attempt to hard delete both users
            assert mock_hard_delete.call_count == 2

    @patch('apps.core.supabase_client.supabase_client.client')
    def test_process_pending_deletions_ignores_recent_deletions(self, mock_client):
        """Test that task ignores deletions less than 14 days old"""
        recent_date = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()

        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"user_id": "user-1", "deleted_at": recent_date}
        ]

        with patch('apps.accounts.tasks.hard_delete_user') as mock_hard_delete:
            result = process_pending_deletions()

            # Should NOT hard delete recent deletion
            assert mock_hard_delete.call_count == 0
```

**Step 6: Run tests to verify they pass**

Run: `docker exec noteably python manage.py test accounts.tests.test_hard_delete_task -v 2`

Expected: PASS

**Step 7: Apply migration**

Run: `docker exec noteably python manage.py migrate accounts`

Expected: Migration applied successfully

**Step 8: Commit**

```bash
git add backend/apps/accounts/tasks.py backend/config/celery.py backend/apps/accounts/migrations/0005_create_account_deletions_table.py backend/apps/accounts/tests/test_hard_delete_task.py backend/apps/accounts/views.py
git commit -m "feat: add daily Celery task for hard delete after 14-day grace period"
```

---

## Task 6: Frontend — Add recovery page and update auth flow

**Files:**
- Create: `frontend/src/pages/RecoverAccount.tsx`
- Modify: `frontend/src/lib/api/services/auth.ts` (add recover methods)
- Modify: `frontend/src/App.tsx` or routing config (add route)

**Step 1: Add recovery methods to auth service**

Modify: `frontend/src/lib/api/services/auth.ts`

Add these methods:

```typescript
recoverAccount: async (token: string): Promise<string> => {
    const response = await apiClient.post<{ short_lived_token: string }>(
      "/auth/recover",
      { token }
    );
    return response.data.short_lived_token;
  },

  confirmRecovery: async (token: string, password: string): Promise<void> => {
    await apiClient.post("/auth/confirm-recovery", {
      token,
      password,
    });
  },
```

**Step 2: Create Recovery page component**

Create: `frontend/src/pages/RecoverAccount.tsx`

```typescript
import { useSearchParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { authService } from "@/lib/api/services/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function RecoverAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const token = searchParams.get("token");

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Recovery Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              No recovery token found in URL. Please check your email and try again.
            </p>
            <Button onClick={() => navigate("/login")} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      setLoading(true);
      await authService.confirmRecovery(token, password);
      setSuccess(true);

      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to recover account. Link may have expired.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="text-green-600" />
              Account Recovered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your account has been successfully recovered. You can now log in with your new password.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Redirecting to login...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recover Your Account</CardTitle>
          <CardDescription>
            Set a new password to restore access to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md flex gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleRecover} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                New Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Recovering..." : "Recover Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Add route to recovery page**

Modify: `frontend/src/App.tsx` (or your routing config file)

Add route:
```typescript
{
  path: "/auth/recover",
  element: <RecoverAccount />,
}
```

**Step 4: Update Profile page to show deleted account message**

Modify: `frontend/src/pages/Profile.tsx`

After getting user data, check for deleted status and show message:

```typescript
const isAccountDeleted = user?.user_metadata?.deleted_at;

if (isAccountDeleted) {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto pt-8">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Account Scheduled for Deletion</CardTitle>
            <CardDescription>
              Your account is scheduled for permanent deletion in 14 days.
              Check your email for recovery instructions.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </Layout>
  );
}
```

**Step 5: Test recovery flow**

Manual testing:
1. Delete account on Profile page
2. Check email for recovery link
3. Click link, should land on /auth/recover?token=...
4. Enter new password and confirm
5. Should see success message and redirect to login

Run: `npm run build` in frontend directory

Expected: Build succeeds

**Step 6: Commit**

```bash
git add frontend/src/pages/RecoverAccount.tsx frontend/src/lib/api/services/auth.ts frontend/src/App.tsx frontend/src/pages/Profile.tsx
git commit -m "feat: add account recovery page and update auth service with recovery methods"
```

---

## Task 7: Frontend — Update login to prevent deleted accounts

**Files:**
- Modify: `frontend/src/hooks/useAuth.ts` (add deleted check)
- Modify: `frontend/src/contexts/AuthContext.tsx` (handle deleted status)

**Step 1: Update auth context to check for deleted_at**

Modify: `frontend/src/contexts/AuthContext.tsx`

After user is loaded from Supabase, add:

```typescript
// Check if account is deleted
const isDeleted = user?.user_metadata?.deleted_at;

if (isDeleted) {
  // Account is pending deletion, show message
  console.warn("Account is scheduled for deletion");
  // Don't update user state, handle in component
  setUser(null);
  return;
}
```

**Step 2: Update login handler**

Modify: `frontend/src/contexts/AuthContext.tsx` in `setSession` or auth listener:

```typescript
const handleAuthStateChange = async (event, session) => {
  if (event === "SIGNED_IN" && session?.user) {
    const isDeleted = session.user.user_metadata?.deleted_at;

    if (isDeleted) {
      // Account is deleted, sign out immediately
      await supabase.auth.signOut();
      setError("This account is scheduled for deletion. Please check your email for recovery options.");
      return;
    }
  }
  // ... rest of handler
};
```

**Step 3: Show error message in login component**

Modify: `frontend/src/pages/Login.tsx` (or your login page)

Display auth error if account is deleted:

```typescript
const { error } = useAuth();

if (error && error.includes("scheduled for deletion")) {
  return (
    <div className="alert alert-error">
      {error}
    </div>
  );
}
```

**Step 4: Build and test**

Run: `npm run build` in frontend directory

Expected: Build succeeds

**Step 5: Commit**

```bash
git add frontend/src/contexts/AuthContext.tsx frontend/src/pages/Login.tsx
git commit -m "feat: prevent login for accounts scheduled for deletion"
```

---

## Task 8: Testing & Verification

**Files:**
- Existing test files verified
- Manual testing checklist

**Step 1: Run all backend tests**

Run: `docker exec noteably python manage.py test accounts -v 2`

Expected: All tests pass

**Step 2: Run frontend build**

Run: `cd frontend && npm run build`

Expected: Build succeeds with no errors

**Step 3: Manual testing checklist**

- [ ] Delete account from Profile page
- [ ] Receive deletion confirmation email
- [ ] Click recovery link in email
- [ ] Land on recovery page
- [ ] Enter new password and confirm
- [ ] See success message
- [ ] Log in with new password
- [ ] Account fully restored
- [ ] Try to log in during grace period with old password (should fail)
- [ ] Wait 14 days (or mock the date) and verify hard delete runs

**Step 4: Verify Celery task runs**

Run: `docker logs noteably` and check for task execution

Look for: `Hard delete task completed`

**Step 5: Commit final verification**

```bash
git commit -m "test: verify soft delete with recovery flow works end-to-end" --allow-empty
```

---

## Summary

This plan implements a complete soft delete with 14-day recovery system:

1. **Soft delete:** Account locked, deletion email sent, recovery token generated
2. **Recovery flow:** User clicks email link, sets new password, account restored
3. **Hard delete:** Celery task runs daily, hard deletes accounts after 14 days
4. **Frontend:** Recovery page, login prevention for deleted accounts, deleted status display
5. **Testing:** Unit tests for each component, integration tests for full flow, manual testing guide

Total commits: ~8 focused commits, each addressing one logical feature component.
