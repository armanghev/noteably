from django.test import TestCase
from django.urls import reverse
from unittest.mock import patch

from apps.ingestion.models import Job
from django.core.files.uploadedfile import SimpleUploadedFile
import uuid


class TranscriptionTriggerTest(TestCase):
    def setUp(self):
        # Create a mock user since we use IsAuthenticated
        self.user_id = uuid.uuid4()
        # Mock authentication middleware/permission behavior if needed
        # But for unit test with APIClient or client, we need to force auth.
        # Since we use custom Supabase auth, we might need to mock that or use force_authenticate if using DRF.
        pass

    @patch("apps.ingestion.views.process_upload_task.delay")
    @patch("apps.ingestion.views.validate_file_type")
    @patch("apps.ingestion.views.validate_file_size")
    @patch("apps.ingestion.views.check_user_quota")
    @patch("apps.ingestion.views.upload_to_r2")
    def test_upload_triggers_task(
        self, mock_upload, mock_quota, mock_size, mock_type, mock_task
    ):
        # Mock dependencies
        mock_upload.return_value = "https://example.supabase.co/storage/v1/object/public/uploads/uuid/file.mp3"

        # Setup request
        url = reverse("process_upload")  # We need to know the URL name
        file = SimpleUploadedFile("test.mp3", b"content", content_type="audio/mpeg")

        # We need to inject user_id into request, which is done by middleware.
        # In Django TestCase, we can't easily inject into request.user object for custom middleware attrs unless we use Client with custom middleware or mock the permission.
        # However, the view uses `request.user_id`.

        # Easier: Mock the view's getting of user_id or use APIRequestFactory.
        from rest_framework.test import APIRequestFactory, force_authenticate
        from apps.ingestion.views import process_upload

        factory = APIRequestFactory()
        request = factory.post(
            "/api/process",
            {"file": file, "material_types": '["summary"]'},
            format="multipart",
        )

        # Mock user_id on request
        request.user_id = self.user_id

        # Call view directly
        response = process_upload(request)

        self.assertEqual(response.status_code, 201)
        self.assertTrue(mock_task.called)
        self.assertEqual(Job.objects.count(), 1)
