"""Tests for hard delete background task."""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock, call

import pytest
from django.test import TestCase

from apps.accounts.tasks import (
    process_pending_deletions,
    _get_users_pending_deletion,
    _hard_delete_user,
    DELETION_GRACE_PERIOD_DAYS,
)
from apps.ingestion.models import Job
from apps.accounts.models import APIKey


@pytest.mark.django_db
class TestProcessPendingDeletions(TestCase):
    """Test suite for process_pending_deletions Celery task."""

    @patch("apps.accounts.tasks._get_users_pending_deletion")
    @patch("apps.accounts.tasks._hard_delete_user")
    def test_process_pending_deletions_success_no_users(
        self, mock_hard_delete, mock_get_users
    ):
        """Test task completes successfully when no users pending deletion."""
        mock_get_users.return_value = []

        result = process_pending_deletions()

        assert result["successful"] == 0
        assert result["failed"] == 0
        assert result["total"] == 0
        mock_hard_delete.assert_not_called()

    @patch("apps.accounts.tasks._get_users_pending_deletion")
    @patch("apps.accounts.tasks._hard_delete_user")
    def test_process_pending_deletions_success_single_user(
        self, mock_hard_delete, mock_get_users
    ):
        """Test successful hard deletion of single expired account."""
        user_id = str(uuid.uuid4())
        mock_get_users.return_value = [user_id]

        result = process_pending_deletions()

        assert result["successful"] == 1
        assert result["failed"] == 0
        assert result["total"] == 1
        mock_hard_delete.assert_called_once_with(user_id)

    @patch("apps.accounts.tasks._get_users_pending_deletion")
    @patch("apps.accounts.tasks._hard_delete_user")
    def test_process_pending_deletions_success_multiple_users(
        self, mock_hard_delete, mock_get_users
    ):
        """Test successful hard deletion of multiple expired accounts."""
        user_ids = [str(uuid.uuid4()) for _ in range(3)]
        mock_get_users.return_value = user_ids

        result = process_pending_deletions()

        assert result["successful"] == 3
        assert result["failed"] == 0
        assert result["total"] == 3
        assert mock_hard_delete.call_count == 3
        for user_id in user_ids:
            mock_hard_delete.assert_any_call(user_id)

    @patch("apps.accounts.tasks._get_users_pending_deletion")
    @patch("apps.accounts.tasks._hard_delete_user")
    def test_process_pending_deletions_partial_failure(
        self, mock_hard_delete, mock_get_users
    ):
        """Test task continues despite individual deletion failures."""
        user_ids = [str(uuid.uuid4()) for _ in range(3)]
        mock_get_users.return_value = user_ids
        # Second user deletion fails
        mock_hard_delete.side_effect = [None, Exception("Delete failed"), None]

        result = process_pending_deletions()

        assert result["successful"] == 2
        assert result["failed"] == 1
        assert result["total"] == 3
        assert mock_hard_delete.call_count == 3

    @patch("apps.accounts.tasks._get_users_pending_deletion")
    @patch("apps.accounts.tasks._hard_delete_user")
    def test_process_pending_deletions_all_failures(
        self, mock_hard_delete, mock_get_users
    ):
        """Test task logs all failures without stopping."""
        user_ids = [str(uuid.uuid4()) for _ in range(2)]
        mock_get_users.return_value = user_ids
        mock_hard_delete.side_effect = Exception("Delete failed")

        result = process_pending_deletions()

        assert result["successful"] == 0
        assert result["failed"] == 2
        assert result["total"] == 2

    @patch("apps.accounts.tasks._get_users_pending_deletion")
    def test_process_pending_deletions_query_failure_retries(self, mock_get_users):
        """Test task retries when querying pending users fails."""
        mock_get_users.side_effect = Exception("Database error")

        with pytest.raises(Exception):
            process_pending_deletions()


