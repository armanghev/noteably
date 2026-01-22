"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

import apps.core.routing  # noqa: E402
from apps.core.middleware import SupabaseWebSocketMiddleware  # noqa: E402
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": SupabaseWebSocketMiddleware(
            URLRouter(apps.core.routing.websocket_urlpatterns)
        ),
    }
)
