import threading

import assemblyai as aai
from django.conf import settings
from apps.core.exceptions import ThirdPartyServiceError


class TranscriptionService:
    _initialized = False
    _lock = threading.Lock()

    @classmethod
    def _ensure_initialized(cls):
        # Double-check locking pattern for thread-safe initialization
        if not cls._initialized:
            with cls._lock:
                # Check again inside the lock to prevent race condition
                if not cls._initialized:
                    if not settings.ASSEMBLYAI_API_KEY:
                        raise ThirdPartyServiceError("AssemblyAI API key not configured")
                    aai.settings.api_key = settings.ASSEMBLYAI_API_KEY
                    cls._initialized = True

    @classmethod
    def transcribe(cls, audio_url: str) -> aai.Transcript:
        """
        Transcribes audio from URL using AssemblyAI.
        Blocks until transcription is complete (SDK handles polling automatically).

        Returns the Transcript object with id, text, and full response.
        Raises ThirdPartyServiceError on failure.
        """
        cls._ensure_initialized()

        try:
            transcriber = aai.Transcriber()
            transcript = transcriber.transcribe(audio_url)

            if transcript.status == aai.TranscriptStatus.error:
                raise ThirdPartyServiceError(
                    f"Transcription failed: {transcript.error}"
                )

            return transcript

        except aai.TranscriptError as e:
            raise ThirdPartyServiceError(f"Transcription failed: {str(e)}")
        except Exception as e:
            raise ThirdPartyServiceError(f"Transcription failed: {str(e)}")