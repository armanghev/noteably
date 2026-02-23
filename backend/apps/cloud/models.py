"""Models for cloud storage connections."""

import uuid

from django.db import models

from .encryption import decrypt_token, encrypt_token


class CloudConnection(models.Model):
    """OAuth connection to a cloud storage provider (Google Drive, Dropbox)."""

    PROVIDER_CHOICES = [
        ("google_drive", "Google Drive"),
        ("dropbox", "Dropbox"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_id = models.UUIDField(db_index=True, editable=False)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, db_index=True)

    # Encrypted at rest
    _access_token = models.TextField(db_column="access_token")
    _refresh_token = models.TextField(db_column="refresh_token", null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cloud_connections"
        ordering = ["-created_at"]
        unique_together = [("user_id", "provider")]
        indexes = [
            models.Index(fields=["user_id", "provider"]),
        ]

    def __str__(self):
        return f"{self.provider} ({self.user_id})"

    @property
    def access_token(self) -> str:
        return decrypt_token(self._access_token)

    @access_token.setter
    def access_token(self, value: str):
        self._access_token = encrypt_token(value) if value else ""

    @property
    def refresh_token(self) -> str | None:
        if not self._refresh_token:
            return None
        return decrypt_token(self._refresh_token)

    @refresh_token.setter
    def refresh_token(self, value: str | None):
        self._refresh_token = encrypt_token(value) if value else None

    def set_tokens(self, access_token: str, refresh_token: str | None = None, expires_at=None):
        """Set tokens with encryption. Use this instead of direct assignment."""
        self._access_token = encrypt_token(access_token) if access_token else ""
        self._refresh_token = encrypt_token(refresh_token) if refresh_token else None
        if expires_at is not None:
            self.expires_at = expires_at
