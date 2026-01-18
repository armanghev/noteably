from rest_framework import serializers

from .models import GeneratedContent


class GeneratedContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedContent
        fields = ["id", "type", "content", "created_at"]
