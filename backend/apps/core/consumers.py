from channels.generic.websocket import AsyncJsonWebsocketConsumer


class UserConsumer(AsyncJsonWebsocketConsumer):
    """
    Consumer for user-specific updates (e.g., Job status).
    Connected at: /ws/user/
    Auth: Requires valid Supabase token in query string.
    """

    async def connect(self):
        user_id = self.scope.get("user_id")

        if not user_id:
            # Reject connection if not authenticated
            await self.close()
            return

        self.user_group_name = f"user_{user_id}"

        # Join user group
        await self.channel_layer.group_add(self.user_group_name, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        # Leave user group
        if hasattr(self, "user_group_name"):
            await self.channel_layer.group_discard(
                self.user_group_name, self.channel_name
            )

    async def job_update(self, event):
        """
        Handler for job.update messages sent to the group.
        """
        # Send message to WebSocket
        print(
            f"[Consumer] Sending job update to {self.user_group_name}: {event['data'].get('status')}"
        )
        await self.send_json({"type": "job.update", "data": event["data"]})
