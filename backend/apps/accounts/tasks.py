"""Background tasks for account management."""

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from celery import shared_task
from django.conf import settings

from apps.core.supabase_client import supabase_client
from apps.ingestion.models import Job
from apps.ingestion.r2_storage import delete_job_folder

logger = logging.getLogger(__name__)

DELETION_GRACE_PERIOD_DAYS = 14


@shared_task(name="accounts.process_pending_deletions", bind=True, max_retries=3)
def process_pending_deletions(self):
    """
    Find accounts scheduled for deletion (14+ days ago) and perform hard delete.

    This task:
    1. Finds all users with deleted_at older than 14 days
    2. For each, deletes: APIKeys → Storage files → Jobs (cascade) → Subscriptions → Auth
    3. Logs success/failure for each user
    4. Retries on failure (max 3 times)

    Runs daily via Celery beat scheduler.

    Returns:
        dict: Summary of deletion results {successful, failed, total}
    """
    logger.info("Starting process_pending_deletions task")

    try:
        # Calculate grace period expiration cutoff
        cutoff_time = datetime.now(timezone.utc) - timedelta(
            days=DELETION_GRACE_PERIOD_DAYS
        )

        # Query Supabase for all users with deleted_at timestamp
        try:
            users_to_delete = _get_users_pending_deletion(cutoff_time)
        except Exception as e:
            logger.error(f"Failed to query pending deletion users: {e}")
            # Retry with 5-minute fixed delay (Celery will retry up to max_retries times)
            raise self.retry(exc=e, countdown=60 * 5, max_retries=3)

        logger.info(f"Found {len(users_to_delete)} accounts pending hard deletion")

        successful_deletions = 0
        failed_deletions = 0

        # Hard delete each expired account
        for user_id in users_to_delete:
            try:
                _hard_delete_user(user_id)
                successful_deletions += 1
                logger.info(f"Hard deleted user {user_id}")
            except Exception as e:
                failed_deletions += 1
                logger.error(f"Failed to hard delete user {user_id}: {e}")
                # Continue with next user instead of failing entire task

        # Log summary
        logger.info(
            f"process_pending_deletions completed: "
            f"{successful_deletions} succeeded, {failed_deletions} failed"
        )

        return {
            "successful": successful_deletions,
            "failed": failed_deletions,
            "total": successful_deletions + failed_deletions,
        }

    except Exception as e:
        logger.error(f"process_pending_deletions failed: {e}")
        raise


def _get_users_pending_deletion(cutoff_time: datetime) -> list[str]:
    """
    Get list of user IDs where deleted_at < cutoff_time (older than 14 days).

    Returns:
        List of UUID strings for users scheduled for hard deletion

    Raises:
        Exception: If querying Supabase Auth fails
    """
    try:
        # Get all users from Supabase Auth admin API
        client = supabase_client.client
        all_users = client.auth.admin.list_users()

        pending_deletion_user_ids = []

        for user in all_users.users:
            user_metadata = user.user_metadata or {}
            deleted_at_str = user_metadata.get("deleted_at")

            if deleted_at_str:
                try:
                    deleted_at = datetime.fromisoformat(deleted_at_str)
                    # Ensure timezone-aware
                    if deleted_at.tzinfo is None:
                        deleted_at = deleted_at.replace(tzinfo=timezone.utc)

                    # If deletion time is before cutoff, account is ready for hard delete
                    if deleted_at < cutoff_time:
                        pending_deletion_user_ids.append(str(user.id))
                except (ValueError, TypeError) as e:
                    logger.error(f"Failed to parse deleted_at for user {user.id}: {e}")

        return pending_deletion_user_ids

    except Exception as e:
        logger.error(f"Failed to get pending deletion users: {e}")
        raise


def _hard_delete_user(user_id: str) -> None:
    """
    Permanently delete a user and all associated data.

    Order of deletion:
    1. Django models (APIKeys, Jobs cascade → GeneratedContent, QuizAttempts, ChatMessages)
    2. R2 storage files (job uploads), Supabase Storage (avatar)
    3. Supabase DB rows (user_subscriptions)
    4. Supabase Auth user (last step)

    Args:
        user_id: UUID string of user to delete

    Raises:
        Exception: If any deletion step fails
    """
    logger.info(f"Starting hard delete for user {user_id}")

    # 1. Delete Django models (APIKeys)
    try:
        from .models import APIKey

        deleted_count, _ = APIKey.objects.filter(user=user_id).delete()
        logger.info(f"Deleted {deleted_count} API keys for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to delete API keys for user {user_id}: {e}")
        raise

    # 2. Delete Supabase Storage files and Django models (Jobs cascade)
    try:
        # Delete job upload folders first
        job_ids = list(Job.objects.filter(user_id=user_id).values_list("id", flat=True))
        logger.info(f"Deleting storage for {len(job_ids)} jobs for user {user_id}")

        for job_id in job_ids:
            try:
                delete_job_folder(str(job_id))
                logger.info(f"Deleted storage folder for job {job_id}")
            except Exception as e:
                logger.error(f"Failed to delete storage for job {job_id}: {e}")
                raise

        # Delete avatar (best effort)
        try:
            client = supabase_client.client
            avatar_key = f"{str(user_id).lower()}/avatar.jpg"
            client.storage.from_("avatars").remove([avatar_key])
            logger.info(f"Deleted avatar for user {user_id}")
        except Exception as e:
            logger.warning(f"Failed to delete avatar for user {user_id}: {e}")
            # Not critical if avatar doesn't exist

    except Exception as e:
        logger.error(f"Failed to delete storage files for user {user_id}: {e}")
        raise

    # 3. Delete Django models (Jobs cascade → GeneratedContent, QuizAttempts, ChatMessages)
    try:
        deleted_count, details = Job.objects.filter(user_id=user_id).delete()
        logger.info(
            f"Deleted {deleted_count} jobs (+ cascaded content) for user {user_id}: {details}"
        )
    except Exception as e:
        logger.error(f"Failed to delete jobs for user {user_id}: {e}")
        raise

    # 4. Delete Supabase user_subscriptions row
    try:
        client = supabase_client.client
        response = (
            client.table("user_subscriptions")
            .delete()
            .eq("user_id", str(user_id))
            .execute()
        )
        logger.info(f"Deleted subscription record for user {user_id}")
    except Exception as e:
        logger.warning(f"Failed to delete subscription for user {user_id}: {e}")
        # Not critical — row may not exist for free tier users

    # 5. Delete user from Supabase Auth (must be last)
    try:
        client = supabase_client.client
        client.auth.admin.delete_user(str(user_id))
        logger.info(f"Deleted Supabase auth user {user_id}")
    except Exception as e:
        logger.error(f"Failed to delete Supabase auth user {user_id}: {e}")
        raise

    logger.info(f"Hard delete completed successfully for user {user_id}")
