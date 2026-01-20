"""Supabase Storage utilities for file uploads and management."""

import uuid
import logging
import io
from typing import Optional, BinaryIO
from django.conf import settings
from apps.core.error_handler import retry_with_backoff
from apps.core.exceptions import UploadError
from apps.core.supabase_client import supabase_client

logger = logging.getLogger(__name__)

# Single bucket for all storage
STORAGE_BUCKET = "noteably"


@retry_with_backoff(max_attempts=3)
def upload_to_supabase(
    file: BinaryIO,
    filename: str,
    job_id: str,
    bucket: str = STORAGE_BUCKET,
    content_type: Optional[str] = None,
    subfolder: str = "upload",
) -> str:
    """
    Upload a file to Supabase Storage in the job's directory.
    
    Args:
        file: File-like object to upload
        filename: Name of the file
        job_id: Job UUID to organize files by job
        bucket: Bucket name (default: 'noteably')
        content_type: MIME type of the file
        subfolder: Subfolder within job directory (default: 'upload' for uploads, 'exports' for exports)
        
    Returns:
        Public URL of the uploaded file
        
    Raises:
        UploadError: If upload fails
    """
    try:
        # Structure: {job_id}/{subfolder}/{filename}
        key = f"{job_id}/{subfolder}/{filename}"
        
        # Read file content
        if hasattr(file, 'read'):
            file.seek(0)  # Ensure we're at the start
            file_content = file.read()
        else:
            file_content = file
        
        # Upload to Supabase Storage
        client = supabase_client.client
        response = client.storage.from_(bucket).upload(
            path=key,
            file=file_content,
            file_options={
                "content-type": content_type or "application/octet-stream",
                "upsert": False,  # Don't overwrite existing files
            }
        )
        
        # Supabase upload returns a dict with 'path' on success
        # Check for errors
        if isinstance(response, dict) and response.get("error"):
            raise UploadError(f"Supabase upload failed: {response['error']}")
        
        # Get public URL
        public_url_response = client.storage.from_(bucket).get_public_url(key)
        
        # get_public_url returns a string URL
        if public_url_response:
            return public_url_response
        
        # Fallback: construct URL manually
        supabase_url = settings.SUPABASE_URL.rstrip('/')
        return f"{supabase_url}/storage/v1/object/public/{bucket}/{key}"
        
    except Exception as e:
        logger.error(f"Error uploading to Supabase: {e}")
        raise UploadError(f"Failed to upload file to Supabase: {str(e)}")


@retry_with_backoff(max_attempts=3)
def upload_bytes_to_supabase(
    content: bytes,
    filename: str,
    job_id: str,
    bucket: str = STORAGE_BUCKET,
    content_type: Optional[str] = None,
    subfolder: str = "exports",
) -> str:
    """
    Upload bytes content to Supabase Storage in the job's directory.
    
    Args:
        content: Bytes content to upload
        filename: Name of the file
        job_id: Job UUID to organize files by job
        bucket: Bucket name (default: 'noteably')
        content_type: MIME type of the file
        subfolder: Subfolder within job directory (default: 'exports')
        
    Returns:
        Public URL of the uploaded file
    """
    file_obj = io.BytesIO(content)
    return upload_to_supabase(file_obj, filename, job_id, bucket, content_type, subfolder)


def delete_from_supabase(storage_url: str, bucket: str = STORAGE_BUCKET) -> bool:
    """
    Delete a file from Supabase Storage.
    
    Args:
        storage_url: Full URL of the file to delete
        bucket: Bucket name (default: 'noteably')
        
    Returns:
        True if successful
        
    Raises:
        UploadError: If deletion fails
    """
    try:
        # Extract key from URL
        # URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<job_id>/<subfolder>/<filename>
        parts = storage_url.split(f"/{bucket}/")
        if len(parts) < 2:
            logger.warning(f"Could not extract key from URL: {storage_url}")
            return False
        
        key = parts[1]
        
        # Delete from Supabase Storage
        client = supabase_client.client
        response = client.storage.from_(bucket).remove([key])
        
        # Check for errors (response is typically a list or dict)
        if isinstance(response, dict) and response.get("error"):
            logger.error(f"Error deleting from Supabase: {response['error']}")
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"Error deleting from Supabase: {e}")
        return False


def extract_key_from_url(storage_url: str, bucket: str = STORAGE_BUCKET) -> Optional[str]:
    """
    Extract the storage key from a Supabase storage URL.
    
    Args:
        storage_url: Full URL of the file (public or signed)
        bucket: Bucket name (default: 'noteably')
        
    Returns:
        Storage key (e.g., '{job_id}/upload/{filename}') or None if extraction fails
    """
    try:
        # URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<key>
        # or: https://<project>.supabase.co/storage/v1/object/sign/<bucket>/<key>?...
        parts = storage_url.split(f"/{bucket}/")
        if len(parts) < 2:
            logger.warning(f"Could not extract key from URL: {storage_url}")
            return None
        
        # Get the key part (everything after /bucket/)
        key_with_params = parts[1]
        # Remove query parameters if present (for signed URLs)
        key = key_with_params.split('?')[0]
        
        return key
    except Exception as e:
        logger.error(f"Error extracting key from URL: {e}")
        return None


def get_signed_url(
    key: str,
    bucket: str = STORAGE_BUCKET,
    expires_in: int = 3600,
) -> str:
    """
    Generate a signed URL for a file in Supabase Storage.
    
    Args:
        key: File path/key in the bucket (e.g., '{job_id}/exports/{filename}')
        bucket: Bucket name (default: 'noteably')
        expires_in: Expiration time in seconds (default: 1 hour)
        
    Returns:
        Signed URL that expires after expires_in seconds
    """
    try:
        client = supabase_client.client
        response = client.storage.from_(bucket).create_signed_url(
            path=key,
            expires_in=expires_in,
        )
        
        # Check for errors
        if isinstance(response, dict) and response.get("error"):
            raise UploadError(f"Failed to create signed URL: {response['error']}")
        
        # Extract signed URL from response
        if isinstance(response, dict):
            return response.get("signedURL", "")
        elif hasattr(response, 'signedURL'):
            return response.signedURL
        else:
            # If response is a string, return it
            return str(response) if response else ""
        
    except Exception as e:
        logger.error(f"Error generating signed URL: {e}")
        raise UploadError(f"Failed to generate signed URL: {str(e)}")


def get_signed_url_from_storage_url(
    storage_url: str,
    bucket: str = STORAGE_BUCKET,
    expires_in: int = 3600,
) -> str:
    """
    Generate a signed URL from an existing storage URL.
    Useful for converting public URLs to signed URLs for external services.
    
    Args:
        storage_url: Full URL of the file (public or signed)
        bucket: Bucket name (default: 'noteably')
        expires_in: Expiration time in seconds (default: 1 hour)
        
    Returns:
        Signed URL that expires after expires_in seconds
        
    Raises:
        UploadError: If key extraction or signed URL generation fails
    """
    key = extract_key_from_url(storage_url, bucket)
    if not key:
        raise UploadError(f"Could not extract key from storage URL: {storage_url}")
    
    return get_signed_url(key, bucket, expires_in)
