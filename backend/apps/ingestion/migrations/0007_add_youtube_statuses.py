# Migration to update status check constraint for YouTube support

from django.db import migrations


def add_youtube_statuses(apps, schema_editor):
    if schema_editor.connection.vendor == "sqlite":
        return
    schema_editor.execute(
        """
        ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
        ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (
            status IN (
                'checking_video',
                'downloading',
                'uploading',
                'queued',
                'transcribing',
                'extracting_text',
                'generating_summary',
                'generating_notes',
                'generating_flashcards',
                'generating_quiz',
                'generating',
                'completed',
                'failed',
                'cancelled'
            )
        );
        """
    )


def revert_youtube_statuses(apps, schema_editor):
    if schema_editor.connection.vendor == "sqlite":
        return
    schema_editor.execute(
        """
        ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
        ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (
            status IN (
                'uploading',
                'queued',
                'transcribing',
                'extracting_text',
                'generating_summary',
                'generating_notes',
                'generating_flashcards',
                'generating_quiz',
                'generating',
                'completed',
                'failed'
            )
        );
        """
    )


class Migration(migrations.Migration):

    dependencies = [
        ('ingestion', '0006_job_celery_task_id'),
    ]

    operations = [
        migrations.RunPython(add_youtube_statuses, revert_youtube_statuses),
    ]
