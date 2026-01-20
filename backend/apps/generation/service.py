import json
import logging

import google.genai as genai
from apps.core.exceptions import ThirdPartyServiceError
from django.conf import settings

from .prompts import get_prompt_for_type

logger = logging.getLogger(__name__)


class GeminiService:
    @classmethod
    def _configure(cls):
        if not settings.GEMINI_API_KEY:
            raise ThirdPartyServiceError("Gemini API key not configured")
        genai.configure(api_key=settings.GEMINI_API_KEY)

    @classmethod
    def generate_content(cls, text: str, type: str) -> dict:
        """
        Generates content using Gemini based on the type (summary, notes, etc).
        Returns a dictionary of the generated content.
        """
        cls._configure()

        try:
            model = genai.GenerativeModel("gemini-2.0-flash")
            prompt = get_prompt_for_type(type, text)

            # Request JSON response for structured types, plain text for cleanup
            generation_config = {}
            if type != "cleanup":
                generation_config["response_mime_type"] = "application/json"

            response = model.generate_content(
                prompt, generation_config=generation_config
            )

            if type == "cleanup":
                return response.text

            # Parse JSON
            try:
                content = json.loads(response.text)
                return content
            except json.JSONDecodeError:
                # Fallback: sometimes model returns markdown code block
                text_content = response.text
                if "```json" in text_content:
                    text_content = text_content.split("```json")[1].split("```")[0]
                elif "```" in text_content:
                    text_content = text_content.split("```")[1].split("```")[0]

                return json.loads(text_content)

        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            raise ThirdPartyServiceError(f"Generation failed: {str(e)}")
