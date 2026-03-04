"""Models for job tracking and file management."""

import uuid

from django.db import models


class Job(models.Model):
    """Central job tracking for upload-to-materials pipeline."""

    STATUS_CHOICES = [
        ("checking_video", "Checking Video"),
        ("downloading", "Downloading"),
        ("uploading", "Uploading"),
        ("queued", "Queued"),
        ("transcribing", "Transcribing"),
        ("extracting_text", "Extracting Text"),
        ("generating_summary", "Generating Summary"),
        ("generating_notes", "Generating Notes"),
        ("generating_flashcards", "Generating Flashcards"),
        ("generating_quiz", "Generating Quiz"),
        ("generating", "Generating"),  # Fallback/General
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    # Primary key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # User (references Supabase auth.users)
    user_id = models.UUIDField(db_index=True)

    # File information
    filename = models.CharField(max_length=255)
    file_size_bytes = models.BigIntegerField()
    file_type = models.CharField(max_length=255)
    storage_url = models.TextField()  # Cloudflare R2 URL

    # Material selection (what user requested)
    material_types = models.JSONField(
        default=list,
        help_text="Types of materials to generate: summary, notes, flashcards, quiz",
    )
    options = models.JSONField(
        default=dict,
        blank=True,
        help_text="Optional parameters like summary_length, focus, etc.",
    )

    # Processing status
    status = models.CharField(
        max_length=50, choices=STATUS_CHOICES, default="queued", db_index=True
    )
    progress = models.IntegerField(default=0)  # 0-100
    current_step = models.CharField(max_length=100, blank=True)

    # Relations (set later in pipeline)
    transcription_id = models.CharField(max_length=100, null=True, blank=True)

    # Error tracking
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)

    # Task Tracking
    celery_task_id = models.CharField(
        max_length=255, null=True, blank=True, db_index=True
    )

    # Cached content metadata (denormalized for fast list queries)
    # Updated when content is generated - avoids loading GeneratedContent for lists
    cached_flashcard_count = models.IntegerField(default=0)
    cached_quiz_count = models.IntegerField(default=0)
    cached_content_types = models.JSONField(default=list)
    cached_summary_title = models.CharField(max_length=500, blank=True)
    cached_summary_preview = models.CharField(max_length=250, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "jobs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user_id", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self):
        return f"Job {self.id} - {self.filename} ({self.status})"

    def estimate_processing_time(self) -> int:
        """
        Estimate processing time in seconds based on file size.

        Returns:
            Estimated seconds
        """
        # Rough estimate: 1 minute of audio = 30 seconds processing
        # You can refine this based on actual metrics
        size_mb = self.file_size_bytes / (1024 * 1024)
        estimated_duration_minutes = size_mb / 10  # Rough estimate
        return int(estimated_duration_minutes * 30)

    def update_content_cache(self):
        """
        Update cached content metadata from generated_content.
        Call this after content generation completes.
        """
        content_types = []
        flashcard_count = 0
        quiz_count = 0
        summary_title = ""
        summary_preview = ""

        for content in self.generated_content.all():
            content_types.append(content.type)

            if content.type == "flashcards":
                flashcards = content.content.get("flashcards", [])
                flashcard_count = len(flashcards) if isinstance(flashcards, list) else 0
            elif content.type in ("quiz", "quizzes"):
                questions = content.content.get("questions", [])
                quiz_count = len(questions) if isinstance(questions, list) else 0
            elif content.type == "summary":
                summary_title = content.content.get("title", "")[:500]
                summary = content.content.get("summary", "")
                summary_preview = (
                    (summary[:197] + "...") if len(summary) > 200 else summary[:250]
                )

        self.cached_content_types = content_types
        self.cached_flashcard_count = flashcard_count
        self.cached_quiz_count = quiz_count
        self.cached_summary_title = summary_title
        self.cached_summary_preview = summary_preview
        self.save(
            update_fields=[
                "cached_content_types",
                "cached_flashcard_count",
                "cached_quiz_count",
                "cached_summary_title",
                "cached_summary_preview",
            ]
        )


# Import signals to ensure they are registered when models are loaded
