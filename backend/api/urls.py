from django.urls import path

from rest_framework_simplejwt.views import TokenRefreshView

from .backend_views.admin_views import AssignUserRoleView, UserListView
from .backend_views.auth_views import (
    MyTokenObtainPairView,
    RegisterView,
    get_current_user,
    sign_up,
    login_user,
)
from .backend_views.cms_views import (
    list_guides,
    create_guide,
    update_guide,
    toggle_publish,
    archive_guide,
)
from .backend_views.geocoding_views import reverse_geocode
from .backend_views.incident_views import (
    IncidentReportCreateView,
    IncidentReportPhotoSignedUrlView,
    IncidentReportListView,
    MyIncidentReportsView,  
)
from .backend_views.misc_views import getRoutes, testEndPoint
from .backend_views.researcher_views import (
    CreateResearcherRequestView,
    ResearcherRequestListView,
    ApproveRejectResearcherRequestView,
)
from .backend_views.satellite import get_ndvi_image
from .backend_views.tomtom_views import tomtom_roads_tile, tomtom_traffic_tile

urlpatterns = [
    # JWT
    path("token/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Admin
    path("admin/users/", UserListView.as_view(), name="admin-users"),
    path("admin/users/<int:pk>/role/", AssignUserRoleView.as_view(), name="assign-user-role"),

    # Auth
    path("register/", RegisterView.as_view(), name="auth_register"),
    path("current_user/", get_current_user, name="get_current_user"),
    path("sign_up/", sign_up, name="sign_up"),
    path("login_user/", login_user, name="login_user"),

    # Geocoding
    path("geocoding/reverse/", reverse_geocode, name="reverse_geocode"),

    # Incident Reports
    path("reports/", IncidentReportCreateView.as_view(), name="incident-create"),
    path("reports/<int:report_id>/photo-url/", IncidentReportPhotoSignedUrlView.as_view(), name="incident-photo-url"),
    path("reports/list/", IncidentReportListView.as_view(), name="incident-report-list"),
    path("reports/my/", MyIncidentReportsView.as_view(), name="incident-report-list-my"),
    
    # Satellite Views
    path("satellite/ndvi/", get_ndvi_image, name="satellite_ndvi"),

    # TomTom Tiles
    path("tomtom/roads/<int:z>/<int:x>/<int:y>.png", tomtom_roads_tile, name="tomtom_roads_tile"),
    path("tomtom/traffic/<int:z>/<int:x>/<int:y>.png", tomtom_traffic_tile, name="tomtom_traffic_tile"),
    
    # Incident Views
    path("reports/", IncidentReportCreateView.as_view(), name="incident-create"),
    path("reports/<int:report_id>/photo-url/", IncidentReportPhotoSignedUrlView.as_view(), name="incident-photo-url"),
    path("reports/list/", IncidentReportListView.as_view(), name="incident-report-list"),
    
    #CMS Views
    path("cms/guides/", list_guides),
    path("cms/guides/create/", create_guide),
    path("cms/guides/<int:pk>/", update_guide),
    path("cms/guides/<int:pk>/publish/", toggle_publish),
    path("cms/guides/<int:pk>/archive/", archive_guide),

    # Misc Views
    path('test/', testEndPoint, name='test'),

    # Researcher Requests
    path("researcher/request/", CreateResearcherRequestView.as_view(), name="researcher_request_create"),
    path("admin/researcher_requests/", ResearcherRequestListView.as_view(), name="researcher_requests_list"),
    path("admin/researcher_requests/<int:pk>/", ApproveRejectResearcherRequestView.as_view(), name="researcher_request_update"),

    # Misc
    path("test/", testEndPoint, name="test"),
    path("", getRoutes, name="routes"),  
]
