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
def process_upload_task(
    self,
    job_id,
    user_email=None,
):
    logger.info(
        f"Task process_upload_task started for job {job_id}. Email: {user_email}"
    )
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        logger.error(f"Job {job_id} not found")
        return

    if job.status in ["completed", "failed"]:
        return

    try:
        # Step 1: Verify file is uploaded (should already be uploaded by web server)
        if not job.storage_url:
            logger.error(f"No storage URL for job {job_id}, upload may have failed")
            job.status = "failed"
            job.error_message = "File upload incomplete"
            job.save()
            return

        # If status is still "uploading", update to "queued" (file should be uploaded by now)
        if job.status == "uploading":
            job.status = "queued"
            job.save(update_fields=["status"])
            logger.info(f"Job {job_id} ready for processing")

        # Step 2: Transcription / Text Extraction
        if not hasattr(job, "transcription") or job.transcription is None:
            # Check if it is a PDF
            if job.file_type == "application/pdf" or job.filename.lower().endswith(
                ".pdf"
            ):
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
                job.save(update_fields=["transcription_id"])

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
                # Helper function to serialize AssemblyAI objects
                def serialize_assemblyai_obj(obj):
                    if isinstance(obj, list):
                        return [serialize_assemblyai_obj(item) for item in obj]
                    if hasattr(obj, "dict"):
                        return obj.dict()
                    if hasattr(obj, "__dict__"):
                        return str(obj)  # Fallback for unknown objects
                    return obj

                if hasattr(transcript, "json_response"):
                    # The SDK often provides the raw JSON response directly
                    raw_response_data = transcript.json_response
                elif hasattr(transcript, "model_dump"):
                    raw_response_data = transcript.model_dump()
                elif hasattr(transcript, "dict"):
                    raw_response_data = transcript.dict()
                else:
                    # Fallback: convert to dict manually
                    raw_response_data = {
                        "id": transcript.id,
                        "text": transcript.text,
                        "status": transcript.status.value
                        if hasattr(transcript.status, "value")
                        else str(transcript.status),
                    }
                    # Include other common attributes and serialize them
                    for attr in [
                        "error",
                        "confidence",
                        "words",
                        "utterances",
                        "chapters",
                        "entities",
                    ]:
                        if hasattr(transcript, attr):
                            val = getattr(transcript, attr)
                            if val is not None:
                                # Ensure lists of objects (like Words) are serialized
                                if isinstance(val, list):
                                    raw_response_data[attr] = [
                                        item.dict()
                                        if hasattr(item, "dict")
                                        else getattr(item, "__dict__", str(item))
                                        for item in val
                                    ]
                                else:
                                    raw_response_data[attr] = val

                # Double check to ensure we have pure dicts
                # (The error often comes from 'words' being a list of objects even if 'dict()' is called on parent sometimes)
                # If we manually built it or if the SDK returned mixed types, let's try to verify.
                # However, usually the SDK's .dict() or .json_response should work.
                # The safest bet for AssemblyAI v2 SDK is often .json_response if available, or converting list items.

                # Refined serialization for specific known list fields if they are still objects
                if "words" in raw_response_data and isinstance(
                    raw_response_data["words"], list
                ):
                    if raw_response_data["words"] and not isinstance(
                        raw_response_data["words"][0], dict
                    ):
                        raw_response_data["words"] = [
                            w.dict() if hasattr(w, "dict") else str(w)
                            for w in raw_response_data["words"]
                        ]

                Transcription.objects.create(
                    job=job,
                    external_id=transcript.id,
                    text=transcript.text,
                    raw_response=raw_response_data,
                )
                job.transcription_id = transcript.id
                job.save(update_fields=["transcription_id"])
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
                executor.submit(generate_single, mt): mt for mt in job.material_types
            }

            for future in as_completed(futures):
                material_type = futures[future]
                try:
                    mt, content = future.result()
                    results[mt] = content
                    logger.info(f"Completed generating {mt} for job {job_id}")
                except Exception as e:
                    logger.error(
                        f"Failed to generate {material_type} for job {job_id}: {e}"
                    )
                    errors.append((material_type, str(e)))

        # Save all generated content
        for material_type, content in results.items():
            GeneratedContent.objects.create(
                job=job, type=material_type, content=content
            )

        # Check if all requested materials were successfully generated
        if errors:
            # Some materials failed to generate
            failed_types = [mt for mt, _ in errors]
            error_messages = [f"{mt}: {msg}" for mt, msg in errors]
            error_summary = "; ".join(error_messages)

            logger.warning(
                f"Job {job_id} partially completed. "
                f"Failed to generate: {failed_types}. "
                f"Successfully generated: {list(results.keys())}"
            )

            # Mark job as failed if no materials were generated at all
            if not results:
                job.status = "failed"
                job.error_message = f"All content generation failed: {error_summary}"
                job.save()
                return

            # Mark as completed but log the partial failure
            # The job is partially successful - some materials were generated
            job.status = "completed"
            job.progress = 100
            job.completed_at = from_datetime()
            job.error_message = (
                f"Partial completion - failed: {', '.join(failed_types)}"
            )
            job.save()
            logger.info(
                f"Job {job_id} completed partially. "
                f"Generated: {list(results.keys())}, Failed: {failed_types}"
            )
        else:
            # All materials generated successfully
            job.status = "completed"
            job.progress = 100
            job.completed_at = from_datetime()
            job.save()
            logger.info(f"Job {job_id} completed successfully with all materials")

            # Send completion email
            if user_email:
                from apps.core.utils.email import send_job_completed_email

                send_job_completed_email(
                    user_email, str(job.id), job.filename, list(results.keys())
                )

        # Update cached content metadata for fast list queries
        # This is an optimization - failure shouldn't affect job status
        try:
            job.update_content_cache()
        except Exception as cache_error:
            logger.warning(
                f"Failed to update content cache for job {job_id}: {cache_error}. "
                "Job completed successfully but cache update failed."
            )
            # Don't re-raise - cache update is non-critical

    except Exception as e:
        logger.exception(f"Error processing job {job_id}")
        job.status = "failed"
        job.error_message = f"Processing failed: {str(e)}"
        job.save()
