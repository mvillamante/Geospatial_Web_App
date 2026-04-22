from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.db.models import Avg, F, Q, ExpressionWrapper, DurationField
from datetime import timedelta

from api.models import IncidentReport


class PublicLandingPageView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.localtime()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        for r in IncidentReport.objects.all():
            print("REPORT:", r.created_at)

        active_hazards = IncidentReport.objects.filter(
            status="in_progress"
        ).count()

        critical_alerts = IncidentReport.objects.filter(
            status="in_progress",
            verified_critical_level="critical"
        ).count()

        reports_today = IncidentReport.objects.filter(
            status="in_progress",
            created_at__gte=today_start
        ).count()

        response_qs = IncidentReport.objects.filter(
            status__in=["resolved"],
            created_at__gte=timezone.now() - timedelta(days=7)  
        ).annotate(
            response_time=ExpressionWrapper(
                F("last_updated_at") - F("created_at"),
                output_field=DurationField()
            )
        )    

        avg_response = response_qs.aggregate(
            avg=Avg("response_time")
        )["avg"]

        avg_minutes = (
            avg_response.total_seconds() / 60 if avg_response else 0
        )

        return Response({
            "activeHazards": active_hazards,
            "criticalAlerts": critical_alerts,
            "reportsToday": reports_today,
            "avgResponseTimeMinutes": round(avg_minutes, 1),
        })