@pytest.mark.django_db
class TestGetUsersPendingDeletion(TestCase):
    """Test suite for _get_users_pending_deletion helper function."""

    @patch("apps.accounts.tasks.supabase_client.client")
    def test_get_users_no_deleted_users(self, mock_client):
        """Test returns empty list when no users have deleted_at."""
        mock_users = MagicMock()
        mock_users.users = [
            MagicMock(id=str(uuid.uuid4()), user_metadata=None),
            MagicMock(id=str(uuid.uuid4()), user_metadata={}),
        ]
        mock_client.auth.admin.list_users.return_value = mock_users

        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=DELETION_GRACE_PERIOD_DAYS)

        result = _get_users_pending_deletion(cutoff)

        assert result == []

    @patch("apps.accounts.tasks.supabase_client.client")
    def test_get_users_with_recent_deletion(self, mock_client):
        """Test excludes users deleted < 14 days ago."""
        user_id = str(uuid.uuid4())
        deleted_at = datetime.now(timezone.utc) - timedelta(days=5)

        mock_users = MagicMock()
        mock_users.users = [
            MagicMock(
                id=user_id,
                user_metadata={"deleted_at": deleted_at.isoformat()},
            ),
        ]
        mock_client.auth.admin.list_users.return_value = mock_users

        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=DELETION_GRACE_PERIOD_DAYS)

        result = _get_users_pending_deletion(cutoff)

        assert result == []

    @patch("apps.accounts.tasks.supabase_client.client")
    def test_get_users_with_expired_deletion(self, mock_client):
        """Test includes users deleted >= 14 days ago."""
        user_id = str(uuid.uuid4())
        deleted_at = datetime.now(timezone.utc) - timedelta(days=15)

        mock_users = MagicMock()
        mock_users.users = [
            MagicMock(
                id=user_id,
                user_metadata={"deleted_at": deleted_at.isoformat()},
            ),
        ]
        mock_client.auth.admin.list_users.return_value = mock_users

        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=DELETION_GRACE_PERIOD_DAYS)

        result = _get_users_pending_deletion(cutoff)

        assert result == [str(user_id)]

    @patch("apps.accounts.tasks.supabase_client.client")
    def test_get_users_boundary_exactly_14_days(self, mock_client):
        """Test excludes users deleted exactly 14 days ago (grace period boundary)."""
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        deleted_at = now - timedelta(days=DELETION_GRACE_PERIOD_DAYS)

        mock_users = MagicMock()
        mock_users.users = [
            MagicMock(
                id=user_id,
                user_metadata={"deleted_at": deleted_at.isoformat()},
            ),
        ]
        mock_client.auth.admin.list_users.return_value = mock_users

        cutoff = now - timedelta(days=DELETION_GRACE_PERIOD_DAYS)

        result = _get_users_pending_deletion(cutoff)

        # At exactly 14 days, deletion time == cutoff, so should not include
        assert result == []

    @patch("apps.accounts.tasks.supabase_client.client")
    def test_get_users_boundary_just_over_14_days(self, mock_client):
        """Test includes users deleted just over 14 days ago."""
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        deleted_at = now - timedelta(days=DELETION_GRACE_PERIOD_DAYS, seconds=1)

        mock_users = MagicMock()
        mock_users.users = [
            MagicMock(
                id=user_id,
                user_metadata={"deleted_at": deleted_at.isoformat()},
            ),
        ]
        mock_client.auth.admin.list_users.return_value = mock_users

        cutoff = now - timedelta(days=DELETION_GRACE_PERIOD_DAYS)

        result = _get_users_pending_deletion(cutoff)

        assert result == [str(user_id)]

    @patch("apps.accounts.tasks.supabase_client.client")
    def test_get_users_multiple_mixed_states(self, mock_client):
        """Test correctly filters users with mixed deletion states."""
        user_recent = str(uuid.uuid4())
        user_expired = str(uuid.uuid4())
        user_no_deletion = str(uuid.uuid4())

        now = datetime.now(timezone.utc)
        deleted_recently = now - timedelta(days=5)
        deleted_long_ago = now - timedelta(days=20)

        mock_users = MagicMock()
        mock_users.users = [
            MagicMock(
                id=user_recent,
                user_metadata={"deleted_at": deleted_recently.isoformat()},
            ),
            MagicMock(
                id=user_expired,
                user_metadata={"deleted_at": deleted_long_ago.isoformat()},
            ),
            MagicMock(id=user_no_deletion, user_metadata=None),
        ]
        mock_client.auth.admin.list_users.return_value = mock_users

        cutoff = now - timedelta(days=DELETION_GRACE_PERIOD_DAYS)

        result = _get_users_pending_deletion(cutoff)

        assert result == [str(user_expired)]
        assert str(user_recent) not in result
        assert str(user_no_deletion) not in result

    @patch("apps.accounts.tasks.supabase_client.client")
    def test_get_users_handles_invalid_timestamp_format(self, mock_client):
        """Test gracefully handles invalid deleted_at timestamp format."""
        user_valid = str(uuid.uuid4())
        user_invalid = str(uuid.uuid4())

        now = datetime.now(timezone.utc)
        deleted_valid = now - timedelta(days=20)

        mock_users = MagicMock()
        mock_users.users = [
            MagicMock(
                id=user_valid,
                user_metadata={"deleted_at": deleted_valid.isoformat()},
            ),
            MagicMock(
                id=user_invalid,
                user_metadata={"deleted_at": "invalid-timestamp"},
            ),
        ]
        mock_client.auth.admin.list_users.return_value = mock_users

        cutoff = now - timedelta(days=DELETION_GRACE_PERIOD_DAYS)

        result = _get_users_pending_deletion(cutoff)

        # Should include valid user, skip invalid one
        assert result == [str(user_valid)]

    @patch("apps.accounts.tasks.supabase_client.client")
    def test_get_users_handles_query_exception(self, mock_client):
        """Test raises exception when Supabase query fails."""
        mock_client.auth.admin.list_users.side_effect = Exception("Supabase error")

        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=DELETION_GRACE_PERIOD_DAYS)

        with pytest.raises(Exception):
            _get_users_pending_deletion(cutoff)


