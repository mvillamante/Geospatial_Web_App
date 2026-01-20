from django.urls import path
from .backend_views.admin_views import AssignUserRoleView, UserListView
from .backend_views.auth_views import MyTokenObtainPairView, RegisterView, get_current_user, sign_up, login_user
from .backend_views.geocoding_views import reverse_geocode
from .backend_views.incident_views import IncidentReportCreateView, IncidentReportPhotoSignedUrlView, IncidentReportListView
from .backend_views.misc_views import getRoutes, testEndPoint
from .backend_views.researcher_views import CreateResearcherRequestView, ResearcherRequestListView, ApproveRejectResearcherRequestView


from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

urlpatterns = [
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Admin Views
    path('admin/users/<int:pk>/role/', AssignUserRoleView.as_view()),
    path('admin/users/', UserListView.as_view(), name='admin-users'),
    
    # Auth Views
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path("current_user/", get_current_user, name="get_current_user"),
    path('sign_up/', sign_up, name='sign_up'),
    path("login_user/", login_user, name="login_user"),
    
    # Geocoding Views
    path("geocoding/reverse/", reverse_geocode, name="reverse_geocode"),
    
    # Incident Views
    path("reports/", IncidentReportCreateView.as_view(), name="incident-create"),
    path("reports/<int:report_id>/photo-url/", IncidentReportPhotoSignedUrlView.as_view(), name="incident-photo-url"),
    path("reports/list/", IncidentReportListView.as_view(), name="incident-report-list"),
    
    # Misc Views
    path('test/', testEndPoint, name='test'),

    # Researcher Views
    path("researcher/request/", CreateResearcherRequestView.as_view(), name="researcher_request_create"),
    path("admin/researcher_requests/", ResearcherRequestListView.as_view(), name="researcher_requests_list"),
    path("admin/researcher_requests/<int:pk>/", ApproveRejectResearcherRequestView.as_view(), name="researcher_request_update"),
    
    path('', getRoutes) # should be always last
]