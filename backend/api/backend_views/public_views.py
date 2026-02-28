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
        print("Landing endpoint reached")  # Debug log

        return Response({
            "activeHazards": 1,
            "criticalAlerts": 2,
            "reportsToday": 3,
            "avgResponseTimeMinutes": 5.0,
        })