from django.urls import path
from .views.satellite import get_copernicus
from api.views import auth_views

urlpatterns = [
    path("api/me/", auth_views.get_current_user, name="current_user"),
    path("copernicus/", get_copernicus),
]
