"""Utilities for API key generation and hashing."""

import hashlib
import secrets


def generate_api_key_prefix() -> str:
    """Generate a random 8-character prefix."""
    return secrets.token_urlsafe(6)[:8]


def generate_secret_key() -> str:
    """Generate a random 32-character secret key."""
    return secrets.token_urlsafe(32)


def hash_key(key: str) -> str:
    """Hash the API key using SHA-256."""
    return hashlib.sha256(key.encode()).hexdigest()


def generate_full_key_string(prefix: str, secret: str) -> str:
    """Combine prefix and secret into full key string."""
    return f"sk_{prefix}.{secret}"


def split_key_string(key_string: str) -> tuple[str, str] | None:
    """
    Split full key string into prefix and secret.
    Expected format: sk_<prefix>.<secret>
    """
    if not key_string.startswith("sk_"):
        return None

    try:
        # Remove sk_ prefix
        content = key_string[3:]
        prefix, secret = content.split(".", 1)
        return prefix, secret
    except ValueError:
        return None
