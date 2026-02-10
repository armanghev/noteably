"""DRF serializers for Job model."""

from apps.generation.serializers import GeneratedContentSerializer
from rest_framework import serializers

from .models import Job


class JobListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for job list views - excludes heavy content fields."""

    class Meta:
        model = Job
        fields = [
            "id",
            "filename",
            "file_type",
            "status",
            "progress",
            "current_step",
            "error_message",
            "created_at",
            "completed_at",
        ]

    def to_representation(self, instance):
        """Override to compute all content-derived fields in a single pass."""
        data = super().to_representation(instance)

        # Process generated_content once for all derived fields
        flashcard_count = 0
        quiz_count = 0
        content_types = []
        summary_title = instance.filename
        summary_preview = ""

        # Normalize type names (web frontend sends "quizzes" but canonical type is "quiz")
        type_aliases = {"quizzes": "quiz"}
        for content in instance.generated_content.all():
            content_types.append(type_aliases.get(content.type, content.type))

            if content.type == "flashcards":
                flashcards = content.content.get("flashcards", [])
                flashcard_count = len(flashcards) if isinstance(flashcards, list) else 0
            elif content.type in ("quiz", "quizzes"):
                questions = content.content.get("questions", [])
                quiz_count = len(questions) if isinstance(questions, list) else 0
            elif content.type == "summary":
                summary_title = content.content.get("title", instance.filename)
                summary = content.content.get("summary", "")
                summary_preview = (summary[:200] + "...") if len(summary) > 200 else summary

        data["flashcard_count"] = flashcard_count
        data["quiz_count"] = quiz_count
        data["content_types"] = content_types
        data["summary_title"] = summary_title
        data["summary_preview"] = summary_preview

        return data


class JobSerializer(serializers.ModelSerializer):
    """Serializer for Job model."""

    generated_content = GeneratedContentSerializer(many=True, read_only=True)
    transcription_text = serializers.CharField(
        source="transcription.text", read_only=True
    )
    transcription_words = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            "id",
            "user_id",
            "filename",
            "file_size_bytes",
            "file_type",
            "storage_url",
            "material_types",
            "options",
            "status",
            "transcription_text",
            "transcription_words",
            "progress",
            "current_step",
            "error_message",
            "created_at",
            "started_at",
            "completed_at",
            "completed_at",
            "generated_content",
        ]
    
    def get_transcription_words(self, obj):
        """Extract word-level timestamps from AssemblyAI response."""
        if not hasattr(obj, 'transcription') or not obj.transcription:
            return None
        
        raw_response = obj.transcription.raw_response
        if not raw_response or not isinstance(raw_response, dict):
            return None
        
        words = raw_response.get('words', [])
        if not words:
            return None
        
        # Convert timestamps from milliseconds to seconds and format for frontend
        return [
            {
                'text': word.get('text', ''),
                'start': word.get('start', 0) / 1000,  # Convert ms to seconds
                'end': word.get('end', 0) / 1000,  # Convert ms to seconds
                'confidence': word.get('confidence', 0),
            }
            for word in words
        ]
    read_only_fields = [
        "id",
        "storage_url",
        "status",
        "progress",
        "current_step",
        "error_message",
        "created_at",
        "started_at",
        "completed_at",
    ]


class ProcessUploadSerializer(serializers.Serializer):
    """Serializer for file upload request."""

    file = serializers.FileField()
    material_types = serializers.JSONField()  # Accepts JSON string or list
    options = serializers.JSONField(required=False, default=dict)

    def validate_material_types(self, value):
        """Ensure at least one material type selected."""
        if not value:
            raise serializers.ValidationError("Must select at least one material type")
        return value
