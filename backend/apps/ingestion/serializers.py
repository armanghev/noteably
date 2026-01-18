"""DRF serializers for Job model."""

from apps.generation.serializers import GeneratedContentSerializer
from rest_framework import serializers

from .models import Job


class JobSerializer(serializers.ModelSerializer):
    """Serializer for Job model."""

    generated_content = GeneratedContentSerializer(many=True, read_only=True)
    transcription_text = serializers.CharField(
        source="transcription.text", read_only=True
    )

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
            "progress",
            "current_step",
            "error_message",
            "created_at",
            "started_at",
            "completed_at",
            "completed_at",
            "generated_content",
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
