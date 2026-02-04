from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .backend_views.admin_views import *
from .backend_views.auth_views import *
from .backend_views.cms_views import *
from .backend_views.geocoding_views import *
from .backend_views.incident_views import *
from .backend_views.misc_views import *
from .backend_views.researcher_views import *
from .backend_views.satellite import *
from .backend_views.password_reset_views import *
from .backend_views.tomtom_views import tomtom_roads_tile, tomtom_traffic_tile
from .backend_views.community_feed_views import *

urlpatterns = [
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Admin_Views
    path("admin/users/", UserListView.as_view(), name="admin-users"),
    path('admin/users/<int:pk>/role/', AssignUserRoleView.as_view()),
    path('admin/users/<int:pk>/toggle-status/', ToggleUserStatusView.as_view()),
    path('admin/users/<int:pk>/revoke-researcher/', RevokeResearcherView.as_view()),
    path('admin/users/create/', CreateStaffUserView.as_view(), name="create-staff-user"),
    
    # Researcher_Views
    path("researcher/request/", CreateResearcherRequestView.as_view(), name="researcher_request_create"),
    path("admin/researcher_requests/", ResearcherRequestListView.as_view(), name="researcher_requests_list"),
    path("admin/researcher_requests/<int:pk>/", ApproveRejectResearcherRequestView.as_view(), name="researcher_request_update"),

    # Auth_Views
    path("token/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("register/", RegisterView.as_view(), name="auth_register"),
    path("current_user/", get_current_user, name="get_current_user"),
    path("sign_up/", sign_up, name="sign_up"),
    path("login_user/", login_user, name="login_user"),
    path("users/me/", MeView.as_view(), name="users-me"),

    #Password_Reset_Views
    path("password-reset/request/", PasswordResetRequestOTP.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmOTP.as_view(), name="password-confirm"),

    # Geocoding_Views
    path("geocoding/reverse/", reverse_geocode, name="reverse_geocode"),
    path("evacuation-centers/", EvacuationCenterListAPIView.as_view()),
    path("evacuation-centers/<int:pk>/", EvacuationCenterDetailAPIView.as_view()),

    # Incident_Views
    path("reports/", IncidentReportCreateView.as_view(), name="incident-create"),
    path("reports/<int:report_id>/photo-url/", IncidentReportPhotoSignedUrlView.as_view(), name="incident-photo-url"),
    path("reports/list/", IncidentReportListView.as_view(), name="incident-report-list"),
    path("reports/my/", MyIncidentReportsView.as_view(), name="incident-report-list-my"),
    path("reports/queue/", IncidentReportsQueueView.as_view(), name="incident-report-queue"),
    path('incident-reports/verified/', VerifiedIncidentReportsView.as_view(), name='verified-reports'),
    path("reports/<int:report_id>/", IncidentReportPatchView.as_view(), name="report-patch"),
    path("reports/list/officers/", OfficerListView.as_view(), name="officer-list"),
    
    # Satellite_Views
    path("satellite/ndvi/", get_ndvi_image, name="satellite_ndvi"),

    # TomTom Tiles
    path("tomtom/roads/<int:z>/<int:x>/<int:y>.png", tomtom_roads_tile, name="tomtom_roads_tile"),
    path("tomtom/traffic/<int:z>/<int:x>/<int:y>.png", tomtom_traffic_tile, name="tomtom_traffic_tile"),
    
    #CMS_Views
    path("cms/guides/", list_guides),
    path("cms/guides/create/", create_guide),
    path("cms/guides/<int:pk>/", update_guide),
    path("cms/guides/<int:pk>/publish/", toggle_publish),
    path("cms/guides/<int:pk>/archive/", archive_guide),
    path("cms/guides/<int:pk>/permanent-delete/", permanent_delete_guide),
    path("cms/guides/<int:pk>/attachments/", upload_guide_attachment),
    path("cms/guides/<int:pk>/restore/", restore_guide),


    # Community_Feed_Views
    path("community-feed/", community_feed, name="community-feed"),

    # Misc_Views
    path("test/", testEndPoint, name="test"),
    path("", getRoutes, name="routes"),  
]
