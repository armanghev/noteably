"""Models for user accounts."""

import uuid

from django.db import models


class APIKey(models.Model):
    """
    API Keys for programmatic access (e.g., ESP32).
    Stored as partial key (prefix) and hashed secret for security.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.UUIDField(editable=False, db_index=True, null=True, blank=True)

    name = models.CharField(max_length=100, help_text="Friendly name for the key")
    prefix = models.CharField(
        max_length=8, help_text="First 8 chars of key for lookup", db_index=True
    )
    hashed_key = models.CharField(
        max_length=64, help_text="SHA-256 hash of the secret part"
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "api_keys"
        ordering = ["-created_at"]
        verbose_name = "API Key"
        verbose_name_plural = "API Keys"

    def __str__(self):
        return f"{self.name} (sk_{self.prefix}...)"
