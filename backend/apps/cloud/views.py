"""Views for cloud storage OAuth and connections."""

import logging
import os

from django.shortcuts import redirect
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.accounts.permissions import IsAuthenticated
from apps.core.throttling import UploadRateThrottle

from .encryption import encrypt_token
from .models import CloudConnection
from .providers import (
    PROVIDERS,
    _parse_state,
    exchange_dropbox_code,
    exchange_google_code,
    get_dropbox_connect_url,
    get_google_connect_url,
)

logger = logging.getLogger(__name__)

FRONTEND_BASE = "http://localhost:5173"  # Override with env


def _frontend_url(path: str) -> str:
    """Build frontend URL for redirect after OAuth."""
    base = os.environ.get("FRONTEND_URL", FRONTEND_BASE)
    return f"{base.rstrip('/')}{path}"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def connect(request, provider: str):
    """
    Initiate OAuth flow for a cloud provider.
    Redirects to provider's authorization URL.
    Query params: next (optional) - path to redirect after (e.g. /upload, /profile)
    """
    if provider not in PROVIDERS:
        return Response({"error": "Invalid provider"}, status=status.HTTP_400_BAD_REQUEST)

    next_url = request.query_params.get("next", "/upload")
    # Sanitize next to prevent open redirect
    if not next_url.startswith("/"):
        next_url = "/upload"

    user_id = str(request.user_id)
    try:
        if provider == "google_drive":
            url = get_google_connect_url(user_id, next_url)
        elif provider == "dropbox":
            url = get_dropbox_connect_url(user_id, next_url)
        else:
            return Response({"error": "Invalid provider"}, status=status.HTTP_400_BAD_REQUEST)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return redirect(url)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def connect_url(request, provider: str):
    """
    Return the OAuth redirect URL for a provider (for frontend to use with fetch + JWT).
    Frontend fetches this (with auth), then redirects to the returned URL.
    """
    if provider not in PROVIDERS:
        return Response({"error": "Invalid provider"}, status=status.HTTP_400_BAD_REQUEST)

    next_url = request.query_params.get("next", "/upload")
    if not next_url.startswith("/"):
        next_url = "/upload"

    user_id = str(request.user_id)
    try:
        if provider == "google_drive":
            url = get_google_connect_url(user_id, next_url)
        elif provider == "dropbox":
            url = get_dropbox_connect_url(user_id, next_url)
        else:
            return Response({"error": "Invalid provider"}, status=status.HTTP_400_BAD_REQUEST)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response({"redirect_url": url})


# OAuth redirect URLs use "google" but we store "google_drive"
_PROVIDER_ALIASES = {"google": "google_drive"}


