"""URL configuration for export app."""
from django.urls import path
from . import views

urlpatterns = [
    path("export", views.export_job, name="export_job"),
]
