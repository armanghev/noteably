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


class UpdateProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=50, required=False)
    last_name = serializers.CharField(max_length=50, required=False)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate(self, data):
        if not data:
            raise serializers.ValidationError("At least one field must be provided.")
        return data


class VerifyEmailOTPSerializer(serializers.Serializer):
    otp = serializers.CharField(min_length=6, max_length=6, required=True)

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("OTP must be a 6-digit number.")
        return value


class ChangeEmailSerializer(serializers.Serializer):
    new_email = serializers.EmailField(required=True)

    def validate_new_email(self, value):
        return value.lower().strip()


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)

    def validate_new_password(self, value):
        from apps.accounts.views import validate_password_strength
        is_valid, error_msg = validate_password_strength(value)
        if not is_valid:
            raise serializers.ValidationError(error_msg)
        return value


class SetPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=True, write_only=True)

    def validate_new_password(self, value):
        from apps.accounts.views import validate_password_strength
        is_valid, error_msg = validate_password_strength(value)
        if not is_valid:
            raise serializers.ValidationError(error_msg)
        return value
