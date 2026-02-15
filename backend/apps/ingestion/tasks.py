import io
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from apps.generation.models import GeneratedContent
from apps.generation.service import GeminiService
from apps.ingestion.models import Job
from apps.ingestion.supabase_storage import get_signed_url_from_storage_url
from apps.transcription.models import Transcription
from apps.transcription.service import TranscriptionService
from celery import chain, shared_task
from django.utils.timezone import now as from_datetime
from pypdf import PdfReader
import yt_dlp
import os

logger = logging.getLogger(__name__)


def extract_pdf_text_from_url(url: str) -> str:
    """Download PDF from URL and extract text."""
    try:
        # Generate signed URL if needed (for private buckets)
        try:
            signed_url = get_signed_url_from_storage_url(url, expires_in=3600)
            url_to_use = signed_url
        except Exception:
            # If URL extraction fails, try using the original URL (might be public)
            url_to_use = url

        response = requests.get(url_to_use)
        response.raise_for_status()

        with io.BytesIO(response.content) as f:
            reader = PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text
    except Exception as e:
        logger.error(f"Error extracting PDF text: {e}")
        raise


@shared_task(bind=True, queue="default")
def orchestrate_job_task(self, job_id, user_email=None):
    """
    Entry point for the ingestion pipeline.
    Chains the transcription and generation tasks.
    """
    logger.info(f"Orchestrating job {job_id}")
    try:
        job = Job.objects.get(id=job_id)
        job.celery_task_id = self.request.id
        job.status = "queued"
        job.save(update_fields=["celery_task_id", "status"])

        # Define the workflow chain
        # transcribe -> generate

        # MANUAL TEST TRIGGER: Fail job if filename is 'fail_test.txt'
        if job.filename == "fail_test.txt":
            raise Exception("Manual test failure triggered")

        workflow = chain(
            transcribe_media_task.s(job_id), generate_content_task.s(job_id, user_email)
        )

        # Execute the chain
        # We start it immediately; the sub-tasks will run in their respective queues
        workflow.apply_async()

    except Job.DoesNotExist:
        logger.error(f"Job {job_id} not found during orchestration")
    except Exception as e:
        logger.exception(f"Error orchestrating job {job_id}")
        # Attempt to fail the job if found
        try:
            job = Job.objects.get(id=job_id)
            job.status = "failed"
            job.error_message = f"Orchestration error: {str(e)}"
            job.save()
        except Exception:
            pass


@shared_task(bind=True, max_retries=3, queue="transcription")
def transcribe_media_task(self, job_id):
    """
    Handle Step 1 & 2: Validation, PDF Extraction, or AssemblyAI Transcription
    """
    logger.info(f"Starting transcription task for job {job_id}")
    try:
        job = Job.objects.get(id=job_id)

        # Update task ID for cancellation support
        job.celery_task_id = self.request.id
        job.save(update_fields=["celery_task_id"])

        if job.status in ["completed", "failed", "cancelled"]:
            return job_id

        # Verify storage URL
        if not job.storage_url:
            raise ValueError("No storage URL provided")

        # PDF Handling
        if job.file_type == "application/pdf" or job.filename.lower().endswith(".pdf"):
            logger.info(f"Processing PDF for job {job_id}")
            job.status = "extracting_text"
            job.save(update_fields=["status"])

            raw_text = extract_pdf_text_from_url(job.storage_url)

            logger.info(f"Cleaning up PDF text for job {job_id}")
            cleaned_text = GeminiService.generate_content(raw_text, "cleanup")

            Transcription.objects.update_or_create(
                job=job,
                defaults={
                    "external_id": "pdf",
                    "text": cleaned_text,
                    "raw_response": {
                        "type": "pdf_extraction",
                        "raw_text_length": len(raw_text),
                    },
                },
            )
            job.transcription_id = "pdf"
            job.save(update_fields=["transcription_id"])

        else:
            # AssemblyAI Handling
            logger.info(f"Transcribing audio/video for job {job_id}")
            job.status = "transcribing"
            job.progress = 25
            job.save(update_fields=["status", "progress"])

            signed_url = get_signed_url_from_storage_url(
                job.storage_url, expires_in=86400
            )
            transcript = TranscriptionService.transcribe(signed_url)

            # Use raw_response directly if possible, or build it carefully
            # ... (Simplified serialization logic) ...
            raw_data = {}
            if hasattr(transcript, "json_response"):
                raw_data = transcript.json_response
            elif hasattr(transcript, "dict"):
                raw_data = transcript.dict()
            else:
                raw_data = {"id": transcript.id, "text": transcript.text}

            Transcription.objects.update_or_create(
                job=job,
                defaults={
                    "external_id": transcript.external_id
                    if hasattr(transcript, "external_id")
                    else transcript.id,
                    "text": transcript.text,
                    "raw_response": raw_data,
                },
            )
            job.transcription_id = transcript.id
            job.save(update_fields=["transcription_id"])

        logger.info(f"Transcription complete for job {job_id}")
        return job_id

    except Exception as e:
        logger.exception(f"Error in transcription task for job {job_id}")
        try:
            job.status = "failed"
            job.error_message = f"Transcription failed: {str(e)}"
            job.save()
        except Exception:
            pass
        raise e  # Retry enabled


