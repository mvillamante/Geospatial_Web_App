from django.urls import path
from .views.auth_views import get_current_user, sign_up, login_user
from .views.views import MyTokenObtainPairView, RegisterView, testEndPoint, testEndPoint, getRoutes
from .views.geocoding import reverse_geocode

from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

urlpatterns = [
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('test/', testEndPoint, name='test'),
    path('', getRoutes),
    
    path("current_user/", get_current_user, name="get_current_user"),
    path('sign_up/', sign_up, name='sign_up'),
    path("login_user/", login_user, name="login_user"),
    path("geocoding/reverse/", reverse_geocode, name="reverse_geocode"),
]