import logging

from apps.accounts.permissions import IsAuthenticated
from apps.core.pagination import StandardCursorPagination
from apps.core.throttling import BurstRateThrottle, UploadRateThrottle
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response

from .models import Job
from .quota import check_user_quota
from .serializers import ProcessUploadSerializer
from .supabase_storage import (
    delete_job_folder,
    get_signed_url_from_storage_url,
    upload_to_supabase,
)
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


class JobListView(generics.ListAPIView):
    """
    List all jobs for the authenticated user with cursor-based pagination.
    """

    permission_classes = [IsAuthenticated]
    pagination_class = StandardCursorPagination

    def get_queryset(self):
        return (
            Job.objects.filter(user_id=self.request.user_id)
            .prefetch_related("generated_content")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        from .serializers import JobListSerializer

        return JobListSerializer


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


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
@throttle_classes([BurstRateThrottle])
def job_detail(request, job_id):
    """
    GET: Get current status of a job.
    DELETE: Permanently delete a job and its files.
    """
    try:
        job = Job.objects.get(id=job_id, user_id=request.user_id)
    except Job.DoesNotExist:
        return Response(
            {"error": "Job not found or access denied"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        from .serializers import JobSerializer

        serializer = JobSerializer(job)
        return Response(serializer.data)

    elif request.method == "DELETE":
        # 1. Delete files from Supabase Storage
        try:
            storage_deleted = delete_job_folder(str(job.id))
            if not storage_deleted:
                logger.warning(
                    f"Storage cleanup partially failed or skipped for job {job.id}"
                )
        except Exception as e:
            logger.error(f"Error during storage cleanup for job {job.id}: {e}")

        # 2. Delete the Job object from database
        job_filename = job.filename
        job.delete()

        logger.info(f"User {request.user_id} deleted job {job_id} ({job_filename})")

        return Response(
            {
                "message": f"Successfully deleted '{job_filename}'. Your dashboard has been updated.",
                "job_id": str(job_id),
            },
            status=status.HTTP_200_OK,
        )


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
