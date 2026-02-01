import logging

from apps.core.exceptions import InvalidFileError
from django.core.files.uploadedfile import UploadedFile

logger = logging.getLogger(__name__)

# Allowed file types
ALLOWED_AUDIO_TYPES = ["mp3", "wav", "m4a", "aac", "flac"]
ALLOWED_VIDEO_TYPES = ["mp4", "webm", "mov", "avi", "mkv"]
ALLOWED_DOCUMENT_TYPES = ["pdf", "txt", "md", "doc", "docx"]
ALLOWED_EXTENSIONS = ALLOWED_AUDIO_TYPES + ALLOWED_VIDEO_TYPES + ALLOWED_DOCUMENT_TYPES


def validate_file_type(file: UploadedFile) -> bool:
    ext = file.name.split(".")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise InvalidFileError(
            f"File type '{ext}' not supported. "
            f"Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    return True


def validate_file_size(file: UploadedFile, max_size_mb: int) -> bool:
    size_mb = file.size / (1024 * 1024)
    if size_mb > max_size_mb:
        raise InvalidFileError(
            f"File too large ({size_mb:.1f}MB). Max allowed: {max_size_mb}MB"
        )
    return True


def get_file_duration(file: UploadedFile) -> float:
    """
    Estimate audio/video duration in minutes.

    For now, uses size-based estimation since mutagen requires a file path.
    TODO: Improve with actual duration extraction after R2 upload.

    Returns:
        Duration in minutes (estimated)
    """
    # Quick estimate: ~1 MB = 1 minute of compressed audio/video
    # This is rough but good enough for quota checking
    size_mb = file.size / (1024 * 1024)
    estimated_minutes = size_mb

    logger.info(
        f"Estimated duration: {estimated_minutes:.1f} minutes (based on {size_mb:.1f}MB file size)"
    )
    return estimated_minutes
