# Migration to update the jobs_status_check constraint to include 'uploading' status

from django.db import migrations


def add_status_constraint(apps, schema_editor):
    # SQLite does not support ALTER TABLE ADD/DROP CONSTRAINT; skip on it
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


def remove_status_constraint(apps, schema_editor):
    # SQLite does not support ALTER TABLE ADD/DROP CONSTRAINT; skip on it
    if schema_editor.connection.vendor == "sqlite":
        return
    schema_editor.execute(
        """
        ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
        ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (
            status IN (
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
        ('ingestion', '0004_alter_job_status'),
    ]

    operations = [
        migrations.RunPython(add_status_constraint, remove_status_constraint),
    ]
