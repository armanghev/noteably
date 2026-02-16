import json
import logging

from apps.core.exceptions import ThirdPartyServiceError
from django.conf import settings
from google import genai
from google.genai import types

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
    def generate_content(cls, text: str, type: str, options: dict = None) -> dict:
        """
        Generates content using Gemini based on the type (summary, notes, etc).
        Returns a dictionary of the generated content.
        """
        try:
            client = cls._get_client()
            prompt = get_prompt_for_type(type, text, options)

            # Request JSON response for structured types, plain text for cleanup
            # Request JSON response for structured types, plain text for cleanup and notes
            if type not in ["cleanup", "notes"]:
                config = types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            else:
                config = None

            response = client.models.generate_content(
                model="gemini-2.0-flash", contents=prompt, config=config
            )

            # Use the convenience .text property
            response_text = response.text

            if type == "cleanup":
                return response_text

            if type == "notes":
                return {"content": response_text}

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
            logger.error("Gemini generation failed", exc_info=True)
            raise ThirdPartyServiceError(f"Generation failed: {str(e)}")

    @classmethod
    def generate_chat_response(cls, contents: list, system_prompt: str) -> str:
        """Generate a conversational response using the Gemini client singleton."""
        try:
            client = cls._get_client()
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=contents,
                config=types.GenerateContentConfig(system_instruction=system_prompt),
            )
            return response.text or ""
        except Exception as e:
            logger.error("Assistant Gemini chat failed", exc_info=True)
            raise ThirdPartyServiceError(f"Chat generation failed: {str(e)}")
