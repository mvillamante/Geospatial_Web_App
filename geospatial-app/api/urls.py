from django.urls import path
from .views.satellite import get_copernicus

urlpatterns = [
    path("copernicus/", get_copernicus),
    
]