@api_view(["GET"])
@permission_classes([AllowAny])
def callback(request, provider: str):
    """
    OAuth callback - receives code from provider, exchanges for tokens, stores, redirects.
    No auth required (user comes from state).
    """
    provider = _PROVIDER_ALIASES.get(provider, provider)
    if provider not in PROVIDERS:
        return redirect(_frontend_url("/profile?error=invalid_provider"))

    code = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")

    if error:
        logger.warning(f"OAuth error from {provider}: {error}")
        return redirect(_frontend_url(f"/profile?error=oauth_denied&provider={provider}"))

    if not code or not state:
        return redirect(_frontend_url("/profile?error=missing_code_or_state"))

    parsed = _parse_state(state)
    if not parsed:
        logger.warning("Invalid OAuth state")
        return redirect(_frontend_url("/profile?error=invalid_state"))

    user_id, next_url = parsed

    try:
        if provider == "google_drive":
            tokens = exchange_google_code(code)
        elif provider == "dropbox":
            tokens = exchange_dropbox_code(code)
        else:
            return redirect(_frontend_url("/profile?error=invalid_provider"))

        conn, created = CloudConnection.objects.update_or_create(
            user_id=user_id,
            provider=provider,
            defaults={
                "_access_token": encrypt_token(tokens.get("access_token", "")),
                "_refresh_token": encrypt_token(tokens.get("refresh_token")) if tokens.get("refresh_token") else None,
                "expires_at": tokens.get("expires_at"),
            },
        )

        logger.info(f"Cloud connection {'created' if created else 'updated'} for {provider} user {user_id}")
    except Exception as e:
        logger.exception(f"OAuth token exchange failed for {provider}: {e}")
        return redirect(_frontend_url(f"/profile?error=oauth_failed&provider={provider}"))

    return redirect(_frontend_url(next_url))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_connections(request):
    """Return which providers the current user has connected."""
    conns = list(
        CloudConnection.objects.filter(user_id=str(request.user_id)).values_list("provider", flat=True)
    )
    result = [{"provider": p, "connected": True, "chooser_only": False} for p in conns if p in PROVIDERS]
    # Dropbox uses Chooser (no OAuth), so always show as connected
    if "dropbox" not in conns:
        result.append({"provider": "dropbox", "connected": True, "chooser_only": True})
    return Response(result)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def disconnect(request, provider: str):
    """Remove a cloud connection."""
    if provider not in PROVIDERS:
        return Response({"error": "Invalid provider"}, status=status.HTTP_400_BAD_REQUEST)

    deleted, _ = CloudConnection.objects.filter(
        user_id=str(request.user_id),
        provider=provider,
    ).delete()

    if not deleted:
        return Response({"error": "Connection not found"}, status=status.HTTP_404_NOT_FOUND)

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def picker_token(request, provider: str):
    """
    Return access token for opening the provider's file picker in the browser.
    Token is short-lived; frontend uses it only to initialize the picker.
    """
    if provider not in PROVIDERS:
        return Response({"error": "Invalid provider"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        conn = CloudConnection.objects.get(user_id=str(request.user_id), provider=provider)
    except CloudConnection.DoesNotExist:
        return Response(
            {"error": "Not connected. Connect your account first."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    from .download import _ensure_token_valid

    try:
        _ensure_token_valid(conn)
    except Exception as e:
        logger.warning(f"Token refresh failed for {provider}: {e}")
        return Response(
            {"error": "Reconnect to refresh access."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    return Response({"access_token": conn.access_token})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([UploadRateThrottle])
def cloud_import(request):
    """
    Import a file from cloud storage and process it like a direct upload.
    Body: { provider, file_id, material_types, options? }
    """
    from django.core.files.uploadedfile import SimpleUploadedFile

    from apps.ingestion.models import Job
    from apps.ingestion.quota import check_user_quota
    from apps.ingestion.r2_storage import upload_to_r2
    from apps.ingestion.tasks import orchestrate_job_task
    from apps.ingestion.validators import get_file_duration, validate_file_size, validate_file_type

    provider = request.data.get("provider")
    file_id = request.data.get("file_id")
    file_link = request.data.get("file_link")  # Dropbox Chooser returns temporary link
    material_types = request.data.get("material_types", [])
    options = request.data.get("options", {})

    if not provider or provider not in PROVIDERS:
        return Response({"error": "Invalid provider"}, status=status.HTTP_400_BAD_REQUEST)
    if not file_id and not (provider == "dropbox" and file_link):
        return Response(
            {"error": "file_id required (or file_link for Dropbox)"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not material_types:
        return Response({"error": "material_types required"}, status=status.HTTP_400_BAD_REQUEST)

    # Dropbox Chooser: can use file_link without stored connection
    if provider == "dropbox" and file_link:
        conn = None
    else:
        try:
            conn = CloudConnection.objects.get(
                user_id=str(request.user_id), provider=provider
            )
        except CloudConnection.DoesNotExist:
            return Response(
                {"error": "Not connected. Connect your account first."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

    from .download import download_from_provider, download_from_dropbox_link

    try:
        if provider == "dropbox" and file_link:
            content, filename, content_type = download_from_dropbox_link(file_link)
        else:
            content, filename, content_type = download_from_provider(
                provider, file_id or "", conn
            )
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception(f"Cloud download failed for {provider}: {e}")
        return Response(
            {"error": "Could not download file. It may have been moved or deleted."},
            status=status.HTTP_404_NOT_FOUND,
        )

    file_obj = SimpleUploadedFile(
        name=filename,
        content=content,
        content_type=content_type,
    )

    try:
        validate_file_type(file_obj)
        validate_file_size(file_obj, 100)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    duration = get_file_duration(file_obj)
    check_user_quota(request.user_id, duration, file_obj.size / (1024 * 1024))

    job = Job.objects.create(
        user_id=request.user_id,
        filename=filename,
        file_size_bytes=file_obj.size,
        file_type=content_type,
        storage_url="",
        material_types=material_types,
        options=options,
        status="uploading",
    )

    try:
        storage_url = upload_to_r2(
            content,
            filename,
            job_id=str(job.id),
            content_type=content_type,
            subfolder="upload",
        )
        job.storage_url = storage_url
        job.status = "queued"
        job.save(update_fields=["storage_url", "status"])
    except Exception as e:
        logger.error(f"Upload failed for job {job.id}: {e}")
        job.status = "failed"
        job.error_message = f"Upload failed: {str(e)}"
        job.save()
        return Response(
            {"error": f"Upload failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if isinstance(request.user, dict):
        user_email = request.user.get("email")
    else:
        user_email = getattr(request.user, "email", None)

    orchestrate_job_task.delay(str(job.id), user_email=user_email)

    return Response(
        {
            "job_id": str(job.id),
            "status": job.status,
            "estimated_time": job.estimate_processing_time(),
        },
        status=status.HTTP_201_CREATED,
    )
