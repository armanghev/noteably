from django.urls import path
from . import views

urlpatterns = [
    path("content/<uuid:job_id>/", views.get_job_content, name="get_job_content"),
    path("content/<uuid:job_id>/assistant/", views.assistant_chat, name="assistant_chat"),
    path("quizzes/<uuid:job_id>/attempts/", views.quiz_attempts, name="quiz_attempts"),
]
