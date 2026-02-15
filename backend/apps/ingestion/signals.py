from apps.ingestion.models import Job
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=Job)
def notify_job_status(sender, instance, created, **kwargs):
    """
    Send WebSocket update when Job status changes.
    """
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    # Group name must match UserConsumer
    user_group = f"user_{instance.user_id}"
    print(
        f"[Signal] Job {instance.id} saved. Status: {instance.status}, sending to {user_group}"
    )

    update_data = {
        "id": str(instance.id),
        "job_id": str(instance.id),
        "status": instance.status,
        "progress": instance.progress,
        "current_step": instance.current_step,
        "filename": instance.filename,
    }

    if instance.error_message:
        update_data["error_message"] = instance.error_message

    if instance.created_at:
        update_data["created_at"] = instance.created_at.isoformat()

    if instance.completed_at:
        update_data["completed_at"] = instance.completed_at.isoformat()

    event = {"type": "job.update", "data": update_data}

    try:
        async_to_sync(channel_layer.group_send)(user_group, event)
    except Exception as e:
        # Don't break the save loop if redis is down
        print(f"Failed to send WS update: {e}")
