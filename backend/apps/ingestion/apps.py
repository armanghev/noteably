from django.apps import AppConfig


class IngestionConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ingestion"
    verbose_name = "File Ingestion & Job Management"

    def ready(self):
        # Import signals to register handlers
        from . import signals  # noqa: F401
