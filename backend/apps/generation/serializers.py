from rest_framework import serializers

from .models import GeneratedContent, QuizAttempt


class GeneratedContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedContent
        fields = ["id", "type", "content", "created_at"]


class QuizAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = ["id", "job", "score", "total_questions", "percentage", "answers", "created_at"]
        read_only_fields = ["id", "created_at"]
