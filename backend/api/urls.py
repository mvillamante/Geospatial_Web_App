from django.urls import path
from .backend_views.auth_views import get_current_user, sign_up, login_user, MyTokenObtainPairView, RegisterView
from .backend_views.misc_views import testEndPoint, getRoutes
from .backend_views.geocoding_views import reverse_geocode
from .backend_views.admin_views import UserListView, AssignUserRoleView, ToggleUserStatusView

from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

urlpatterns = [
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Admin Views
    path('admin/users/<int:pk>/role/', AssignUserRoleView.as_view()),
    path('admin/users/<int:pk>/toggle-status/', ToggleUserStatusView.as_view()),
    path('admin/users/', UserListView.as_view(), name='admin-users'),
    
    # Auth Views
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path("current_user/", get_current_user, name="get_current_user"),
    path('sign_up/', sign_up, name='sign_up'),
    path("login_user/", login_user, name="login_user"),
    
    # Geocoding Views
    path("geocoding/reverse/", reverse_geocode, name="reverse_geocode"),
]