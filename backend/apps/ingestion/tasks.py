import io
import logging

import requests
from apps.generation.models import GeneratedContent
from apps.generation.service import GeminiService
from apps.ingestion.models import Job
from apps.transcription.models import Transcription
from apps.transcription.service import TranscriptionService
from celery import shared_task
from celery.exceptions import Retry
from django.utils.timezone import now as from_datetime
from pypdf import PdfReader

logger = logging.getLogger(__name__)


def extract_pdf_text_from_url(url: str) -> str:
    """Download PDF from URL and extract text."""
    try:
        response = requests.get(url)
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


@shared_task(bind=True, max_retries=100)
def process_upload_task(self, job_id):
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        logger.error(f"Job {job_id} not found")
        return

    if job.status in ["completed", "failed"]:
        return

    try:
        if not job.transcription_id:
            # Check if it is a PDF
            if job.file_type == "application/pdf" or job.filename.lower().endswith(
                ".pdf"
            ):
                logger.info(f"Processing PDF for job {job_id}")
                try:
                    raw_text = extract_pdf_text_from_url(job.storage_url)

                    # Clean up the raw PDF text using Gemini
                    logger.info(f"Cleaning up PDF text for job {job_id}")
                    cleaned_text = GeminiService.generate_content(raw_text, "cleanup")

                    # Create transcription record immediately with cleaned text
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
                    job.status = "transcribing"  # Will be picked up as completed in next block/loop
                    job.save()

                    # Continue immediately to next phase
                    process_upload_task.delay(job_id)
                    return
                except Exception as e:
                    job.status = "failed"
                    job.error_message = f"PDF extraction failed: {str(e)}"
                    job.save()
                    return

            logger.info(f"Submitting job {job_id} to AssemblyAI")
            # Submit to AssemblyAI
            tx_id = TranscriptionService.submit_transcription(job.storage_url)

            job.transcription_id = tx_id
            job.status = "transcribing"
            job.save()

            # Use retry for polling delay
            raise self.retry(countdown=10)

        else:
            # Check status
            if job.transcription_id == "pdf":
                # PDF processing is always "instant" and "completed" if we got here
                status = "completed"
                # Result is already in DB, but we get the Transciption obj below
                # Dummy result dict for below logic
                result = {
                    "text": job.transcription.text,
                    "status": "completed",
                    "id": "pdf",
                }
            else:
                logger.info(
                    f"Checking status for job {job_id}, tx_id {job.transcription_id}"
                )
                result = TranscriptionService.get_transcription_result(
                    str(job.transcription_id)
                )
                status = result.get("status")

            if status == "completed":
                logger.info(f"Transcription/Extraction completed for job {job_id}")

                # Check if transcription record already exists to avoid duplicates on retry
                if not hasattr(job, "transcription"):
                    Transcription.objects.create(
                        job=job,
                        external_id=result.get("id", "unknown"),
                        text=result.get("text", ""),
                        raw_response=result,
                    )

                # Start Generation Phase
                job.status = "generating"
                job.progress = 50
                job.save()

                # Generate formatted text from transcript
                transcript_text = job.transcription.text

                for material_type in job.material_types:
                    try:
                        logger.info(f"Generating {material_type} for job {job_id}")
                        content = GeminiService.generate_content(
                            transcript_text, material_type
                        )

                        GeneratedContent.objects.create(
                            job=job, type=material_type, content=content
                        )
                    except Exception as e:
                        logger.error(
                            f"Failed to generate {material_type} for job {job.id}: {e}"
                        )
                        # We continue generating other types even if one fails

                job.status = "completed"
                job.progress = 100
                job.completed_at = from_datetime()
                job.save()

            elif status == "error":
                error_msg = result.get("error")
                logger.error(f"Transcription failed for job {job_id}: {error_msg}")
                job.status = "failed"
                job.error_message = str(error_msg)
                job.save()

            else:
                # queued or processing
                job.progress = 25
                job.save()
                raise self.retry(countdown=10)

    except Retry:
        raise
    except Exception as e:
        logger.exception(f"Error processing job {job_id}")
        # Only mark failed if we haven't exceeded retries handled by Celery for other exceptions
        # But since we use bind=True and managing our own polling loop, we should probably fail here
        # if it's not a polling retry.
        job.status = "failed"
        job.error_message = f"Internal error: {str(e)}"
        job.save()
