from unittest.mock import patch, MagicMock
from django.test import TestCase
from rest_framework.test import APIRequestFactory
from apps.ingestion.models import Job
from apps.transcription.models import Transcription
from apps.generation.models import GeneratedContent
from apps.generation.views import assistant_chat
import uuid


class AssistantChatViewTest(TestCase):
    def setUp(self):
        self.user_id = uuid.uuid4()
        self.job = Job.objects.create(
            user_id=self.user_id,
            filename="lecture.mp3",
            file_size_bytes=1000,
            file_type="audio/mpeg",
            storage_url="https://example.com/file.mp3",
            material_types=["flashcards"],
            status="completed",
        )
        self.transcription = Transcription.objects.create(
            job=self.job,
            external_id="test-123",
            text="Photosynthesis is the process by which plants convert light into food.",
        )
        GeneratedContent.objects.create(
            job=self.job,
            type="flashcards",
            content={"flashcards": [{"front": "What is photosynthesis?", "back": "Converting light to food"}]},
        )

    def _make_request(self, data, user_id=None):
        factory = APIRequestFactory()
        request = factory.post(
            f"/api/content/{self.job.id}/assistant/",
            data,
            format="json",
        )
        request.user_id = user_id or self.user_id
        return assistant_chat(request, job_id=self.job.id)

    @patch("apps.generation.views.GeminiService")
    def test_basic_chat_returns_message(self, mock_gemini_service):
        mock_gemini_service.generate_chat_response.return_value = "Photosynthesis converts light to energy."

        response = self._make_request({
            "message": "Explain photosynthesis",
            "conversation_history": [],
            "action": None,
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "Photosynthesis converts light to energy.")
        self.assertIsNone(response.data["action"])
        self.assertIsNone(response.data["generated_items"])

    def test_returns_404_for_wrong_user(self):
        response = self._make_request(
            {"message": "hello", "conversation_history": [], "action": None},
            user_id=uuid.uuid4(),
        )
        self.assertEqual(response.status_code, 404)

    def test_returns_400_for_missing_message(self):
        response = self._make_request({"conversation_history": [], "action": None})
        self.assertEqual(response.status_code, 400)

    @patch("apps.generation.views.GeminiService")
    def test_generate_flashcards_action_appends_to_existing(self, mock_gemini_service):
        mock_gemini_service.generate_content.return_value = {
            "flashcards": [{"front": "New Q", "back": "New A"}]
        }

        response = self._make_request({
            "message": "Generate new flashcards",
            "conversation_history": [],
            "action": "generate_flashcards",
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["action"], "generated_flashcards")
        self.assertIsNotNone(response.data["generated_items"])

        # Verify appended (now 2 flashcards total)
        content = GeneratedContent.objects.get(job=self.job, type="flashcards")
        self.assertEqual(len(content.content["flashcards"]), 2)

    @patch("apps.generation.views.GeminiService")
    def test_generate_quiz_action_creates_new_record(self, mock_gemini_service):
        mock_gemini_service.generate_content.return_value = {
            "questions": [{"question": "Q?", "options": ["A", "B", "C", "D"], "correct_option": 0}]
        }

        response = self._make_request({
            "message": "Generate a quiz",
            "conversation_history": [],
            "action": "generate_quiz",
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["action"], "generated_quiz")

        content = GeneratedContent.objects.get(job=self.job, type="quiz")
        self.assertEqual(len(content.content["questions"]), 1)


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
        from apps.ingestion.tasks import process_upload_task
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
