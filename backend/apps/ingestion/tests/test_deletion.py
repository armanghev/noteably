import uuid
from unittest.mock import patch

from apps.generation.models import GeneratedContent, QuizAttempt
from apps.ingestion.models import Job
from apps.transcription.models import Transcription
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class JobDeletionTests(APITestCase):
    def setUp(self):
        self.user_id = uuid.uuid4()
        self.other_user_id = uuid.uuid4()

        # Create a job for the primary user
        self.job = Job.objects.create(
            user_id=self.user_id,
            filename="test_file.mp3",
            file_size_bytes=1024,
            file_type="audio/mpeg",
            storage_url="https://example.com/storage/test_file.mp3",
            status="completed",
        )

        # Create related data to test cascade
        self.transcription = Transcription.objects.create(
            job=self.job, external_id="ext_123", text="Test transcript content"
        )

        self.notes = GeneratedContent.objects.create(
            job=self.job, type="notes", content={"notes": "Test notes"}
        )

        self.quiz_attempt = QuizAttempt.objects.create(
            job=self.job,
            user_id=self.user_id,
            score=8,
            total_questions=10,
            percentage=80.0,
        )

        # Create a job for another user
        self.other_job = Job.objects.create(
            user_id=self.other_user_id,
            filename="other_file.mp3",
            file_size_bytes=1024,
            file_type="audio/mpeg",
            storage_url="https://example.com/storage/other_file.mp3",
            status="completed",
        )

    def authenticate(self, user_id):
        """Simulate authentication by setting request.user_id"""
        self.client.defaults["HTTP_AUTHORIZATION"] = "Bearer mocked_token"
        # Note: In Noteably, IsAuthenticated permission uses request.user_id
        # which is usually set by a middleware from the JWT.
        # However, for testing with Mock, we might need to patch the permission or the request.
        pass

    @patch("apps.ingestion.views.delete_job_folder")
    @patch("apps.accounts.permissions.IsAuthenticated.has_permission")
    def test_delete_job_success(self, mock_permission, mock_delete_folder):
        mock_permission.return_value = True
        mock_delete_folder.return_value = True

        url = reverse("job_detail", kwargs={"job_id": self.job.id})

        # Mock request.user_id
        with patch("rest_framework.request.Request.user_id", self.user_id, create=True):
            response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["job_id"], str(self.job.id))
        self.assertIn("Successfully deleted", response.data["message"])

        # Verify DB records are gone (cascading)
        self.assertFalse(Job.objects.filter(id=self.job.id).exists())
        self.assertFalse(Transcription.objects.filter(job_id=self.job.id).exists())
        self.assertFalse(GeneratedContent.objects.filter(job_id=self.job.id).exists())
        self.assertFalse(QuizAttempt.objects.filter(job_id=self.job.id).exists())

        # Verify storage delete was called with correct job_id
        mock_delete_folder.assert_called_once_with(str(self.job.id))

    @patch("apps.accounts.permissions.IsAuthenticated.has_permission")
    def test_delete_job_unauthorized(self, mock_permission):
        mock_permission.return_value = True

        # Try to delete other user's job
        url = reverse("job_detail", kwargs={"job_id": self.other_job.id})

        with patch("rest_framework.request.Request.user_id", self.user_id, create=True):
            response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Job.objects.filter(id=self.other_job.id).exists())

    @patch("apps.accounts.permissions.IsAuthenticated.has_permission")
    def test_delete_job_not_found(self, mock_permission):
        mock_permission.return_value = True

        random_uuid = uuid.uuid4()
        url = reverse("job_detail", kwargs={"job_id": random_uuid})

        with patch("rest_framework.request.Request.user_id", self.user_id, create=True):
            response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
