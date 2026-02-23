"""
URL configuration for Noteably project.
"""

from django.contrib import admin
from django.urls import path, include
from apps.accounts import views as account_views

urlpatterns = [
    path("admin/", admin.site.urls),
    # Health check (no auth)
    path("health/", account_views.health_check, name="health"),
    # API endpoints
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.cloud.urls")),
    path("api/", include("apps.ingestion.urls")),
    path("api/", include("apps.generation.urls")),
    path("api/", include("apps.export.urls")),
]
