from django.db import models
from apps.ingestion.models import Job


class GeneratedContent(models.Model):
    """Stores generated content like summaries, notes, quizzes."""

    TYPE_CHOICES = [
        ("summary", "Summary"),
        ("notes", "Study Notes"),
        ("flashcards", "Flashcards"),
        ("quiz", "Quiz"),
    ]

    job = models.ForeignKey(
        Job, on_delete=models.CASCADE, related_name="generated_content"
    )
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    content = models.JSONField(help_text="The structured content generated (e.g. JSON)")

    # Metadata
    model_version = models.CharField(max_length=50, default="gemini-1.5-flash")
    token_usage = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "generated_content"
        indexes = [
            models.Index(fields=["job", "type"]),
        ]
        unique_together = ["job", "type"]

    def __str__(self):
        return f"{self.type} for Job {self.job_id}"


class QuizAttempt(models.Model):
    """Stores quiz attempt results for tracking user performance."""

    job = models.ForeignKey(
        Job, on_delete=models.CASCADE, related_name="quiz_attempts"
    )
    user_id = models.UUIDField(db_index=True, help_text="User who took the quiz")
    score = models.IntegerField(help_text="Number of correct answers")
    total_questions = models.IntegerField(help_text="Total number of questions")
    percentage = models.FloatField(help_text="Score as percentage (0-100)")
    answers = models.JSONField(
        default=list,
        help_text="List of user's answers: [{question_index, selected_option, is_correct}]",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "quiz_attempts"
        indexes = [
            models.Index(fields=["job", "user_id"]),
            models.Index(fields=["user_id", "-created_at"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Quiz attempt for Job {self.job_id} - {self.score}/{self.total_questions} ({self.percentage:.1f}%)"
