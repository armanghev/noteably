from django.test import TestCase
from unittest.mock import patch, MagicMock
from apps.ingestion.models import Job
from apps.generation.models import GeneratedContent
from apps.ingestion.tasks import process_upload_task
import uuid


class GenerationPipelineTest(TestCase):
    def setUp(self):
        self.user_id = uuid.uuid4()
        self.job = Job.objects.create(
            user_id=self.user_id,
            filename="test.mp3",
            file_size_bytes=1000,
            file_type="audio/mpeg",
            storage_url="https://example.com/file.mp3",
            material_types=["summary", "quiz"],
            status="queued",
        )

    @patch("apps.transcription.service.TranscriptionService.transcribe")
    @patch("apps.generation.service.GeminiService.generate_content")
    @patch("apps.ingestion.tasks.get_signed_url_from_storage_url")
    def test_full_pipeline(self, mock_signed_url, mock_generate, mock_transcribe):
        # Mock signed URL generation
        mock_signed_url.return_value = "https://example.com/signed-url.mp3"
        
        # Mock Transcript object (simulating AssemblyAI SDK Transcript)
        mock_transcript = MagicMock()
        mock_transcript.id = "tx_123"
        mock_transcript.text = "This is a lecture about Python."
        mock_transcript.status = MagicMock()
        mock_transcript.status.value = "completed"
        # Mock model_dump() method (Pydantic v2) or dict() method (Pydantic v1)
        mock_transcript.model_dump.return_value = {
            "id": "tx_123",
            "status": "completed",
            "text": "This is a lecture about Python.",
        }
        mock_transcribe.return_value = mock_transcript

        # Mock Gemini Service
        mock_generate.side_effect = [
            {"summary": "Python is great."},  # First call (summary)
            {"questions": []},  # Second call (quiz)
        ]

        # Run the task (new method blocks until complete, no retry needed)
        process_upload_task(self.job.id)

        self.job.refresh_from_db()
        self.assertEqual(self.job.status, "completed")
        self.assertEqual(self.job.progress, 100)
        self.assertEqual(self.job.transcription_id, "tx_123")

        # Verify content generated
        content = GeneratedContent.objects.filter(job=self.job)
        self.assertEqual(content.count(), 2)

        summary = content.get(type="summary")
        self.assertEqual(summary.content, {"summary": "Python is great."})
