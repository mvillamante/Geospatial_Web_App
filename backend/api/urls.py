from django.urls import path
from .views.satellite import get_copernicus

urlpatterns = [
    #path('login/', auth_views.login_view),
    
    path("copernicus/", get_copernicus),
]