@shared_task(bind=True, max_retries=3, queue="default")
def download_youtube_video_task(self, job_id, url, user_email=None):
    """
    Download audio from YouTube video and upload to storage.
    """
    logger.info(f"Starting YouTube download task for job {job_id}")
    try:
        job = Job.objects.get(id=job_id)
        job.celery_task_id = self.request.id
        job.status = "downloading"
        job.save(update_fields=["celery_task_id", "status"])

        # Temporary download path
        temp_filename = f"/tmp/{job.id}.mp4"
        
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': temp_filename,
            'quiet': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            video_title = info.get('title', 'YouTube Video')
            duration = info.get('duration', 0)
            
            # yt-dlp might append extension, find the file
            downloaded_file = temp_filename
            if not os.path.exists(downloaded_file):
                 # Fallback search if extension differs
                 for f in os.listdir("/tmp"):
                     if f.startswith(str(job.id)):
                         downloaded_file = f"/tmp/{f}"
                         break
            
            if not os.path.exists(downloaded_file):
                 raise Exception("Downloaded file not found")

            # Upload to Supabase
            from apps.ingestion.supabase_storage import upload_to_supabase
            
            with open(downloaded_file, 'rb') as f:
                storage_url = upload_to_supabase(
                    f,
                    f"{job.id}.mp4", # Use job ID as filename to avoid special char issues
                    job_id=str(job.id),
                    content_type="video/mp4",
                    subfolder="upload"
                )
            
            # Clean up temp file
            os.remove(downloaded_file)

            # Update Job
            job.storage_url = storage_url
            job.filename = video_title # Update with actual title
            job.file_type = "video/mp4"
            job.status = "queued"
            job.save(update_fields=["storage_url", "filename", "file_type", "status"])
            
            # Trigger next step
            orchestrate_job_task.delay(str(job.id), user_email=user_email)

    except Exception as e:
        logger.exception(f"Error downloading YouTube video for job {job_id}")
        try:
            job = Job.objects.get(id=job_id)
            job.status = "failed"
            job.error_message = f"Download failed: {str(e)}"
            job.save()
        except Exception:
            pass
        raise e



@shared_task(bind=True, max_retries=2, queue="generation")
def generate_content_task(self, transcription_result, job_id, user_email=None):
    """
    Handle Step 3: Gemini Content Generation
    """
    logger.info(f"Starting generation task for job {job_id}")
    try:
        job = Job.objects.get(id=job_id)

        # Update task ID for cancellation support
        job.celery_task_id = self.request.id
        job.save(update_fields=["celery_task_id"])

        if job.status in ["completed", "failed", "cancelled"]:
            return

        job.status = "generating"
        job.progress = 50
        job.save(update_fields=["status", "progress"])

        # Clear existing generated content for retry
        # This ensures we don't have duplicate or stale content if material types changed
        # or if we're doing a full retry.
        GeneratedContent.objects.filter(job=job).delete()

        # Fetch transcription text
        try:
            transcript_text = job.transcription.text
        except Job.transcription.RelatedObjectDoesNotExist:
            raise ValueError("Transcription not found for job")

        # Parallel Generation
        results = {}
        errors = []

        with ThreadPoolExecutor(max_workers=4) as executor:
            # Helper to call service
            def gen(mt):
                return mt, GeminiService.generate_content(transcript_text, mt)

            futures = {executor.submit(gen, mt): mt for mt in job.material_types}

            for future in as_completed(futures):
                mt = futures[future]
                try:
                    res_mt, content = future.result()
                    results[res_mt] = content
                    # Save immediately so it's available
                    GeneratedContent.objects.create(
                        job=job, type=res_mt, content=content
                    )
                    logger.info(f"Generated and saved {res_mt} for job {job_id}")
                except Exception as e:
                    logger.error(f"Failed to generate {mt}: {e}")
                    errors.append((mt, str(e)))

        # (Batch save loop removed)

        # Handle Completion / Partial Failure
        if not results:
            job.status = "failed"
            job.error_message = f"All generation failed. Errors: {errors}"
        else:
            job.status = "completed"
            job.progress = 100
            job.completed_at = from_datetime()
            if errors:
                job.error_message = (
                    f"Partial completion. Failed: {[e[0] for e in errors]}"
                )

            # Send email
            if user_email:
                try:
                    from apps.core.utils.email import send_job_completed_email

                    send_job_completed_email(
                        user_email, str(job.id), job.filename, list(results.keys())
                    )
                except Exception as e:
                    logger.error(f"Failed to send email: {e}")

        job.save()

        # Update Cache
        try:
            job.update_content_cache()
        except Exception:
            pass

        return job_id

    except Exception as e:
        logger.exception(f"Error in generation task for job {job_id}")
        try:
            job.status = "failed"
            job.error_message = f"Generation failed: {str(e)}"
            job.save()
        except Exception:
            pass
        raise e
