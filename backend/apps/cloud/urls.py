"""URL configuration for cloud storage endpoints."""

from django.urls import path

from . import views

urlpatterns = [
    path("cloud/connect/<str:provider>/", views.connect, name="cloud_connect"),
    path("cloud/connect-url/<str:provider>/", views.connect_url, name="cloud_connect_url"),
    path("cloud/callback/<str:provider>/", views.callback, name="cloud_callback"),
    path("cloud/connections/", views.list_connections, name="cloud_list_connections"),
    path("cloud/connections/<str:provider>/", views.disconnect, name="cloud_disconnect"),
    path("cloud/picker-token/<str:provider>/", views.picker_token, name="cloud_picker_token"),
    path("cloud/import/", views.cloud_import, name="cloud_import"),
]
