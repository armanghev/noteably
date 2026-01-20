"""Serializers for export functionality."""
from rest_framework import serializers


class ExportRequestSerializer(serializers.Serializer):
    """Serializer for export request."""
    
    job_id = serializers.UUIDField(required=True)
    format = serializers.ChoiceField(
        choices=['markdown', 'json', 'pdf'],
        required=True
    )
    material_types = serializers.ListField(
        child=serializers.ChoiceField(choices=['summary', 'notes', 'flashcards', 'quiz', 'quizzes']),
        required=False,
        allow_empty=True
    )
    options = serializers.DictField(required=False, default=dict)
    
    def validate_options(self, value):
        """Validate options dict."""
        allowed_options = ['include_transcript', 'include_metadata']
        return {k: v for k, v in value.items() if k in allowed_options}


class ExportResponseSerializer(serializers.Serializer):
    """Serializer for export response."""
    
    download_url = serializers.URLField()
    file_name = serializers.CharField()
    file_size = serializers.IntegerField()
    expires_at = serializers.DateTimeField()