@pytest.mark.django_db
class TestHardDeleteUser(TestCase):
    """Test suite for _hard_delete_user helper function."""

    def setUp(self):
        """Set up test fixtures."""
        self.user_id = str(uuid.uuid4())

    @patch("apps.accounts.tasks.supabase_client.client")
    def test_hard_delete_removes_api_keys(self, mock_client):
        """Test that hard delete removes all API keys for the user."""
        # Create test API keys
        api_key_1 = APIKey.objects.create(
            user=self.user_id,
            name="test-key-1",
            prefix="test0001",
            hashed_key="hashed_key_1",
        )
        api_key_2 = APIKey.objects.create(
            user=self.user_id,
            name="test-key-2",
            prefix="test0002",
            hashed_key="hashed_key_2",
        )

        # Setup mocks for other deletion steps
        mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = (
            None
        )
        mock_client.auth.admin.delete_user.return_value = None
        mock_client.storage.from_.return_value.remove.return_value = None

        with patch("apps.accounts.tasks.Job.objects.filter") as mock_job_filter:
            mock_job_filter.return_value.values_list.return_value = []
            mock_job_filter.return_value.delete.return_value = (0, {})

            _hard_delete_user(self.user_id)

        # Verify API keys were deleted
        assert not APIKey.objects.filter(user=self.user_id).exists()

    @patch("apps.accounts.tasks.delete_job_folder")
    @patch("apps.accounts.tasks.supabase_client.client")
    @patch("apps.accounts.tasks.Job.objects.filter")
    def test_hard_delete_removes_job_storage(
        self, mock_job_filter, mock_client, mock_delete_folder
    ):
        """Test that hard delete removes job storage files."""
        job_id_1 = str(uuid.uuid4())
        job_id_2 = str(uuid.uuid4())

        mock_job_filter.return_value.values_list.return_value = [job_id_1, job_id_2]
        mock_job_filter.return_value.delete.return_value = (2, {})
        mock_client.auth.admin.delete_user.return_value = None

        _hard_delete_user(self.user_id)

        # Verify storage deletion was called for each job
        assert mock_delete_folder.call_count == 2
        mock_delete_folder.assert_any_call(job_id_1)
        mock_delete_folder.assert_any_call(job_id_2)

    @patch("apps.accounts.tasks.supabase_client.client")
    @patch("apps.accounts.tasks.Job.objects.filter")
    def test_hard_delete_removes_jobs(self, mock_job_filter, mock_client):
        """Test that hard delete removes all jobs (cascade deletes content)."""
        mock_job_filter.return_value.values_list.return_value = []
        mock_job_filter.return_value.delete.return_value = (5, {})
        mock_client.auth.admin.delete_user.return_value = None

        _hard_delete_user(self.user_id)

        # Verify jobs were deleted
        mock_job_filter.assert_called_with(user_id=self.user_id)
        mock_job_filter.return_value.delete.assert_called()

    @patch("apps.accounts.tasks.supabase_client.client")
    @patch("apps.accounts.tasks.Job.objects.filter")
    def test_hard_delete_removes_subscription(self, mock_job_filter, mock_client):
        """Test that hard delete removes user subscription record."""
        mock_job_filter.return_value.values_list.return_value = []
        mock_job_filter.return_value.delete.return_value = (0, {})

        mock_table = MagicMock()
        mock_delete_query = MagicMock()
        mock_eq_query = MagicMock()

        mock_client.table.return_value = mock_table
        mock_table.delete.return_value = mock_delete_query
        mock_delete_query.eq.return_value = mock_eq_query
        mock_eq_query.execute.return_value = {"data": []}

        mock_client.auth.admin.delete_user.return_value = None

        _hard_delete_user(self.user_id)

        # Verify subscription deletion was attempted
        mock_client.table.assert_called_with("user_subscriptions")
        mock_table.delete.assert_called_once()

    @patch("apps.accounts.tasks.supabase_client.client")
    @patch("apps.accounts.tasks.Job.objects.filter")
    def test_hard_delete_removes_auth_user(self, mock_job_filter, mock_client):
        """Test that hard delete removes user from Supabase Auth (last step)."""
        mock_job_filter.return_value.values_list.return_value = []
        mock_job_filter.return_value.delete.return_value = (0, {})
        mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = (
            None
        )

        _hard_delete_user(self.user_id)

        # Verify auth user deletion was called
        mock_client.auth.admin.delete_user.assert_called_once_with(self.user_id)

    @patch("apps.accounts.tasks.supabase_client.client")
    @patch("apps.accounts.tasks.Job.objects.filter")
    def test_hard_delete_deletion_order(self, mock_job_filter, mock_client):
        """Test that deletions happen in correct order (Auth is last)."""
        # Track call order
        call_order = []

        def track_api_key_delete(*args, **kwargs):
            call_order.append("api_keys")
            return 0, {}

        def track_job_delete(*args, **kwargs):
            call_order.append("jobs")
            return 0, {}

        def track_subscription_delete(*args, **kwargs):
            call_order.append("subscription")

        def track_auth_delete(*args, **kwargs):
            call_order.append("auth")

        mock_job_filter.return_value.values_list.return_value = []
        mock_job_filter.return_value.delete.side_effect = track_job_delete
        mock_client.table.return_value.delete.return_value.eq.return_value.execute.side_effect = (
            track_subscription_delete
        )
        mock_client.auth.admin.delete_user.side_effect = track_auth_delete

        with patch(
            "apps.accounts.models.APIKey.objects.filter"
        ) as mock_api_key_filter:
            mock_api_key_filter.return_value.delete.side_effect = track_api_key_delete

            _hard_delete_user(self.user_id)

        # Verify Auth deletion is last
        assert call_order[-1] == "auth"

    @patch("apps.accounts.tasks.supabase_client.client")
    @patch("apps.accounts.tasks.Job.objects.filter")
    def test_hard_delete_api_key_deletion_failure_raises(
        self, mock_job_filter, mock_client
    ):
        """Test that hard delete raises if API key deletion fails."""
        with patch(
            "apps.accounts.models.APIKey.objects.filter"
        ) as mock_api_key_filter:
            mock_api_key_filter.return_value.delete.side_effect = Exception(
                "Database error"
            )

            with pytest.raises(Exception):
                _hard_delete_user(self.user_id)

    @patch("apps.accounts.tasks.supabase_client.client")
    @patch("apps.accounts.tasks.Job.objects.filter")
    def test_hard_delete_job_deletion_failure_raises(self, mock_job_filter, mock_client):
        """Test that hard delete raises if job deletion fails."""
        mock_job_filter.return_value.values_list.return_value = []
        mock_job_filter.return_value.delete.side_effect = Exception("Database error")

        with pytest.raises(Exception):
            _hard_delete_user(self.user_id)

    @patch("apps.accounts.tasks.supabase_client.client")
    @patch("apps.accounts.tasks.Job.objects.filter")
    def test_hard_delete_auth_deletion_failure_raises(self, mock_job_filter, mock_client):
        """Test that hard delete raises if auth deletion fails."""
        mock_job_filter.return_value.values_list.return_value = []
        mock_job_filter.return_value.delete.return_value = (0, {})
        mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = (
            None
        )
        mock_client.auth.admin.delete_user.side_effect = Exception("Auth error")

        with pytest.raises(Exception):
            _hard_delete_user(self.user_id)

    @patch("apps.accounts.tasks.supabase_client.client")
    @patch("apps.accounts.tasks.Job.objects.filter")
    def test_hard_delete_avatar_deletion_failure_continues(
        self, mock_job_filter, mock_client
    ):
        """Test that avatar deletion failure doesn't stop the process."""
        mock_job_filter.return_value.values_list.return_value = []
        mock_job_filter.return_value.delete.return_value = (0, {})

        # Avatar deletion fails
        mock_client.storage.from_.return_value.remove.side_effect = Exception(
            "Avatar not found"
        )
        mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = (
            None
        )
        mock_client.auth.admin.delete_user.return_value = None

        # Should not raise
        _hard_delete_user(self.user_id)

        # But auth deletion should still happen
        mock_client.auth.admin.delete_user.assert_called_once_with(self.user_id)

    @patch("apps.accounts.tasks.supabase_client.client")
    @patch("apps.accounts.tasks.Job.objects.filter")
    def test_hard_delete_subscription_deletion_failure_continues(
        self, mock_job_filter, mock_client
    ):
        """Test that subscription deletion failure doesn't stop the process."""
        mock_job_filter.return_value.values_list.return_value = []
        mock_job_filter.return_value.delete.return_value = (0, {})

        # Subscription deletion fails
        mock_client.table.return_value.delete.return_value.eq.return_value.execute.side_effect = (
            Exception("Subscription not found")
        )
        mock_client.auth.admin.delete_user.return_value = None

        # Should not raise
        _hard_delete_user(self.user_id)

        # But auth deletion should still happen
        mock_client.auth.admin.delete_user.assert_called_once_with(self.user_id)
