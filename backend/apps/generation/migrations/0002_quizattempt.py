# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('generation', '0001_initial'),
        ('ingestion', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='QuizAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_id', models.UUIDField(db_index=True, help_text="User who took the quiz")),
                ('score', models.IntegerField(help_text='Number of correct answers')),
                ('total_questions', models.IntegerField(help_text='Total number of questions')),
                ('percentage', models.FloatField(help_text='Score as percentage (0-100)')),
                ('answers', models.JSONField(default=list, help_text="List of user's answers: [{question_index, selected_option, is_correct}]")),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quiz_attempts', to='ingestion.job')),
            ],
            options={
                'db_table': 'quiz_attempts',
                'indexes': [
                    models.Index(fields=['job', 'user_id'], name='quiz_attempts_job_user_idx'),
                    models.Index(fields=['user_id', '-created_at'], name='quiz_attempts_user_created_idx'),
                ],
                'ordering': ['-created_at'],
            },
        ),
    ]
