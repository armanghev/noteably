import logging

from apps.accounts.permissions import IsAuthenticated
from apps.core.throttling import BurstRateThrottle, UploadRateThrottle
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response

from .models import Job
from .quota import check_user_quota
from .serializers import ProcessUploadSerializer
from .supabase_storage import get_signed_url_from_storage_url, upload_to_supabase
from .tasks import orchestrate_job_task
from .validators import get_file_duration, validate_file_size, validate_file_type

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([UploadRateThrottle])
def process_upload(request):
    serializer = ProcessUploadSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    file = serializer.validated_data["file"]
    material_types = serializer.validated_data["material_types"]
    options = serializer.validated_data.get("options", {})

    # Validate file
    validate_file_type(file)
    validate_file_size(file, 100)  # TODO: Get from user subscription

    # Get duration and check quota
    duration = get_file_duration(file)
    check_user_quota(request.user_id, duration, file.size / (1024 * 1024))

    # Create job first to get job_id for storage path
    job = Job.objects.create(
        user_id=request.user_id,
        filename=file.name,
        file_size_bytes=file.size,
        file_type=file.content_type,
        storage_url="",  # Will be updated after upload
        material_types=material_types,
        options=options,
        status="uploading",  # Start with uploading status
    )

    # Upload file to Supabase Storage synchronously (works in Docker with separate containers)
    # This ensures the file is available to Celery workers without shared filesystem
    try:
        storage_url = upload_to_supabase(
            file,
            file.name,
            job_id=str(job.id),
            content_type=file.content_type,
            subfolder="upload",
        )
        job.storage_url = storage_url
        job.status = "queued"  # File uploaded, ready for processing
        job.save(update_fields=["storage_url", "status"])
        logger.info(f"File uploaded for job {job.id}, storage_url: {storage_url}")
    except Exception as e:
        logger.error(f"Upload failed for job {job.id}: {e}")
        job.status = "failed"
        job.error_message = f"Upload failed: {str(e)}"
        job.save()
        return Response(
            {"error": f"Upload failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Trigger Celery task
    # Safely get email - request.user is now a SupabaseUser object or dict
    if isinstance(request.user, dict):
        user_email = request.user.get("email")
    else:
        user_email = getattr(request.user, "email", None)

    logger.info(
        f"Process upload request - User type: {type(request.user)}, Email: {user_email}"
    )

    orchestrate_job_task.delay(str(job.id), user_email=user_email)

    # Send receipt email
    if user_email:
        logger.info(f"Sending receipt email to {user_email}")
        from apps.core.utils.email import send_upload_received_email

        send_upload_received_email(user_email, file.name)

    return Response(
        {
            "job_id": str(job.id),
            "status": job.status,
            "estimated_time": job.estimate_processing_time(),
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_jobs(request):
    """
    List all jobs for the authenticated user.
    Uses lightweight serializer - excludes transcription and full content.
    Supports optional ?limit= parameter for pagination.
    """
    from .serializers import JobListSerializer

    jobs = (
        Job.objects.filter(user_id=request.user_id)
        .prefetch_related("generated_content")
        .order_by("-created_at")
    )

    # Optional limit parameter
    limit = request.query_params.get("limit")
    if limit:
        try:
            jobs = jobs[: int(limit)]
        except (ValueError, TypeError):
            pass

    serializer = JobListSerializer(jobs, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_data(request):
    """
    Lightweight endpoint for dashboard - returns recent jobs and aggregate stats.
    Optimized to avoid loading full generated_content.
    """
    from django.db.models import Sum
    from django.db.models.functions import Coalesce

    user_jobs = Job.objects.filter(user_id=request.user_id)
    completed_jobs = user_jobs.filter(status="completed")

    # Aggregate stats at DB level
    total_notes = completed_jobs.count()

    # Sum cached flashcard counts (or 0 if not populated yet)
    stats = completed_jobs.aggregate(
        total_flashcards=Coalesce(Sum("cached_flashcard_count"), 0)
    )

    # Get only the 5 most recent completed jobs with minimal fields
    recent_jobs = completed_jobs.order_by("-created_at")[:5].values(
        "id",
        "filename",
        "file_type",
        "status",
        "created_at",
        "cached_flashcard_count",
    )

    return Response(
        {
            "stats": {
                "total_notes": total_notes,
                "total_flashcards": stats["total_flashcards"],
            },
            "recent_jobs": list(recent_jobs),
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@throttle_classes([BurstRateThrottle])
def get_job_status(request, job_id):
    """
    Get current status of a job.
    """
    try:
        job = Job.objects.get(id=job_id, user_id=request.user_id)
    except Job.DoesNotExist:
        return Response(
            {"error": "Job not found or access denied"},
            status=status.HTTP_404_NOT_FOUND,
        )

    from .serializers import JobSerializer

    serializer = JobSerializer(job)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_signed_file_url(request, job_id):
    """
    Get a signed URL for accessing the job's uploaded file.
    Useful for private buckets where public URLs don't work.
    """
    try:
        job = Job.objects.get(id=job_id, user_id=request.user_id)
    except Job.DoesNotExist:
        return Response(
            {"error": "Job not found or access denied"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not job.storage_url:
        return Response(
            {"error": "File not found for this job"},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        # Generate signed URL (expires in 24 hours)
        signed_url = get_signed_url_from_storage_url(
            job.storage_url,
            expires_in=86400,  # 24 hours
        )

        return Response(
            {
                "signed_url": signed_url,
                "expires_in": 86400,
            }
        )
    except Exception as e:
        logger.error(f"Failed to generate signed URL for job {job_id}: {e}")
        return Response(
            {"error": "Failed to generate file access URL"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cancel_job(request, job_id):
    """
    Cancel an ongoing job.
    Revokes the currently running Celery task (transcription or generation).
    """
    try:
        job = Job.objects.get(id=job_id, user_id=request.user_id)
    except Job.DoesNotExist:
        return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

    if job.status in ["completed", "failed", "cancelled"]:
        return Response(
            {"error": f"Job is already {job.status}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if job.celery_task_id:
        try:
            from config.celery import app

            app.control.revoke(job.celery_task_id, terminate=True)
            logger.info(f"Revoked task {job.celery_task_id} for job {job.id}")
        except Exception as e:
            logger.error(f"Failed to revoke task for job {job.id}: {e}")

    job.status = "cancelled"
    job.save(update_fields=["status"])

    return Response({"status": "cancelled", "job_id": str(job.id)})
