"""Cloudflare R2 Storage utilities for file uploads and management.

R2 is S3-compatible; we use boto3 with the R2 endpoint.
"""

import io
import logging
from typing import BinaryIO, Optional

import boto3
from botocore.exceptions import ClientError

from apps.core.error_handler import retry_with_backoff
from apps.core.exceptions import UploadError
from django.conf import settings

logger = logging.getLogger(__name__)

# Primary bucket for job uploads and exports
STORAGE_BUCKET = getattr(settings, "R2_BUCKET", "noteably-files")


def _r2_client():
    """Create boto3 S3 client configured for Cloudflare R2."""
    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT,
        aws_access_key_id=settings.R2_ACCESS_KEY,
        aws_secret_access_key=settings.R2_SECRET_KEY,
        region_name="auto",
    )


@retry_with_backoff(max_attempts=3)
def upload_to_r2(
    file: BinaryIO,
    filename: str,
    job_id: str,
    bucket: str = STORAGE_BUCKET,
    content_type: Optional[str] = None,
    subfolder: str = "upload",
) -> str:
    """
    Upload a file to R2 in the job's directory.

    Args:
        file: File-like object to upload
        filename: Name of the file
        job_id: Job UUID to organize files by job
        bucket: Bucket name (default from R2_BUCKET)
        content_type: MIME type of the file
        subfolder: Subfolder within job directory (e.g. 'upload', 'exports/markdown')

    Returns:
        Public URL of the uploaded file (R2_PUBLIC_URL + key)

    Raises:
        UploadError: If upload fails
    """
    try:
        key = f"{job_id}/{subfolder}/{filename}"

        if hasattr(file, "read"):
            file.seek(0)
            file_content = file.read()
        else:
            file_content = file

        s3 = _r2_client()
        s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=file_content,
            ContentType=content_type or "application/octet-stream",
        )

        base = (settings.R2_PUBLIC_URL or "").rstrip("/")
        return f"{base}/{key}" if base else key

    except ClientError as e:
        logger.error(f"R2 upload failed: {e}")
        raise UploadError(f"Failed to upload to R2: {e}")
    except Exception as e:
        logger.error(f"Error uploading to R2: {e}")
        raise UploadError(f"Failed to upload to R2: {str(e)}")


@retry_with_backoff(max_attempts=3)
def upload_bytes_to_r2(
    content: bytes,
    filename: str,
    job_id: str,
    bucket: str = STORAGE_BUCKET,
    content_type: Optional[str] = None,
    subfolder: str = "exports",
) -> str:
    """Upload bytes to R2 in the job's directory. Returns public URL."""
    file_obj = io.BytesIO(content)
    return upload_to_r2(
        file_obj, filename, job_id, bucket, content_type, subfolder
    )


def delete_from_r2(storage_url: str, bucket: str = STORAGE_BUCKET) -> bool:
    """Delete a single file from R2 by its full storage URL. Returns True if successful."""
    key = extract_key_from_url(storage_url, bucket)
    if not key:
        logger.warning(f"Could not extract key from URL: {storage_url}")
        return False
    try:
        s3 = _r2_client()
        s3.delete_object(Bucket=bucket, Key=key)
        return True
    except Exception as e:
        logger.error(f"Error deleting from R2: {e}")
        return False


def extract_key_from_url(
    storage_url: str, bucket: str = STORAGE_BUCKET
) -> Optional[str]:
    """
    Extract the object key from an R2 storage URL.

    R2 public URLs are typically: https://<R2_PUBLIC_URL>/<key>
    Key format: {job_id}/{subfolder}/{filename}
    """
    try:
        base = (getattr(settings, "R2_PUBLIC_URL", None) or "").rstrip("/")
        if base and storage_url.startswith(base):
            key_with_params = storage_url[len(base) :].lstrip("/")
            key = key_with_params.split("?")[0]
            return key if key else None
        # Fallback: if URL contains the bucket or looks like /job_id/..., take path after first /job_id/
        if f"/{bucket}/" in storage_url:
            parts = storage_url.split(f"/{bucket}/", 1)
            if len(parts) >= 2:
                return parts[1].split("?")[0]
        return None
    except Exception as e:
        logger.error(f"Error extracting key from URL: {e}")
        return None


def get_signed_url(
    key: str,
    bucket: str = STORAGE_BUCKET,
    expires_in: int = 3600,
) -> str:
    """
    Generate a presigned URL for reading an object from R2.

    Args:
        key: Object key (e.g. '{job_id}/exports/markdown/file.md')
        bucket: Bucket name
        expires_in: Expiration in seconds (1–604800 for R2)

    Returns:
        Presigned URL string
    """
    try:
        s3 = _r2_client()
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=min(max(1, expires_in), 604800),
        )
        return url or ""
    except Exception as e:
        logger.error(f"Error generating presigned URL: {e}")
        raise UploadError(f"Failed to generate signed URL: {str(e)}")


def get_signed_url_from_storage_url(
    storage_url: str,
    bucket: str = STORAGE_BUCKET,
    expires_in: int = 3600,
) -> str:
    """Generate a presigned URL from an existing R2 storage URL."""
    key = extract_key_from_url(storage_url, bucket)
    if not key:
        raise UploadError(f"Could not extract key from storage URL: {storage_url}")
    return get_signed_url(key, bucket, expires_in)


def delete_job_folder(job_id: str, bucket: str = STORAGE_BUCKET) -> bool:
    """
    Delete all objects under the job prefix (job_id/) in R2.

    Returns True if all listed objects were deleted or prefix was empty.
    """
    try:
        s3 = _r2_client()
        prefix = f"{job_id}/"
        keys_to_delete = []
        paginator = s3.get_paginator("list_objects_v2")

        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for obj in page.get("Contents") or []:
                k = obj.get("Key")
                if k:
                    keys_to_delete.append({"Key": k})

        if not keys_to_delete:
            logger.info(f"No objects found under prefix {prefix} for job {job_id}")
            return True

        # delete_objects accepts up to 1000 keys per request
        for i in range(0, len(keys_to_delete), 1000):
            chunk = keys_to_delete[i : i + 1000]
            s3.delete_objects(
                Bucket=bucket,
                Delete={"Objects": chunk, "Quiet": True},
            )

        logger.info(
            f"Deleted {len(keys_to_delete)} objects from R2 for job {job_id}"
        )
        return True

    except Exception as e:
        logger.error(f"Failed to delete job folder {job_id} from R2: {e}")
        return False
