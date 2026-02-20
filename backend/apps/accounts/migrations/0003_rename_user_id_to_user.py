# Rename user_id field to user on APIKey model (state-only).
# DB column is already user_id, which is what Django expects for a FK named 'user'.

from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0002_alter_apikey_user_id'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RenameField(
                    model_name='apikey',
                    old_name='user_id',
                    new_name='user',
                ),
            ],
            database_operations=[],
        ),
    ]
