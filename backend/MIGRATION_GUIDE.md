# Migration Guide: R2 to Supabase Storage

This guide explains how to migrate from Cloudflare R2 to Supabase Storage.

## Overview

The migration involves:
- **Uploads bucket**: User-uploaded files (PDFs, audio, etc.)
- **Results bucket**: Generated export files (Markdown, JSON, PDF)

## Prerequisites

1. **Supabase Project Setup**
   - Ensure you have a Supabase project with Storage enabled
   - Have your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured in `.env`

2. **Create Storage Buckets**
   - The migration script will create buckets automatically, or you can create them manually:
     - `uploads` (private bucket for user uploads)
     - `results` (private bucket for exports, accessed via signed URLs)

## Step 1: Ensure Buckets Exist

Run this in Django shell to create the buckets if they don't exist:

```python
python manage.py shell
>>> from apps.ingestion.migrate_r2_to_supabase import ensure_buckets_exist
>>> ensure_buckets_exist()
```

Or create them manually in the Supabase dashboard:
1. Go to Storage in your Supabase dashboard
2. Create two buckets: `uploads` and `results`
3. Set both to **Private** (we'll use signed URLs for downloads)

## Step 2: Test Migration (Dry Run)

Before migrating all files, test with a dry run:

```python
python manage.py shell
>>> from apps.ingestion.migrate_r2_to_supabase import migrate_all_jobs
>>> migrate_all_jobs(dry_run=True, limit=5)  # Test with 5 jobs first
```

This will show you what would be migrated without actually moving files.

## Step 3: Run Full Migration

Once you're confident, run the full migration:

```python
python manage.py shell
>>> from apps.ingestion.migrate_r2_to_supabase import migrate_all_jobs
>>> migrate_all_jobs(dry_run=False)
```

This will:
1. Find all jobs with R2 storage URLs
2. Download each file from R2
3. Upload to Supabase Storage (uploads bucket)
4. Update the job's `storage_url` field

## Step 4: Verify Migration

Check that jobs have been updated:

```python
python manage.py shell
>>> from apps.ingestion.models import Job
>>> # Count jobs with Supabase URLs
>>> supabase_jobs = Job.objects.filter(storage_url__icontains='supabase.co')
>>> print(f"Jobs with Supabase URLs: {supabase_jobs.count()}")
>>> # Count jobs still with R2 URLs
>>> r2_jobs = Job.objects.filter(storage_url__icontains='r2.dev')
>>> print(f"Jobs still with R2 URLs: {r2_jobs.count()}")
```

## Step 5: Test New Uploads

Test that new uploads work correctly:

1. Upload a new file through the API
2. Verify it's stored in Supabase Storage (uploads bucket)
3. Check that the job's `storage_url` points to Supabase

## Step 6: Test Exports

Test that exports work correctly:

1. Export a job's content (Markdown, JSON, or PDF)
2. Verify the export file is stored in Supabase Storage (results bucket)
3. Verify the signed URL works for downloading

## Step 7: Cleanup (Optional)

After verifying everything works:

1. **Remove R2 credentials** from `.env` (optional, keep for reference if needed)
2. **Remove boto3 dependency** from `requirements.txt` if not used elsewhere:
   ```bash
   pip uninstall boto3
   ```
3. **Archive R2 bucket** (optional, keep for backup)

## Troubleshooting

### Bucket Creation Fails

If bucket creation fails, check:
- `SUPABASE_SERVICE_ROLE_KEY` has storage admin permissions
- Storage is enabled in your Supabase project
- You have sufficient permissions

### Migration Fails for Specific Jobs

If some jobs fail to migrate:
- Check the logs for specific error messages
- Verify R2 URLs are still accessible
- Re-run migration for failed jobs individually:

```python
>>> from apps.ingestion.models import Job
>>> from apps.ingestion.migrate_r2_to_supabase import migrate_job
>>> job = Job.objects.get(id='<job-id>')
>>> migrate_job(job, dry_run=False)
```

### Signed URLs Not Working

If signed URLs for exports don't work:
- Verify the `results` bucket exists and is accessible
- Check that `SUPABASE_SERVICE_ROLE_KEY` has proper permissions
- Ensure the bucket is set to private (signed URLs only work for private buckets)

## Code Changes Summary

The following files were updated:

1. **`apps/ingestion/supabase_storage.py`** (NEW)
   - Replaces `r2_storage.py`
   - Functions: `upload_to_supabase()`, `upload_bytes_to_supabase()`, `delete_from_supabase()`, `get_signed_url()`

2. **`apps/ingestion/views.py`**
   - Updated to use `upload_to_supabase()` instead of `upload_to_r2()`

3. **`apps/export/views.py`**
   - Updated to use `upload_bytes_to_supabase()` for exports
   - Uses `get_signed_url()` for download URLs

4. **`config/settings.py`**
   - R2 settings marked as deprecated
   - Added Supabase storage bucket name settings

5. **`apps/ingestion/migrate_r2_to_supabase.py`** (NEW)
   - Migration script for moving existing files

## Notes

- **Existing R2 URLs**: Jobs with old R2 URLs will continue to work until R2 is decommissioned
- **New uploads**: All new uploads automatically go to Supabase Storage
- **Exports**: All new exports automatically go to Supabase Storage (results bucket)
- **Backward compatibility**: The code can handle both R2 and Supabase URLs during the transition period
