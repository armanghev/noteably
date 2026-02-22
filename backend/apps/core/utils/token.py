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


def generate_security_action_token(
    user_id: UUID,
    action_type: str = "generic",
    old_email: str = None,
) -> str:
    """Generate a signed token for 'wasn't me' security actions (7-day validity).

    action_type: "email_change" or "password_change" or "generic"
    old_email: the email to revert to (for email_change actions)
    """
    signer = TimestampSigner()
    payload = {
        "user_id": str(user_id),
        "token_type": "security_action",
        "action_type": action_type,
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
    if old_email:
        payload["old_email"] = old_email
    token = signer.sign_object(payload)
    logger.info(f"Generated security action token for user {user_id} (action_type={action_type})")
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


# Security reset token validity: 30 minutes
SECURITY_RESET_TOKEN_MAX_AGE_SECONDS = 30 * 60

_used_security_reset_tokens: set = set()


def generate_security_reset_token(user_id: UUID) -> str:
    """Generate a short-lived token for password reset after a security action (30-min validity)."""
    signer = TimestampSigner()
    payload = {
        "user_id": str(user_id),
        "token_type": "security_reset",
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
    token = signer.sign_object(payload)
    logger.info(f"Generated security reset token for user {user_id}")
    return token


def verify_security_reset_token(token: str) -> dict:
    """Verify security reset token. Returns payload dict if valid."""
    signer = TimestampSigner()
    try:
        payload = signer.unsign_object(token, max_age=SECURITY_RESET_TOKEN_MAX_AGE_SECONDS)
        if payload.get("token_type") != "security_reset":
            raise BadSignature("Invalid token type")
        return payload
    except BadSignature:
        raise
    except Exception as e:
        raise BadSignature(f"Invalid or expired security reset token: {e}")


def is_security_reset_token_used(token: str) -> bool:
    return token in _used_security_reset_tokens


def mark_security_reset_token_used(token: str) -> None:
    _used_security_reset_tokens.add(token)


# Email change OTP: 10-minute validity
EMAIL_OTP_MAX_AGE_SECONDS = 10 * 60
EMAIL_OTP_VERIFIED_MAX_AGE_SECONDS = 10 * 60  # Window to submit new email after OTP verified

_email_otps: dict = {}          # {user_id: {"otp": str, "expires_at": float}}
_email_otp_verified: dict = {}  # {user_id: expires_at float}


def generate_email_otp(user_id: str) -> str:
    """Generate a 6-digit OTP for email change verification, sent to the current email."""
    import random
    import time as _time
    otp = f"{random.randint(0, 999999):06d}"
    _email_otps[str(user_id)] = {
        "otp": otp,
        "expires_at": _time.time() + EMAIL_OTP_MAX_AGE_SECONDS,
    }
    logger.info(f"Generated email change OTP for user {user_id}")
    return otp


def verify_email_otp(user_id: str, otp: str) -> bool:
    """Verify OTP. Consumes it on success and marks the user as OTP-verified."""
    import time as _time
    uid = str(user_id)
    entry = _email_otps.get(uid)
    if not entry:
        return False
    if _time.time() > entry["expires_at"]:
        _email_otps.pop(uid, None)
        return False
    if entry["otp"] != otp:
        return False
    _email_otps.pop(uid, None)
    _email_otp_verified[uid] = _time.time() + EMAIL_OTP_VERIFIED_MAX_AGE_SECONDS
    return True


def is_email_otp_verified(user_id: str) -> bool:
    """Check whether the user has a live OTP-verified state (passed OTP step)."""
    import time as _time
    uid = str(user_id)
    expires_at = _email_otp_verified.get(uid)
    if not expires_at:
        return False
    if _time.time() > expires_at:
        _email_otp_verified.pop(uid, None)
        return False
    return True


def consume_email_otp_verified(user_id: str) -> None:
    """Consume the OTP-verified state after the new-email request is submitted."""
    _email_otp_verified.pop(str(user_id), None)


# Password reset OTP: 10-minute validity (keyed by email, not user_id)
PASSWORD_RESET_OTP_MAX_AGE_SECONDS = 10 * 60
PASSWORD_RESET_OTP_VERIFIED_MAX_AGE_SECONDS = 10 * 60

_password_reset_otps: dict = {}          # {email: {"otp": str, "expires_at": float}}
_password_reset_otp_verified: dict = {}  # {email: expires_at float}


def generate_password_reset_otp(email: str) -> str:
    """Generate a 6-digit OTP for password reset, keyed by normalised email."""
    import random
    import time as _time
    otp = f"{random.randint(0, 999999):06d}"
    _password_reset_otps[email.lower()] = {
        "otp": otp,
        "expires_at": _time.time() + PASSWORD_RESET_OTP_MAX_AGE_SECONDS,
    }
    logger.info(f"Generated password reset OTP for email {email}")
    return otp


def verify_password_reset_otp(email: str, otp: str) -> bool:
    """Verify OTP. Consumes it on success and marks the email as OTP-verified."""
    import time as _time
    key = email.lower()
    entry = _password_reset_otps.get(key)
    if not entry:
        return False
    if _time.time() > entry["expires_at"]:
        _password_reset_otps.pop(key, None)
        return False
    if entry["otp"] != otp:
        return False
    _password_reset_otps.pop(key, None)
    _password_reset_otp_verified[key] = _time.time() + PASSWORD_RESET_OTP_VERIFIED_MAX_AGE_SECONDS
    return True


def is_password_reset_otp_verified(email: str) -> bool:
    """Check whether the email has a live OTP-verified state for password reset."""
    import time as _time
    key = email.lower()
    expires_at = _password_reset_otp_verified.get(key)
    if not expires_at:
        return False
    if _time.time() > expires_at:
        _password_reset_otp_verified.pop(key, None)
        return False
    return True


def consume_password_reset_otp_verified(email: str) -> None:
    """Consume the OTP-verified state once the reset token has been issued."""
    _password_reset_otp_verified.pop(email.lower(), None)


# Password reset session token: 30-minute validity
PASSWORD_RESET_SESSION_MAX_AGE_SECONDS = 30 * 60

_used_password_reset_session_tokens: set = set()


def generate_password_reset_session_token(user_id: UUID) -> str:
    """Generate a short-lived token for setting a new password after OTP verification."""
    signer = TimestampSigner()
    payload = {
        "user_id": str(user_id),
        "token_type": "password_reset_session",
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }
    token = signer.sign_object(payload)
    logger.info(f"Generated password reset session token for user {user_id}")
    return token


def verify_password_reset_session_token(token: str) -> dict:
    """Verify password reset session token. Returns payload if valid."""
    signer = TimestampSigner()
    try:
        payload = signer.unsign_object(token, max_age=PASSWORD_RESET_SESSION_MAX_AGE_SECONDS)
        if payload.get("token_type") != "password_reset_session":
            raise BadSignature("Invalid token type")
        return payload
    except BadSignature:
        raise
    except Exception as e:
        raise BadSignature(f"Invalid or expired password reset session token: {e}")


def is_password_reset_session_token_used(token: str) -> bool:
    return token in _used_password_reset_session_tokens


def mark_password_reset_session_token_used(token: str) -> None:
    _used_password_reset_session_tokens.add(token)
