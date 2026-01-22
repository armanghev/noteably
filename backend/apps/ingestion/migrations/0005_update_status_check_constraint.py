# Migration to update the jobs_status_check constraint to include 'uploading' status

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('ingestion', '0004_alter_job_status'),
    ]

    operations = [
        migrations.RunSQL(
            # Drop the old constraint and create a new one with 'uploading' included
            sql="""
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
            """,
            # Reverse: restore the old constraint without 'uploading'
            reverse_sql="""
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
            """,
        ),
    ]