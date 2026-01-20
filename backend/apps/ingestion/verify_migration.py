"""
Quick verification script to check migration status.

Usage:
    python manage.py shell
    >>> from apps.ingestion.verify_migration import check_migration_status
    >>> check_migration_status()
"""

from apps.ingestion.models import Job
from django.db.models import Q


def check_migration_status():
    """Check how many jobs have been migrated vs still on R2."""
    
    # Count jobs with Supabase URLs
    supabase_jobs = Job.objects.filter(
        Q(storage_url__icontains='supabase.co') | 
        Q(storage_url__icontains='supabase.in')
    )
    supabase_count = supabase_jobs.count()
    
    # Count jobs still with R2 URLs
    r2_jobs = Job.objects.filter(
        Q(storage_url__icontains='r2.dev') | 
        Q(storage_url__icontains='cloudflarestorage.com')
    )
    r2_count = r2_jobs.count()
    
    # Total jobs
    total = Job.objects.count()
    
    print(f"\n{'='*60}")
    print(f"Migration Status Summary")
    print(f"{'='*60}")
    print(f"Total jobs: {total}")
    print(f"Migrated to Supabase: {supabase_count} ({supabase_count/total*100:.1f}%)")
    print(f"Still on R2: {r2_count} ({r2_count/total*100:.1f}%)")
    print(f"{'='*60}\n")
    
    if r2_count > 0:
        print(f"⚠️  {r2_count} job(s) still need migration:")
        for job in r2_jobs[:10]:  # Show first 10
            print(f"  - {job.id}: {job.filename}")
        if r2_count > 10:
            print(f"  ... and {r2_count - 10} more")
    else:
        print("✅ All jobs have been migrated to Supabase!")
    
    return {
        'total': total,
        'supabase': supabase_count,
        'r2': r2_count,
    }
