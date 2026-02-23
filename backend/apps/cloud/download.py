"""Download files from cloud providers (Google Drive, Dropbox)."""

import json
import logging
from typing import Tuple

import requests

from apps.core.error_handler import retry_with_backoff

from .models import CloudConnection
from .providers import refresh_dropbox_token, refresh_google_token

logger = logging.getLogger(__name__)

# MIME to extension mapping for allowed types
MIME_TO_EXT = {
    "application/pdf": "pdf",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "text/plain": "txt",
    "text/markdown": "md",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
}

ALLOWED_EXTENSIONS = {"mp3", "wav", "pdf", "txt", "md", "mp4", "mov"}


def _ensure_token_valid(conn: CloudConnection) -> None:
    """Refresh token if expired (with 5 min buffer)."""
    from datetime import datetime, timedelta, timezone

    if conn.expires_at and conn.expires_at <= datetime.now(timezone.utc) + timedelta(minutes=5):
        if conn.provider == "google_drive":
            refresh_google_token(conn)
        elif conn.provider == "dropbox":
            refresh_dropbox_token(conn)


def _ext_from_mime(mime: str) -> str | None:
    """Get allowed extension from MIME type."""
    return MIME_TO_EXT.get(mime.lower() if mime else "")


def _ensure_filename_extension(filename: str, content_type: str) -> str:
    """Ensure filename has a valid extension; add from content_type if missing."""
    if not filename:
        ext = _ext_from_mime(content_type)
        return f"file.{ext}" if ext else "file"
    if "." in filename:
        ext = filename.split(".")[-1].lower()
        if ext in ALLOWED_EXTENSIONS:
            return filename
    ext = _ext_from_mime(content_type)
    if ext:
        base = filename.rsplit(".", 1)[0] if "." in filename else filename
        return f"{base}.{ext}"
    return filename


@retry_with_backoff(max_attempts=3)
def download_from_google_drive(conn: CloudConnection, file_id: str) -> Tuple[bytes, str, str]:
    """Download file from Google Drive. Returns (bytes, filename, content_type)."""
    _ensure_token_valid(conn)
    # Get metadata first for filename and mime
    meta_resp = requests.get(
        f"https://www.googleapis.com/drive/v3/files/{file_id}",
        params={"fields": "name,mimeType"},
        headers={"Authorization": f"Bearer {conn.access_token}"},
        timeout=30,
    )
    meta_resp.raise_for_status()
    meta = meta_resp.json()
    name = meta.get("name", "file")
    mime = meta.get("mimeType", "application/octet-stream")

    # Google Workspace types we don't support
    if mime and "vnd.google-apps" in mime:
        raise ValueError(f"Google Docs/Sheets/Slides are not supported. Please upload a file (PDF, MP3, etc.).")

    ext = _ext_from_mime(mime)
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"File type not supported. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    filename = _ensure_filename_extension(name, mime)

    # Download content
    dl_resp = requests.get(
        f"https://www.googleapis.com/drive/v3/files/{file_id}",
        params={"alt": "media"},
        headers={"Authorization": f"Bearer {conn.access_token}"},
        timeout=120,
        stream=True,
    )
    dl_resp.raise_for_status()
    content = dl_resp.content

    return (content, filename, mime or "application/octet-stream")


@retry_with_backoff(max_attempts=3)
def download_from_dropbox(conn: CloudConnection, file_id_or_path: str) -> Tuple[bytes, str, str]:
    """
    Download file from Dropbox.
    file_id_or_path: Dropbox file ID (e.g. id:xxx) or path (e.g. /path/to/file.pdf)
    """
    _ensure_token_valid(conn)
    # Dropbox API v2: /files/download
    # Can use path or id
    if file_id_or_path.startswith("id:"):
        arg = {"path": file_id_or_path}
    else:
        arg = {"path": file_id_or_path if file_id_or_path.startswith("/") else f"/{file_id_or_path}"}

    resp = requests.post(
        "https://content.dropboxapi.com/2/files/download",
        headers={
            "Authorization": f"Bearer {conn.access_token}",
            "Dropbox-API-Arg": json.dumps(arg),
        },
        timeout=120,
    )
    resp.raise_for_status()

    # Filename from path or Dropbox-API-Result
    path = arg.get("path", "")
    name = path.rsplit("/", 1)[-1] if isinstance(path, str) and "/" in path else "file"
    api_result = resp.headers.get("Dropbox-API-Result")
    if api_result:
        try:
            meta = json.loads(api_result)
            name = meta.get("name", name)
        except json.JSONDecodeError:
            pass

    # Dropbox may not return mime in download; infer from name
    ext = name.split(".")[-1].lower() if "." in name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"File type not supported. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    mime_map = {"pdf": "application/pdf", "mp3": "audio/mpeg", "wav": "audio/wav", "txt": "text/plain", "mp4": "video/mp4", "mov": "video/quicktime"}
    content_type = mime_map.get(ext, "application/octet-stream")

    return (resp.content, name, content_type)


def download_from_dropbox_link(link: str) -> Tuple[bytes, str, str]:
    """
    Download file from Dropbox Chooser temporary link.
    Used when frontend uses Dropbox Chooser (no stored OAuth).
    """
    resp = requests.get(link, timeout=120)
    resp.raise_for_status()
    content = resp.content

    # Filename from Content-Disposition
    name = "file"
    cd = resp.headers.get("Content-Disposition")
    if cd and "filename" in cd.lower():
        for part in cd.split(";"):
            part = part.strip()
            if part.lower().startswith("filename"):
                name = part.split("=", 1)[-1].strip('"\'')
                break

    ext = name.split(".")[-1].lower() if "." in name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"File type not supported. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    mime_map = {
        "pdf": "application/pdf",
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "txt": "text/plain",
        "mp4": "video/mp4",
        "mov": "video/quicktime",
    }
    content_type = mime_map.get(ext, "application/octet-stream")
    return (content, name, content_type)


def download_from_provider(
    provider: str, file_id: str, conn: CloudConnection
) -> Tuple[bytes, str, str]:
    """Dispatch to provider-specific download. Returns (bytes, filename, content_type)."""
    if provider == "google_drive":
        return download_from_google_drive(conn, file_id)
    if provider == "dropbox":
        return download_from_dropbox(conn, file_id)
    raise ValueError(f"Unknown provider: {provider}")
