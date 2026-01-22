import io
import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from apps.generation.models import GeneratedContent
from apps.generation.service import GeminiService
from apps.ingestion.models import Job
from apps.ingestion.supabase_storage import get_signed_url_from_storage_url, upload_to_supabase
from apps.transcription.models import Transcription
from apps.transcription.service import TranscriptionService
from celery import shared_task
from django.utils.timezone import now as from_datetime
from pypdf import PdfReader

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

@shared_task(bind=True, max_retries=3)
def process_upload_task(self, job_id, temp_file_path=None):
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        logger.error(f"Job {job_id} not found")
        return

    if job.status in ["completed", "failed"]:
        return

    try:
        # Step 1: Upload file to Supabase Storage if in "uploading" status
        if job.status == "uploading" and temp_file_path:
            logger.info(f"Uploading file for job {job_id}")
            try:
                with open(temp_file_path, 'rb') as f:
                    storage_url = upload_to_supabase(
                        f,
                        job.filename,
                        job_id=str(job.id),
                        content_type=job.file_type,
                        subfolder="upload"
                    )
                job.storage_url = storage_url
                job.status = "queued"
                job.save(update_fields=['storage_url', 'status'])
                logger.info(f"File uploaded for job {job_id}, storage_url: {storage_url}")

                # Clean up temp file
                os.remove(temp_file_path)
                logger.info(f"Cleaned up temp file for job {job_id}")
            except Exception as e:
                logger.error(f"Upload failed for job {job_id}: {e}")
                job.status = "failed"
                job.error_message = f"Upload failed: {str(e)}"
                job.save()
                # Clean up on failure too
                if temp_file_path and os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
                return

        # Step 2: Transcription / Text Extraction
        if not hasattr(job, 'transcription') or job.transcription is None:
            # Check if it is a PDF
            if job.file_type == "application/pdf" or job.filename.lower().endswith(".pdf"):
                logger.info(f"Processing PDF for job {job_id}")
                job.status = "extracting_text"
                job.save()

                raw_text = extract_pdf_text_from_url(job.storage_url)

                # Clean up the raw PDF text using Gemini
                logger.info(f"Cleaning up PDF text for job {job_id}")
                cleaned_text = GeminiService.generate_content(raw_text, "cleanup")

                # Create transcription record with cleaned text
                Transcription.objects.create(
                    job=job,
                    external_id="pdf",
                    text=cleaned_text,
                    raw_response={
                        "type": "pdf_extraction",
                        "raw_text_length": len(raw_text),
                    },
                )
                job.transcription_id = "pdf"
                job.save(update_fields=['transcription_id'])

            else:
                # Audio/Video file - use AssemblyAI
                logger.info(f"Transcribing audio/video for job {job_id}")
                job.status = "transcribing"
                job.progress = 25
                job.save()

                # Generate a signed URL for AssemblyAI (expires in 24 hours)
                signed_url = get_signed_url_from_storage_url(
                    job.storage_url,
                    expires_in=86400,
                )
                logger.info(f"Generated signed URL for job {job_id}")

                # Transcribe using SDK (blocks until complete, handles polling automatically)
                transcript = TranscriptionService.transcribe(signed_url)

                # Create transcription record
                Transcription.objects.create(
                    job=job,
                    external_id=transcript.id,
                    text=transcript.text,
                    raw_response=transcript.json_response,
                )
                job.transcription_id = transcript.id
                job.save(update_fields=['transcription_id'])
                logger.info(f"Transcription completed for job {job_id}")

        # Step 3: Content Generation
        logger.info(f"Starting content generation for job {job_id}")
        job.status = "generating"
        job.progress = 50
        job.save()

        transcript_text = job.transcription.text

        # Generate all material types in parallel
        def generate_single(material_type):
            logger.info(f"Generating {material_type} for job {job_id}")
            content = GeminiService.generate_content(transcript_text, material_type)
            return material_type, content

        results = {}
        errors = []

        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(generate_single, mt): mt
                for mt in job.material_types
            }

            for future in as_completed(futures):
                material_type = futures[future]
                try:
                    mt, content = future.result()
                    results[mt] = content
                    logger.info(f"Completed generating {mt} for job {job_id}")
                except Exception as e:
                    logger.error(f"Failed to generate {material_type} for job {job_id}: {e}")
                    errors.append((material_type, str(e)))

        # Save all generated content
        for material_type, content in results.items():
            GeneratedContent.objects.create(
                job=job, type=material_type, content=content
            )

        job.status = "completed"
        job.progress = 100
        job.completed_at = from_datetime()
        job.save()

        # Update cached content metadata for fast list queries
        job.update_content_cache()
        logger.info(f"Job {job_id} completed successfully")

    except Exception as e:
        logger.exception(f"Error processing job {job_id}")
        job.status = "failed"
        job.error_message = f"Processing failed: {str(e)}"
        job.save()
