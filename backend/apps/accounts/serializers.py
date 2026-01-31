from rest_framework import serializers

from .models import APIKey


class APIKeySerializer(serializers.ModelSerializer):
    """
    Serializer for listing API keys.
    Does NOT return the sensitive hashed_key.
    """

    class Meta:
        model = APIKey
        fields = [
            "id",
            "name",
            "prefix",
            "created_at",
            "last_used_at",
            "is_active",
        ]
        read_only_fields = fields


class CreateAPIKeySerializer(serializers.Serializer):
    """
    Serializer for creating a new API key.
    """

    name = serializers.CharField(max_length=100)
