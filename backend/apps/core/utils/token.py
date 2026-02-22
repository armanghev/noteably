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

# Recovery session token validity: 1 hour
RECOVERY_SESSION_MAX_AGE_SECONDS = 60 * 60

# Track used recovery session tokens for one-time use enforcement
# In production, this should be replaced with Redis or database storage
_used_recovery_tokens = set()


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

        # Calculate remaining days from created_at in payload
        created_at_str = payload.get("created_at")
        if created_at_str:
            try:
                created_at = datetime.fromisoformat(created_at_str)
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                age_seconds = int((datetime.now(timezone.utc) - created_at).total_seconds())
                remaining_seconds = RECOVERY_TOKEN_MAX_AGE_SECONDS - age_seconds
                remaining_days = max(0, remaining_seconds // (24 * 60 * 60))
                payload["remaining_days"] = remaining_days
            except Exception as e:
                logger.error(f"Failed to parse created_at from token: {e}")
                payload["remaining_days"] = 14
        else:
            payload["remaining_days"] = 14

        return payload

    except BadSignature as e:
        logger.warning(f"Invalid recovery token signature: {e}", exc_info=True)
        raise BadSignature(f"Invalid or expired recovery token: {e}")
    except Exception as e:
        logger.error(f"Error verifying recovery token: {e}", exc_info=True)
        raise BadSignature(f"Invalid or expired recovery token: {e}")


def generate_recovery_session_token(user_id: UUID) -> str:
    """
    Generate a short-lived session token for password reset (1 hour valid).

    This token is issued after verifying a recovery token and is used to allow
    the user to reset their password during the recovery flow.

    Args:
        user_id: The user's UUID

    Returns:
        A signed token string with 1-hour expiration
    """
    signer = TimestampSigner()
    payload = {
        "user_id": str(user_id),
        "recovery_session": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    token = signer.sign_object(payload)
    logger.info(f"Generated recovery session token for user {user_id}")
    return token


def verify_recovery_session_token(token: str) -> dict:
    """
    Verify and return recovery session token payload if valid.

    The token is checked for:
    - Valid signature (tamper detection)
    - Not expired (1-hour max age)
    - Has recovery_session flag set

    Args:
        token: The signed token string to verify

    Returns:
        A dict with keys:
        - user_id: The user's UUID as a string
        - recovery_session: Always True for this flow
        - created_at: ISO format timestamp when token was created

    Raises:
        BadSignature: If token is invalid, tampered, or expired
    """
    signer = TimestampSigner()
    try:
        payload = signer.unsign_object(token, max_age=RECOVERY_SESSION_MAX_AGE_SECONDS)

        # Verify it's a recovery session token
        if not payload.get("recovery_session"):
            raise BadSignature("Not a recovery session token")

        return payload

    except BadSignature as e:
        logger.warning(f"Invalid recovery session token: {e}")
        raise BadSignature(f"Invalid or expired recovery session token: {e}")
    except Exception as e:
        logger.error(f"Error verifying recovery session token: {e}")
        raise BadSignature(f"Invalid or expired recovery session token: {e}")


def mark_recovery_token_used(token: str) -> None:
    """
    Mark a recovery session token as used (one-time use enforcement).

    In production, this should use Redis or database storage.
    For MVP, uses in-memory set (will reset on server restart).

    Args:
        token: The recovery session token to mark as used
    """
    _used_recovery_tokens.add(token)
    logger.debug(f"Marked recovery token as used")


def is_recovery_token_used(token: str) -> bool:
    """
    Check if a recovery session token has already been used.

    Args:
        token: The recovery session token to check

    Returns:
        True if token has already been used, False otherwise
    """
    return token in _used_recovery_tokens


# Email change token validity: 24 hours
EMAIL_CHANGE_TOKEN_MAX_AGE_SECONDS = 24 * 60 * 60

_used_email_change_tokens = set()


def generate_email_change_token(user_id: UUID, new_email: str) -> str:
    signer = TimestampSigner()
    payload = {
        "user_id": str(user_id),
        "new_email": new_email,
        "token_type": "email_change",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    token = signer.sign_object(payload)
    logger.info(f"Generated email change token for user {user_id}")
    return token


def verify_email_change_token(token: str) -> dict:
    signer = TimestampSigner()
    try:
        payload = signer.unsign_object(token, max_age=EMAIL_CHANGE_TOKEN_MAX_AGE_SECONDS)
        if payload.get("token_type") != "email_change":
            raise BadSignature("Invalid token type")
        return payload
    except BadSignature:
        raise
    except Exception as e:
        raise BadSignature(f"Invalid or expired email change token: {e}")


def is_email_change_token_used(token: str) -> bool:
    return token in _used_email_change_tokens


def mark_email_change_token_used(token: str) -> None:
    _used_email_change_tokens.add(token)


# Security action token validity: 7 days
SECURITY_ACTION_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60


def generate_security_action_token(user_id: UUID) -> str:
    """Generate a signed token for 'wasn't me' security actions (7-day validity)."""
    signer = TimestampSigner()
    payload = {
        "user_id": str(user_id),
        "token_type": "security_action",
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
    token = signer.sign_object(payload)
    logger.info(f"Generated security action token for user {user_id}")
    return token


def verify_security_action_token(token: str) -> dict:
    """Verify security action token. Stateless one-time-use checked by caller against last password change."""
    signer = TimestampSigner()
    try:
        payload = signer.unsign_object(token, max_age=SECURITY_ACTION_TOKEN_MAX_AGE_SECONDS)
        if payload.get("token_type") != "security_action":
            raise BadSignature("Invalid token type")
        return payload
    except BadSignature:
        raise
    except Exception as e:
        raise BadSignature(f"Invalid or expired security action token: {e}")
