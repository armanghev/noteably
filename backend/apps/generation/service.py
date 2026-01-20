import json
import logging

from google import genai
from google.genai import types
from apps.core.exceptions import ThirdPartyServiceError
from django.conf import settings

from .prompts import get_prompt_for_type

logger = logging.getLogger(__name__)


class GeminiService:
    _client = None

    @classmethod
    def _get_client(cls):
        """Get or create Gemini client instance."""
        if cls._client is None:
            if not settings.GEMINI_API_KEY:
                raise ThirdPartyServiceError("Gemini API key not configured")
            cls._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return cls._client

    @classmethod
    def generate_content(cls, text: str, type: str) -> dict:
        """
        Generates content using Gemini based on the type (summary, notes, etc).
        Returns a dictionary of the generated content.
        """
        try:
            client = cls._get_client()
            prompt = get_prompt_for_type(type, text)

            # Request JSON response for structured types, plain text for cleanup
            if type != "cleanup":
                config = types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            else:
                config = None

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=config
            )

            # Use the convenience .text property
            response_text = response.text

            if type == "cleanup":
                return response_text

            # Parse JSON
            try:
                content = json.loads(response_text)
                return content
            except json.JSONDecodeError:
                # Fallback: sometimes model returns markdown code block
                text_content = response_text
                if "```json" in text_content:
                    text_content = text_content.split("```json")[1].split("```")[0]
                elif "```" in text_content:
                    text_content = text_content.split("```")[1].split("```")[0]

                return json.loads(text_content)

        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            raise ThirdPartyServiceError(f"Generation failed: {str(e)}")
