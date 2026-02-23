import uuid
from unittest.mock import MagicMock, PropertyMock, patch

from apps.core.utils.email import send_job_completed_email, send_upload_received_email
from apps.ingestion.tasks import process_upload_task
from apps.ingestion.views import process_upload
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate


class EmailNotificationTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    @patch("apps.core.utils.email.resend")
    def test_email_utility_received(self, mock_resend):
        """Test that send_upload_received_email calls resend correctly."""
        mock_resend.api_key = "test_key"
        send_upload_received_email("test@example.com", "test.mp3")

        mock_resend.Emails.send.assert_called_once()
        args = mock_resend.Emails.send.call_args[0][0]
        self.assertEqual(args["to"], "test@example.com")
        self.assertIn("Upload Received", args["subject"])
        self.assertIn("test.mp3", args["html"])

    @patch("apps.core.utils.email.resend")
    def test_email_utility_completed(self, mock_resend):
        """Test that send_job_completed_email calls resend correctly."""
        mock_resend.api_key = "test_key"
        job_id = "test-job-id"
        send_job_completed_email("test@example.com", job_id, "test.mp3")

        mock_resend.Emails.send.assert_called_once()
        args = mock_resend.Emails.send.call_args[0][0]
        self.assertEqual(args["to"], "test@example.com")
        self.assertIn("Ready", args["subject"])
        self.assertIn(job_id, args["html"])

    @patch("apps.ingestion.views.process_upload_task")
    @patch("apps.core.utils.email.send_upload_received_email")
    @patch("apps.ingestion.views.Job.objects.create")  # Mock DB creation
    def test_process_upload_triggers_email(
        self, mock_create_job, mock_send_email, mock_task
    ):
        """Test that the upload view triggers the received email."""
        # Mock request with user email
        request = self.factory.post(
            "/api/ingestion/process",
            {"file": "fake_file", "material_types": ["summary"]},
            format="multipart",
        )

        # Create a mock user that behaves like a dict but is also an object (for force_authenticate)
        mock_user = MagicMock()
        mock_user.is_authenticated = True
        mock_user.get.side_effect = (
            lambda k: "user@example.com" if k == "email" else None
        )

        # DRF's force_authenticate sets the user on the request
        force_authenticate(request, user=mock_user)
        # We also need to set user_id manually as IsAuthenticated might check it on the request wrapper or user
        # Note: IsAuthenticated checks request.user_id, which our middleware normally sets.
        # But since we bypass middleware, we might need to rely on how DRF/Permission reads it.
        # IsAuthenticated checks: hasattr(request, "user_id")
        # DRF Request doesn't automatically copy arbitrary attributes from WSGIRequest.
        # The view wrapper does: request = initialize_request(request, *args, **kwargs)
        # We can't easily set attributes on the DRF Request from here.

        # WAIT: IsAuthenticated implementation in apps/accounts/permissions.py checks:
        # request.user_id
        # This attribute is usually added by the middleware to the WSGIRequest, and DRF Request might delegate getattr?
        # DRF Request implements __getattr__ to proxy to _request.
        request.user_id = str(uuid.uuid4())

        # Mock Job creation return value
        mock_job = MagicMock()
        mock_job.id = uuid.uuid4()
        mock_job.status = "queued"
        mock_job.estimate_processing_time.return_value = 60
        mock_create_job.return_value = mock_job

        # Mock serializer validation
        with patch("apps.ingestion.views.ProcessUploadSerializer") as MockSerializer:
            instance = MockSerializer.return_value
            instance.is_valid.return_value = True

            mock_file = MagicMock()
            mock_file.name = "test_audio.mp3"
            mock_file.size = 1024
            mock_file.content_type = "audio/mpeg"

            instance.validated_data = {
                "file": mock_file,
                "material_types": ["summary"],
                "options": {},
            }

            # Mock validators
            with (
                patch("apps.ingestion.views.validate_file_type"),
                patch("apps.ingestion.views.validate_file_size"),
                patch("apps.ingestion.views.get_file_duration"),
                patch("apps.ingestion.views.check_user_quota"),
                patch(
                    "apps.ingestion.views.upload_to_r2",
                    return_value="http://storage.url",
                ),
            ):
                response = process_upload(request)

                self.assertEqual(response.status_code, 201)
                mock_send_email.assert_called_once_with(
                    "user@example.com", "test_audio.mp3"
                )

                mock_task.delay.assert_called()
                call_args = mock_task.delay.call_args
                self.assertEqual(call_args[1]["user_email"], "user@example.com")

    @patch("apps.core.utils.email.send_job_completed_email")
    @patch("apps.ingestion.tasks.GeminiService")
    @patch("apps.ingestion.tasks.TranscriptionService")
    @patch("apps.ingestion.tasks.get_signed_url_from_storage_url")
    @patch("apps.ingestion.tasks.Job.objects.get")  # Mock DB fetch
    @patch("apps.transcription.models.Transcription.objects.create")  # Mock DB create
    @patch("apps.generation.models.GeneratedContent.objects.create")  # Mock DB create
    def test_process_task_triggers_completion_email(
        self,
        mock_gc_create,
        mock_tr_create,
        mock_job_get,
        mock_signed_url,
        mock_transcription,
        mock_gemini,
        mock_send_email,
    ):
        """Test that the task triggers completion email on success."""

        # Mock Job object
        job = MagicMock()
        job.id = uuid.uuid4()
        job.filename = "test.mp3"
        job.status = "queued"
        job.storage_url = "http://fake"
        job.material_types = ["summary"]
        job.transcription = None  # Simulate no transcription yet

        mock_job_get.return_value = job

        mock_signed_url.return_value = "http://signed"

        mock_transcript = MagicMock()
        mock_transcript.id = "trans-id"
        mock_transcript.text = "Hello world"
        mock_transcript.status.value = "completed"
        mock_transcript.json_response = {"id": "trans-id", "text": "Hello world"}

        mock_transcription.transcribe.return_value = mock_transcript

        # Manually link the transcription to the job mock so it can be accessed
        mock_tr_instance = MagicMock()
        mock_tr_instance.text = "Hello world"
        mock_tr_create.return_value = mock_tr_instance
        # The task accesses job.transcription.text, but since job is a mock, we need to set property
        type(job).transcription = PropertyMock(return_value=mock_tr_instance)

        mock_gemini.generate_content.return_value = {"summary": "This is a summary."}

        mock_gemini.generate_content.return_value = {"summary": "This is a summary."}

        # Run task
        process_upload_task(str(job.id), user_email="user@example.com")

        # Check email sent
        mock_send_email.assert_called_once_with(
            "user@example.com", str(job.id), "test.mp3"
        )
