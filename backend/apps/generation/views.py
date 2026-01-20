from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from apps.accounts.permissions import IsAuthenticated
from .models import GeneratedContent, QuizAttempt
from .serializers import QuizAttemptSerializer
from apps.ingestion.models import Job


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

    data = {}
    for item in contents:
        data[item.type] = item.content

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
