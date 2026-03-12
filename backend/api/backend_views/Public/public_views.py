from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.db.models import Avg, F, ExpressionWrapper, DurationField

from api.models import IncidentReport
from api.serializer import PublicLandingPageSerializer


class PublicLandingPageView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        today = timezone.now().date()

        # Active hazards
        active_hazards = IncidentReport.objects.filter(
            status__in=["pending", "in_progress", "needs_info"]
        ).count()

        # Critical alerts (prefer verified)
        critical_alerts = IncidentReport.objects.filter(
            verified_critical_level="critical"
        ).count()

        if critical_alerts == 0:
            critical_alerts = IncidentReport.objects.filter(
                suggested_critical_level="critical"
            ).count()

        # Reports today
        reports_today = IncidentReport.objects.filter(
            created_at__date=today
        ).count()

        # Average response time (resolved only)
        response_time = IncidentReport.objects.filter(
            status="resolved"
        ).annotate(
            response_duration=ExpressionWrapper(
                F("last_updated_at") - F("created_at"),
                output_field=DurationField()
            )
        ).aggregate(avg=Avg("response_duration"))["avg"]

        avg_minutes = (
            response_time.total_seconds() / 60
            if response_time else 0
        )

        data = {
            "activeHazards": active_hazards,
            "criticalAlerts": critical_alerts,
            "reportsToday": reports_today,
            "avgResponseTimeMinutes": round(avg_minutes, 1),
        }

        serializer = PublicLandingPageSerializer(data)
        return Response(serializer.data)
