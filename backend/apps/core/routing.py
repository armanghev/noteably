from apps.core.consumers import UserConsumer
from django.urls import path

websocket_urlpatterns = [
    path("ws/user/", UserConsumer.as_asgi()),
]
