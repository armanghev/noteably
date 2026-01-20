"""
Migration script to move files from Cloudflare R2 to Supabase Storage.

Usage:
    python manage.py shell
    >>> from apps.ingestion.migrate_r2_to_supabase import migrate_all_jobs
    >>> migrate_all_jobs()
"""

import logging
import boto3
import requests
from django.conf import settings
from apps.ingestion.models import Job
from apps.ingestion.supabase_storage import upload_to_supabase, STORAGE_BUCKET
from apps.core.supabase_client import supabase_client

logger = logging.getLogger(__name__)


def download_from_r2(storage_url: str) -> tuple[bytes, str]:
    """
    Download a file from R2 storage.
    
    Returns:
        Tuple of (file_content, filename)
    """
    try:
        response = requests.get(storage_url, timeout=30)
        response.raise_for_status()
        
        # Extract filename from URL
        filename = storage_url.split('/')[-1]
        
        return response.content, filename
    except Exception as e:
        logger.error(f"Error downloading from R2: {e}")
        raise


def migrate_job(job: Job, dry_run: bool = False) -> bool:
    """
    Migrate a single job's file from R2 to Supabase.
    
    Args:
        job: Job instance to migrate
        dry_run: If True, only log what would be done without actually migrating
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Check if URL is from R2
        if not job.storage_url or 'r2.dev' not in job.storage_url and 'cloudflarestorage.com' not in job.storage_url:
            logger.info(f"Job {job.id} already uses Supabase or has no storage URL")
            return True
        
        logger.info(f"Migrating job {job.id} from R2: {job.storage_url}")
        
        if dry_run:
            logger.info(f"[DRY RUN] Would migrate job {job.id}")
            return True
        
        # Download from R2
        file_content, filename = download_from_r2(job.storage_url)
        
        # Upload to Supabase in job's directory
        new_storage_url = upload_to_supabase(
            file_content,
            filename or job.filename,
            job_id=str(job.id),
            content_type=job.file_type,
            subfolder="upload",
        )
        
        # Update job with new URL
        job.storage_url = new_storage_url
        job.save(update_fields=['storage_url'])
        
        logger.info(f"Successfully migrated job {job.id} to {new_storage_url}")
        return True
        
    except Exception as e:
        logger.error(f"Error migrating job {job.id}: {e}")
        return False


def migrate_all_jobs(dry_run: bool = False, limit: int = None):
    """
    Migrate all jobs from R2 to Supabase Storage.
    
    Args:
        dry_run: If True, only log what would be done without actually migrating
        limit: Maximum number of jobs to migrate (None for all)
    """
    # Get all jobs with R2 URLs
    jobs = Job.objects.filter(
        storage_url__icontains='r2.dev'
    ) | Job.objects.filter(
        storage_url__icontains='cloudflarestorage.com'
    )
    
    if limit:
        jobs = jobs[:limit]
    
    total = jobs.count()
    logger.info(f"Found {total} jobs to migrate")
    
    if dry_run:
        logger.info("[DRY RUN MODE] No files will be migrated")
    
    success_count = 0
    fail_count = 0
    
    for job in jobs:
        if migrate_job(job, dry_run=dry_run):
            success_count += 1
        else:
            fail_count += 1
    
    logger.info(f"Migration complete: {success_count} succeeded, {fail_count} failed out of {total} jobs")


def ensure_buckets_exist():
    """
    Ensure that the required Supabase storage buckets exist.
    Creates them if they don't exist.
    """
    try:
        client = supabase_client.client
        
        # List existing buckets
        buckets_response = client.storage.list_buckets()
        existing_buckets = [b.get('name') if isinstance(b, dict) else b.name for b in buckets_response] if buckets_response else []
        
        # Create single storage bucket if it doesn't exist
        if STORAGE_BUCKET not in existing_buckets:
            logger.info(f"Creating bucket: {STORAGE_BUCKET}")
            client.storage.create_bucket(
                STORAGE_BUCKET,
                options={"public": False}  # Private bucket, use signed URLs for downloads
            )
            logger.info(f"Created bucket: {STORAGE_BUCKET}")
        else:
            logger.info(f"Bucket {STORAGE_BUCKET} already exists")
            
    except Exception as e:
        logger.error(f"Error ensuring buckets exist: {e}")
        raise
