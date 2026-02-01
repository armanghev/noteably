import uuid
from unittest.mock import patch

from apps.ingestion.models import Job
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class JobRetryTests(APITestCase):
    def setUp(self):
        self.user_id = uuid.uuid4()
        self.other_user_id = uuid.uuid4()

        # Create a failed job for the primary user
        self.job = Job.objects.create(
            user_id=self.user_id,
            filename="test_file.mp3",
            file_size_bytes=1024,
            file_type="audio/mpeg",
            storage_url="https://example.com/storage/test_file.mp3",
            status="failed",
            error_message="Initial failure",
        )

        # Create a completed job (should not be retryable)
        self.completed_job = Job.objects.create(
            user_id=self.user_id,
            filename="completed_file.mp3",
            file_size_bytes=1024,
            file_type="audio/mpeg",
            storage_url="https://example.com/storage/completed_file.mp3",
            status="completed",
        )

        # Create a job for another user
        self.other_job = Job.objects.create(
            user_id=self.other_user_id,
            filename="other_file.mp3",
            file_size_bytes=1024,
            file_type="audio/mpeg",
            storage_url="https://example.com/storage/other_file.mp3",
            status="failed",
        )

    @patch("apps.ingestion.views.orchestrate_job_task.delay")
    @patch("apps.accounts.permissions.IsAuthenticated.has_permission")
    def test_retry_job_success(self, mock_permission, mock_orchestrate):
        mock_permission.return_value = True
        url = reverse("retry_job", kwargs={"job_id": self.job.id})

        # Mock request.user_id and request.user
        with patch("rest_framework.request.Request.user_id", self.user_id, create=True):
            with patch(
                "rest_framework.request.Request.user",
                {"email": "test@example.com"},
                create=True,
            ):
                response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "queued")

        # Verify job was reset in DB
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, "queued")
        self.assertEqual(self.job.error_message, "")
        self.assertEqual(self.job.retry_count, 1)

        # Verify orchestration was triggered
        mock_orchestrate.assert_called_once_with(
            str(self.job.id), user_email="test@example.com"
        )

    @patch("apps.accounts.permissions.IsAuthenticated.has_permission")
    def test_retry_completed_job_fails(self, mock_permission):
        mock_permission.return_value = True
        url = reverse("retry_job", kwargs={"job_id": self.completed_job.id})

        with patch("rest_framework.request.Request.user_id", self.user_id, create=True):
            response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot be retried", response.data["error"])

    @patch("apps.accounts.permissions.IsAuthenticated.has_permission")
    def test_retry_other_user_job_fails(self, mock_permission):
        mock_permission.return_value = True
        url = reverse("retry_job", kwargs={"job_id": self.other_job.id})

        with patch("rest_framework.request.Request.user_id", self.user_id, create=True):
            response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
