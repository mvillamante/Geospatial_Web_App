from django.urls import path
from django.conf.urls.static import static
from django.conf import settings
from rest_framework_simplejwt.views import TokenRefreshView

from .backend_views.admin_views import *
from .backend_views.auth_views import *
from .backend_views.cms_views import *
from .backend_views.geocoding_views import *
from .backend_views.incident_views import *
from .backend_views.misc_views import *
from .backend_views.researcher_views import *
from .backend_views.resident_verification_views import *
from .backend_views.satellite import *
from .backend_views.hazard_views import (
    calamity_risk,
    calamity_risk_forecast,
    green_index,
    hazard_index,
    barangay_geojson,
    model_info,
    eda_summary,
    earthquake_freq,
    typhoon_freq,
    green_artifacts_zip,
    hazard_artifacts_zip,
    calamity_risk_artifacts_zip,
    lstm_bundle_zip,
    download_dataset,
)
from .backend_views.password_reset_views import *
from .backend_views.tomtom_views import tomtom_roads_tile, tomtom_traffic_tile
from .backend_views.community_feed_views import *
from .backend_views.public_views import *
from .backend_views.notification_views import *

urlpatterns = [
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Admin_Views
    path("admin/users/", UserListView.as_view(), name="admin-users"),
    path("admin/users/distribution/", UserDistributionView.as_view()),
    path('admin/users/<int:pk>/role/', AssignUserRoleView.as_view()),
    path('admin/users/<int:pk>/toggle-status/', ToggleUserStatusView.as_view()),
    path('admin/users/<int:pk>/revoke-researcher/', RevokeResearcherView.as_view()),
    path('admin/users/create/', CreateStaffUserView.as_view(), name="create-staff-user"),
    path('admin/resident-verifications/', ResidentVerificationListView.as_view(), name="admin_resident_verifications",),
    path('admin/resident-verifications/<int:pk>/', ApproveRejectResidentVerificationView.as_view(), name="admin_resident_verification_detail",),
    path("admin/stats/", dashboard_stats,name="dashboard-stats"),
    path("admin/users/<int:user_id>/change-password/", change_user_password),
    path("admin/departments/", DepartmentListCreateView.as_view()),

    # Researcher_Views
    path("researcher/request/", CreateResearcherRequestView.as_view(), name="researcher_request_create"),
    path("admin/researcher_requests/", ResearcherRequestListView.as_view(), name="researcher_requests_list"),
    path("admin/researcher_requests/<int:pk>/", ApproveRejectResearcherRequestView.as_view(), name="researcher_request_update"),

    path("resident-verification/request/", ResidentVerificationRequestView.as_view(), name="resident_verification"),
    path('get-signed-url/', get_signed_url, name='get_signed_url'),

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
    path("reports/<int:pk>/reply/", send_report_reply, name="report-reply"),
    
    # Public Views
    path("public/landing-page/", PublicLandingPageView.as_view(), name="public-landing-page"),
    
    # Satellite_Views
    path("satellite/ndvi/", get_ndvi_image, name="satellite_ndvi"),

    # Hazard / Calamity Risk Views
    path("hazard/calamity-risk/", calamity_risk, name="hazard_calamity_risk"),
    path("hazard/calamity-risk/forecast/", calamity_risk_forecast, name="hazard_calamity_risk_forecast"),
    path("hazard/green-index/", green_index, name="hazard_green_index"),
    path("hazard/hazard-index/", hazard_index, name="hazard_hazard_index"),
    path("hazard/barangays/", barangay_geojson, name="hazard_barangays"),
    path("hazard/model-info/", model_info, name="hazard_model_info"),
    path("hazard/eda/summary/", eda_summary, name="hazard_eda_summary"),
    path("hazard/datasets/earthquake-freq/", earthquake_freq, name="hazard_earthquake_freq"),
    path("hazard/datasets/typhoon-freq/", typhoon_freq, name="hazard_typhoon_freq"),
    path("hazard/datasets/download/", download_dataset, name="hazard_datasets_download"),
    path("hazard/datasets/download", download_dataset, name="hazard_datasets_download_no_slash"),  # Support both with/without trailing slash

    # Model artifacts downloads (ZIP)
    path("hazard/models/green/artifacts.zip", green_artifacts_zip, name="hazard_models_green_artifacts_zip"),
    path("hazard/models/hazard/artifacts.zip", hazard_artifacts_zip, name="hazard_models_hazard_artifacts_zip"),
    path("hazard/models/calamity_risk/artifacts.zip", calamity_risk_artifacts_zip, name="hazard_models_calamity_artifacts_zip"),
    path("hazard/models/lstm/all_artifacts.zip", lstm_bundle_zip, name="hazard_models_lstm_bundle_zip"),

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
    path("cms/attachments/<int:attachment_id>/", delete_guide_attachment), 
    path("cms/guides/<int:pk>/restore/", restore_guide),

    # Quick_Contact_Views
    path("cms/quick-contacts/", quick_contacts, name="quick_contacts"),
    path("cms/quick-contacts/<int:pk>/", update_quick_contact, name="update_quick_contact"),
    path("cms/quick-contacts/<int:pk>/phones/", add_quick_contact_phone),
    path("cms/quick-contact-phones/<int:phone_id>/", update_quick_contact_phone),
    path("cms/quick-contact-phones/<int:phone_id>/delete/", delete_quick_contact_phone),

    # Notification_Views
    path("notifications/", NotificationList.as_view(), name="notification-list"),
    path("notifications/read/", MarkNotificationRead.as_view(), name="notification-read"),
    path("notifications/read/all/", MarkAllRead.as_view(), name="notification-read-all"),
    path("notifications/unread-count/", UnreadNotificationCount.as_view(), name="unread-notification"),


    # Community_Feed_Views
    path("community-feed/", community_feed, name="community-feed"),

    # Misc_Views
    path("test/", testEndPoint, name="test"),
    path("", getRoutes, name="routes"),  
] 

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
