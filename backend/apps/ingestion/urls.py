"""URL configuration for ingestion app."""

from django.urls import path

from . import views

urlpatterns = [
    path("process", views.process_upload, name="process_upload"),
    path("dashboard/", views.dashboard_data, name="dashboard_data"),
    path("jobs/<uuid:job_id>/signed-url/", views.get_signed_file_url, name="get_signed_file_url"),
    path("jobs/<uuid:job_id>/", views.get_job_status, name="job_status"),
    path("jobs/", views.list_jobs, name="list_jobs"),
]
