from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, parser_classes
from django.db.models.functions import Lower
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404

from api.serializer import *

from api.supabase_storage import create_signed_url
from api.models import IncidentReport

from django.db import transaction
from django.db.models import Q
from django.db.models.functions import Lower

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def send_report_reply(request, pk):
    try:
        report = get_object_or_404(IncidentReport, pk=pk, user=request.user)

        data = {}
        if "reply_message" in request.data:
            data["reply_message"] = request.data["reply_message"]

        if "reply_image" in request.FILES:
            data["reply_image"] = request.FILES["reply_image"]

        if not data:
            return Response({"detail": "No reply message or image provided."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = IncidentReportReplySerializer(report, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        print("DEBUG SEND REPLY ERROR:", e)
        import traceback
        traceback.print_exc()
        return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# CABUYAO_LAT_LNG
CABUYAO_LAT_MIN = 14.23
CABUYAO_LAT_MAX = 14.30
CABUYAO_LNG_MIN = 121.11
CABUYAO_LNG_MAX = 121.16

class IncidentReportCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        try:
            lat = float(request.data.get("latitude"))
            lng = float(request.data.get("longitude"))
        except (TypeError, ValueError):
            return Response(
                {"detail": "Latitude and longitude required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (CABUYAO_LAT_MIN <= lat <= CABUYAO_LAT_MAX and
                CABUYAO_LNG_MIN <= lng <= CABUYAO_LNG_MAX):
            return Response(
                {"detail": "Reports can only be filed within Cabuyao."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = IncidentReportCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        report = serializer.save()
        return Response({"success": True, "id": report.id}, status=status.HTTP_201_CREATED)

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
        user=request.user

        if data.get("assignToMe"):
            if report.assigned_officer:
                raise ValidationError({
                    "assigned": "Report is already assigned."
                })
            report.assigned_officer = user
            report.save()

            report.refresh_from_db()

            return Response(
                IncidentReportQueueSerializer(report).data,
                status=status.HTTP_200_OK
            )

        old_status = report.status

        if "status" in data and isinstance(data["status"], str):
            data["status"] = data["status"].lower()

        new_status = data.get("status")

        if new_status in ["in_progress", "resolved"] and not report.verified_critical_level:
            raise ValidationError({
                "verifiedRisk": "Verified critical level is required before setting this status."
            })
            

        serializer = self.get_serializer(report, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        report.refresh_from_db()

        if new_status and old_status != report.status:

            title_map = {
                "in_progress": "Your report is now in progress",
                "needs_info": "More information required",
                "resolved": "Report resolved",
                "rejected": "Report rejected"
            }

            notif_kwargs = {
                "type": "report",
                "target_user": report.user,
                "title": title_map.get(report.status, "Report status updated"),
                "status_from": old_status,
                "status_to": report.status,
                "report_id": report.id,
                "report_category": report.get_category_display(),
                "report_barangay": report.location_display,
            }

            if report.status == "needs_info":
                notif_kwargs["officer_message"] = report.needs_info_note

            elif report.status == "resolved":
                notif_kwargs["resolution_summary"] = (
                    report.lgu_post.get("action_taken")
                    if report.lgu_post else None
                )

            elif report.status == "rejected":
                notif_kwargs["rejection_reason"] = report.rejection_reason

            Notification.objects.create(**notif_kwargs)

        return Response(
            IncidentReportQueueSerializer(report).data,
            status=status.HTTP_200_OK
        )




class VerifiedIncidentReportsView(generics.ListAPIView):
    serializer_class = IncidentReportListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.base_queryset()

    def base_queryset(self):
        return (
            IncidentReport.objects
            .annotate(vcl_lower=Lower("verified_critical_level"))
            .filter(
                Q(vcl_lower__in=["low", "moderate", "high", "critical"]) |
                Q(status__iexact="resolved")
            )
            .order_by("-created_at")
        )
    


class OfficerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = CustomUser.objects.filter(
            role__iexact="officer",
            department__name__iexact="Operations and Warning",
            is_active=True
        ).order_by(
            "first_name", "last_name", "username"
        )

        data = OfficerOptionSerializer(qs, many=True).data
        print("OFFICER LIST DEBUG:", data) 

        return Response(data, status=status.HTTP_200_OK)