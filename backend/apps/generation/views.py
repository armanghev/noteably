import logging

from apps.accounts.permissions import IsAuthenticated
from apps.core.exceptions import ThirdPartyServiceError
from apps.core.throttling import BurstRateThrottle
from apps.ingestion.models import Job
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response

from .models import ChatMessage, GeneratedContent, QuizAttempt
from .prompts import get_assistant_system_prompt
from .serializers import ChatMessageSerializer, QuizAttemptSerializer
from .service import GeminiService

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_job_content(request, job_id):
    """
    Retrieve all generated content for a specific job.
    """
    try:
        # Verify job exists and belongs to user
        job = Job.objects.get(id=job_id, user_id=request.user_id)
    except Job.DoesNotExist:
        return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

    # Get content
    contents = GeneratedContent.objects.filter(job=job)

    # Normalize type keys (web frontend sends "quizzes" but canonical key is "quiz")
    TYPE_ALIASES = {"quizzes": "quiz"}

    data = {}
    for item in contents:
        key = TYPE_ALIASES.get(item.type, item.type)
        data[key] = item.content

    return Response({"job_id": job_id, "status": job.status, "content": data})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def quiz_attempts(request, job_id):
    """
    GET: Retrieve all quiz attempts for a specific job.
    POST: Save a quiz attempt result.
    """
    try:
        # Verify job exists and belongs to user
        job = Job.objects.get(id=job_id, user_id=request.user_id)
    except Job.DoesNotExist:
        return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        # Get all attempts for this job by this user
        attempts = QuizAttempt.objects.filter(job=job, user_id=request.user_id)
        serializer = QuizAttemptSerializer(attempts, many=True)
        return Response({"results": serializer.data})

    elif request.method == "POST":
        # Validate request data
        score = request.data.get("score")
        total_questions = request.data.get("total_questions")
        answers = request.data.get("answers", [])

        if score is None or total_questions is None:
            return Response(
                {"error": "score and total_questions are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calculate percentage
        percentage = (score / total_questions * 100) if total_questions > 0 else 0

        # Create quiz attempt
        quiz_attempt = QuizAttempt.objects.create(
            job=job,
            user_id=request.user_id,
            score=score,
            total_questions=total_questions,
            percentage=percentage,
            answers=answers,
        )

        serializer = QuizAttemptSerializer(quiz_attempt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([BurstRateThrottle])
def assistant_chat(request, job_id):
    """
    AI assistant chat endpoint. Accepts a message + conversation history,
    returns an assistant response. Optionally generates and saves content.
    """
    try:
        job = Job.objects.get(id=job_id, user_id=request.user_id)
    except Job.DoesNotExist:
        return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

    message = request.data.get("message")
    if not message:
        return Response(
            {"error": "message is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    conversation_history = request.data.get("conversation_history", [])
    if not isinstance(conversation_history, list):
        conversation_history = []
    conversation_history = conversation_history[-10:]
    action = request.data.get("action")

    # Build context
    transcription = getattr(job, "transcription", None)
    transcript = transcription.text if transcription else ""

    generated_content = {}
    for item in GeneratedContent.objects.filter(job=job):
        key = "quiz" if item.type == "quizzes" else item.type
        generated_content[key] = item.content

    # Handle generation actions
    if action in ("generate_flashcards", "generate_quiz"):
        return _handle_generation_action(job, action, transcript, generated_content)

    # Build Gemini conversation
    system_prompt = get_assistant_system_prompt(transcript, generated_content)

    contents = []
    for turn in conversation_history:
        role = "user" if turn.get("role") == "user" else "model"
        contents.append({"role": role, "parts": [{"text": turn.get("content", "")}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    # Save user message
    ChatMessage.objects.create(
        job=job,
        role="user",
        content=message,
    )

    try:
        reply = GeminiService.generate_chat_response(contents, system_prompt)

        # Save assistant response
        ChatMessage.objects.create(
            job=job,
            role="assistant",
            content=reply,
        )
    except ThirdPartyServiceError:
        return Response(
            {"error": "Assistant is unavailable. Please try again."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(
        {
            "message": reply,
            "action": None,
            "generated_items": None,
        }
    )


def _handle_generation_action(job, action, transcript, generated_content=None):
    """Generate and save new flashcards or quiz questions, merging into existing record."""
    content_type = "flashcards" if action == "generate_flashcards" else "quiz"

    context_text = transcript
    if generated_content and action == "generate_flashcards":
        existing = generated_content.get("flashcards", {}).get("flashcards", [])
        if existing:
            existing_summary = "\n".join(f"- {c['front']}" for c in existing[:30])
            context_text = f"{transcript}\n\n[ALREADY GENERATED - DO NOT DUPLICATE THESE]\n{existing_summary}"
    elif generated_content and action == "generate_quiz":
        existing = generated_content.get("quiz", {}).get("questions", [])
        if existing:
            existing_summary = "\n".join(f"- {q['question']}" for q in existing[:20])
            context_text = f"{transcript}\n\n[ALREADY GENERATED - DO NOT DUPLICATE THESE]\n{existing_summary}"

    try:
        new_content = GeminiService.generate_content(context_text, content_type)
    except Exception:
        logger.error("Assistant generation failed", exc_info=True)
        return Response(
            {"error": "Generation failed. Please try again."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Merge into existing record (unique_together constraint)
    try:
        existing = GeneratedContent.objects.get(job=job, type=content_type)
        if content_type == "flashcards":
            existing_items = existing.content.get("flashcards", [])
            new_items = new_content.get("flashcards", [])
            existing.content = {"flashcards": existing_items + new_items}
        else:
            existing_items = existing.content.get("questions", [])
            new_items = new_content.get("questions", [])
            existing.content = {"questions": existing_items + new_items}
        existing.save(update_fields=["content"])
    except GeneratedContent.DoesNotExist:
        GeneratedContent.objects.create(job=job, type=content_type, content=new_content)

    job.update_content_cache()

    generated_items = new_content.get(
        "flashcards" if content_type == "flashcards" else "questions", []
    )
    action_done = (
        "generated_flashcards" if content_type == "flashcards" else "generated_quiz"
    )
    count = len(generated_items)
    noun = "flashcards" if content_type == "flashcards" else "quiz questions"

    return Response(
        {
            "message": f"I generated {count} new {noun} and saved them to your study set.",
            "action": action_done,
            "generated_items": generated_items,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_chat_history(request, job_id):
    """Retrieve chat history for a specific job."""
    try:
        job = Job.objects.get(id=job_id, user_id=request.user_id)
    except Job.DoesNotExist:
        return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

    messages = job.chat_messages.all()
    serializer = ChatMessageSerializer(messages, many=True)
    return Response({"messages": serializer.data})
