import logging
import os
import uuid

import resend
from django.conf import settings
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)

# Initialize Resend API key
resend.api_key = getattr(settings, "RESEND_API_KEY", os.getenv("RESEND_API_KEY"))


def send_email(to_email: str, subject: str, html_content: str):
    """
    Send an email using Resend.
    """
    if not resend.api_key:
        logger.warning(
            f"RESEND_API_KEY not set (Value: {resend.api_key}). Email to {to_email} with subject '{subject}' not sent."
        )
        return

    logger.info(
        f"Attempting to send email to {to_email} with subject '{subject}' using key prefix {resend.api_key[:4] if resend.api_key else 'None'}..."
    )

    from_email = getattr(
        settings,
        "DEFAULT_FROM_EMAIL",
        os.getenv("DEFAULT_FROM_EMAIL", "onboarding@resend.dev"),
    )

    try:
        r = resend.Emails.send(
            {
                "from": from_email,
                "to": to_email,
                "subject": subject,
                "html": html_content,
            }
        )
        logger.info(f"Email sent to {to_email}: {r}")
        return r
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return None


def send_upload_received_email(to_email: str, filename: str):
    """
    Send email confirming upload receipt.
    """
    subject = "Upload Received - Noteably"

    html_content = render_to_string(
        "emails/upload_received.html",
        {"filename": filename, "ref_id": str(uuid.uuid4())[:8]},
    )

    return send_email(to_email, subject, html_content)


def send_job_completed_email(
    to_email: str, job_id: str, filename: str, material_types: list = None
):
    """
    Send email confirming job completion.
    """
    subject = "Your Study Materials are Ready! - Noteably"

    link = f"http://localhost:5173/study-sets/{job_id}"

    # Default text if no types provided
    materials_text = "summary, notes, flashcards, and quizzes"

    # Normalize material types for template context (for checks like "summary" in types)
    context_types = []
    if material_types:
        context_types = [t.lower() for t in material_types]
        unique_types = sorted(list(set(context_types)))

        # Build natural language string
        if len(unique_types) == 1:
            materials_text = f"{unique_types[0]}"
        elif len(unique_types) == 2:
            materials_text = f"{unique_types[0]} and {unique_types[1]}"
        else:
            materials_text = f"{', '.join(unique_types[:-1])}, and {unique_types[-1]}"

    html_content = render_to_string(
        "emails/job_completed.html",
        {
            "filename": filename,
            "link": link,
            "materials_text_natural": materials_text,
            "material_types": context_types,
            "ref_id": str(uuid.uuid4())[:8],
        },
    )

    return send_email(to_email, subject, html_content)


def send_welcome_email(to_email: str, first_name: str = "there"):
    """
    Send welcome email to new users.
    """
    subject = "Welcome to Noteably!"
    # consistent with other email utils
    action_url = "http://localhost:5173/dashboard"

    html_content = render_to_string(
        "emails/welcome.html",
        {
            "first_name": first_name,
            "action_url": action_url,
            "ref_id": str(uuid.uuid4())[:8],
        },
    )

    return send_email(to_email, subject, html_content)
