"""Token encryption for cloud connection credentials."""

import base64
import logging
import os

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)


def _get_fernet() -> Fernet:
    """Get Fernet instance from CLOUD_TOKEN_ENCRYPTION_KEY or derive from SECRET_KEY."""
    key = os.getenv("CLOUD_TOKEN_ENCRYPTION_KEY")
    if key:
        # Key must be 32 url-safe base64-encoded bytes
        try:
            return Fernet(key.encode() if isinstance(key, str) else key)
        except Exception as e:
            logger.warning(f"Invalid CLOUD_TOKEN_ENCRYPTION_KEY, falling back to derived key: {e}")
    # Derive from SECRET_KEY (less ideal for rotation but works for dev)
    secret = os.getenv("SECRET_KEY", "django-insecure-dev-key")
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"noteably_cloud_tokens",
        iterations=100000,
    )
    derived = base64.urlsafe_b64encode(kdf.derive(secret.encode()))
    return Fernet(derived)


def encrypt_token(plain: str) -> str:
    """Encrypt a token for storage. Returns base64-encoded ciphertext."""
    if not plain:
        return ""
    try:
        f = _get_fernet()
        return f.encrypt(plain.encode()).decode()
    except Exception as e:
        logger.error(f"Token encryption failed: {e}")
        raise


def decrypt_token(cipher: str) -> str:
    """Decrypt a stored token. Returns plaintext."""
    if not cipher:
        return ""
    try:
        f = _get_fernet()
        return f.decrypt(cipher.encode()).decode()
    except InvalidToken:
        logger.warning("Token decryption failed: invalid or corrupted token")
        raise
    except Exception as e:
        logger.error(f"Token decryption failed: {e}")
        raise
