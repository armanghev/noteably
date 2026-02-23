"""OAuth configuration and token exchange for cloud providers."""

import base64
import hmac
import hashlib
import json
import logging
import os
import secrets
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Any

import requests

from django.conf import settings

from .models import CloudConnection

logger = logging.getLogger(__name__)

PROVIDERS = ("google_drive", "dropbox")


def _get_base_url() -> str:
    """Backend base URL for OAuth redirects."""
    return os.getenv("API_BASE_URL", "http://localhost:8000").rstrip("/")


def _make_state(user_id: str, next_url: str) -> str:
    """Create signed state payload for OAuth (user_id + next URL)."""
    payload = {"u": str(user_id), "n": next_url or "/upload", "r": secrets.token_hex(16)}
    raw = json.dumps(payload, sort_keys=True)
    sig = hmac.new(
        settings.SECRET_KEY.encode(),
        raw.encode(),
        hashlib.sha256,
    ).hexdigest()
    blob = {"p": payload, "s": sig}
    return base64.urlsafe_b64encode(json.dumps(blob).encode()).decode()


def _parse_state(state: str) -> tuple[str, str] | None:
    """Parse and validate state. Returns (user_id, next_url) or None if invalid."""
    try:
        blob = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
        payload, sig = blob.get("p"), blob.get("s")
        if not payload or not sig:
            return None
        raw = json.dumps(payload, sort_keys=True)
        expected = hmac.new(
            settings.SECRET_KEY.encode(),
            raw.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        if "u" in payload and "n" in payload:
            return (payload["u"], payload.get("n", "/upload"))
    except Exception as e:
        logger.warning(f"Invalid OAuth state: {e}")
    return None


# --- Google Drive ---

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
]


def get_google_connect_url(user_id: str, next_url: str) -> str:
    """Build Google OAuth authorization URL."""
    client_id = os.getenv("GOOGLE_DRIVE_CLIENT_ID")
    if not client_id:
        raise ValueError("GOOGLE_DRIVE_CLIENT_ID not configured")
    params = {
        "client_id": client_id,
        "redirect_uri": f"{_get_base_url()}/api/cloud/callback/google/",
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "state": _make_state(user_id, next_url),
        "access_type": "offline",
        "prompt": "consent",
    }
    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"


def exchange_google_code(code: str) -> dict[str, Any]:
    """Exchange Google authorization code for tokens."""
    client_id = os.getenv("GOOGLE_DRIVE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_DRIVE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise ValueError("GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET required")
    resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": f"{_get_base_url()}/api/cloud/callback/google/",
            "grant_type": "authorization_code",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    expires_in = data.get("expires_in", 3600)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token"),
        "expires_at": expires_at,
    }


def refresh_google_token(conn: CloudConnection) -> None:
    """Refresh Google access token and save to connection."""
    client_id = os.getenv("GOOGLE_DRIVE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_DRIVE_CLIENT_SECRET")
    if not conn.refresh_token:
        raise ValueError("No refresh token for Google Drive")
    resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": conn.refresh_token,
            "grant_type": "refresh_token",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    expires_in = data.get("expires_in", 3600)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    conn.set_tokens(
        access_token=data["access_token"],
        refresh_token=conn.refresh_token,
        expires_at=expires_at,
    )
    conn.save(update_fields=["_access_token", "expires_at", "updated_at"])


# --- Dropbox ---

DROPBOX_AUTH_URL = "https://www.dropbox.com/oauth2/authorize"
DROPBOX_TOKEN_URL = "https://api.dropboxapi.com/oauth2/token"
DROPBOX_SCOPES = ["files.content.read", "files.metadata.read", "account_info.read"]


def get_dropbox_connect_url(user_id: str, next_url: str) -> str:
    """Build Dropbox OAuth authorization URL."""
    client_id = os.getenv("DROPBOX_CLIENT_ID")
    if not client_id:
        raise ValueError("DROPBOX_CLIENT_ID not configured")
    params = {
        "client_id": client_id,
        "redirect_uri": f"{_get_base_url()}/api/cloud/callback/dropbox/",
        "response_type": "code",
        "token_access_type": "offline",
        "scope": " ".join(DROPBOX_SCOPES),
        "state": _make_state(user_id, next_url),
    }
    return f"{DROPBOX_AUTH_URL}?{urllib.parse.urlencode(params)}"


def exchange_dropbox_code(code: str) -> dict[str, Any]:
    """Exchange Dropbox authorization code for tokens."""
    client_id = os.getenv("DROPBOX_CLIENT_ID")
    client_secret = os.getenv("DROPBOX_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise ValueError("DROPBOX_CLIENT_ID and DROPBOX_CLIENT_SECRET required")
    resp = requests.post(
        DROPBOX_TOKEN_URL,
        data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": f"{_get_base_url()}/api/cloud/callback/dropbox/",
            "grant_type": "authorization_code",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    # Dropbox tokens don't expire by default; use 4h from now if not provided
    expires_in = data.get("expires_in") or 14400
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token"),
        "expires_at": expires_at,
    }


def refresh_dropbox_token(conn: CloudConnection) -> None:
    """Refresh Dropbox access token. Dropbox uses short-lived tokens with refresh."""
    # Dropbox v2 uses different refresh flow - check their docs
    # For now, if no refresh_token we can't refresh; user must reconnect
    client_id = os.getenv("DROPBOX_CLIENT_ID")
    client_secret = os.getenv("DROPBOX_CLIENT_SECRET")
    if not conn.refresh_token:
        raise ValueError("No refresh token for Dropbox")
    resp = requests.post(
        "https://api.dropboxapi.com/oauth2/token",
        data={
            "grant_type": "refresh_token",
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": conn.refresh_token,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    expires_in = data.get("expires_in") or 14400
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    conn.set_tokens(
        access_token=data["access_token"],
        refresh_token=data.get("refresh_token") or conn.refresh_token,
        expires_at=expires_at,
    )
    conn.save(update_fields=["_access_token", "_refresh_token", "expires_at", "updated_at"])
