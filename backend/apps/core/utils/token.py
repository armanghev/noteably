"""
Utility functions for generating and verifying signed recovery tokens.

Recovery tokens are used for account deletion recovery and other secure operations
that require a tamper-proof, time-limited token with a payload.
"""

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from django.core.signing import BadSignature, TimestampSigner

logger = logging.getLogger(__name__)

# Recovery token validity: 14 days
RECOVERY_TOKEN_MAX_AGE_SECONDS = 14 * 24 * 60 * 60


def generate_recovery_token(user_id: UUID) -> str:
    """
    Generate a signed recovery token valid for 14 days.

    Args:
        user_id: The user's UUID

    Returns:
        A signed token string that can be transmitted in URLs or query params
    """
    signer = TimestampSigner()
    payload = {
        "user_id": str(user_id),
        "recovery_type": "account_deletion",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    token = signer.sign_object(payload)
    logger.info(f"Generated recovery token for user {user_id}")
    return token


def verify_recovery_token(token: str) -> dict:
    """
    Verify and return recovery token payload if valid.

    The token is checked for:
    - Valid signature (tamper detection)
    - Not expired (14-day max age)
    - Correct recovery_type

    Args:
        token: The signed token string to verify

    Returns:
        A dict with keys:
        - user_id: The user's UUID as a string
        - recovery_type: Always "account_deletion" for this flow
        - created_at: ISO format timestamp when token was created
        - remaining_days: Days left before token expires (0 if expired)

    Raises:
        BadSignature: If token is invalid, tampered, or expired
    """
    signer = TimestampSigner()
    try:
        payload = signer.unsign_object(token, max_age=RECOVERY_TOKEN_MAX_AGE_SECONDS)

        # Calculate remaining days
        # Note: signer.timestamp() returns the timestamp from when the object was signed
        signed_timestamp = signer.timestamp()
        age_seconds = int(datetime.now(timezone.utc).timestamp()) - signed_timestamp
        remaining_seconds = RECOVERY_TOKEN_MAX_AGE_SECONDS - age_seconds
        remaining_days = max(0, remaining_seconds // (24 * 60 * 60))

        payload["remaining_days"] = remaining_days
        return payload

    except BadSignature as e:
        logger.warning(f"Invalid recovery token: {e}")
        raise BadSignature(f"Invalid or expired recovery token: {e}")
    except Exception as e:
        logger.error(f"Error verifying recovery token: {e}")
        raise BadSignature(f"Invalid or expired recovery token: {e}")
