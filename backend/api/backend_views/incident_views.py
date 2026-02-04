from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from django.db.models.functions import Lower
from api.serializer import *

from api.supabase_storage import create_signed_url

from api.serializer import IncidentReportCreateSerializer
from api.models import IncidentReport

class IncidentReportCreateView(APIView):

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        serializer = IncidentReportCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        report = serializer.save()
        return Response(
            {"success": True, "id": report.id},
            status=status.HTTP_201_CREATED
        )

class IncidentReportPhotoSignedUrlView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, report_id: int):
        qs = IncidentReport.objects.filter(id=report_id)

        if request.user.role == "citizen":
            qs = qs.filter(user=request.user)

        report = qs.first()
        if not report:
            raise NotFound("Report not found")

        if not report.photo_path:
            return Response({"photo_url": None})

        signed_url = create_signed_url(report.photo_path, expires_in_seconds=3600)
        return Response({"photo_url": signed_url})
        

class IncidentReportListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = IncidentReport.objects.all().order_by("-created_at");
    
        if request.user.role == "citizen":
            qs = qs.filter(user=request.user)
        
        elif request.user.role == "lgu":
            qs = qs.filter(assigned_officer=request.user)

        serializer = IncidentReportListSerializer(qs, many=True)
        return Response(serializer.data)
    
class MyIncidentReportsView(generics.ListAPIView):
    serializer_class = IncidentReportListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return IncidentReport.objects.filter(user=self.request.user).order_by("-created_at")

class IncidentReportsQueueView(generics.ListAPIView):
    serializer_class = IncidentReportQueueSerializer

    def get_queryset(self):
        return IncidentReport.objects.select_related("user").order_by("-created_at")
    
class IncidentReportPatchView(generics.UpdateAPIView):
    queryset = IncidentReport.objects.select_related("user", "assigned_officer")
    serializer_class = IncidentReportUpdateSerializer
    lookup_url_kwarg = "report_id"   

    def patch(self, request, *args, **kwargs):
        report = self.get_object()
        data = request.data.copy()

        if data.get("assignToMe") is True:
            report.assigned_officer = request.user
            report.status = "in_progress"
            report.save(update_fields=["assigned_officer", "status"])
            return Response(IncidentReportQueueSerializer(report).data)

        officer_id = data.get("officer_id") or data.get("assigned_officer_id")
        if officer_id:
            try:
                officer_id = int(officer_id)
            except (TypeError, ValueError):
                raise ValidationError({"officer_id": "Must be an integer."})

            officer = get_object_or_404(CustomUser, id=officer_id, role__iexact="officer")
            report.assigned_officer = officer

            if report.status in [None, "", "pending"]:
                report.status = "in_progress"

            report.save(update_fields=["assigned_officer", "status"])
            return Response(IncidentReportQueueSerializer(report).data, status=status.HTTP_200_OK)

        if "status" in data and isinstance(data["status"], str):
            data["status"] = data["status"].lower()

        serializer = self.get_serializer(report, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        report.refresh_from_db()
        return Response(IncidentReportQueueSerializer(report).data, status=status.HTTP_200_OK)


class VerifiedIncidentReportsView(generics.ListAPIView):
    """
    Returns all incident reports where status='verified'.
    """
    serializer_class = IncidentReportListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = (
            IncidentReport.objects
            .exclude(verified_critical_level__isnull=True)
            .annotate(vcl_lower=Lower("verified_critical_level"))
            .filter(vcl_lower__in=["low", "moderate", "high", "critical"])
            .order_by("-created_at")
        )
        
        print("DEBUG: Verified Reports QuerySet ->", list(qs.values("id", "verified_critical_level", "created_at")))
        return qs


class OfficerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = CustomUser.objects.filter(role__iexact="officer").order_by(
            "first_name", "last_name", "username"
        )

        data = OfficerOptionSerializer(qs, many=True).data
        print("OFFICER LIST DEBUG:", data) 

        return Response(data, status=status.HTTP_200_OK)


