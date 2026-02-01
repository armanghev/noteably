"""URL configuration for ingestion app."""

from django.urls import path

from . import views

urlpatterns = [
    path("process", views.process_upload, name="process_upload"),
    path("dashboard/", views.dashboard_data, name="dashboard_data"),
    path(
        "jobs/<uuid:job_id>/signed-url/",
        views.get_signed_file_url,
        name="get_signed_file_url",
    ),
    path("jobs/<uuid:job_id>/", views.job_detail, name="job_detail"),
    path("jobs/<uuid:job_id>/cancel/", views.cancel_job, name="cancel_job"),
    path("jobs/<uuid:job_id>/retry/", views.retry_job, name="retry_job"),
    path("jobs/", views.JobListView.as_view(), name="list_jobs"),
]
