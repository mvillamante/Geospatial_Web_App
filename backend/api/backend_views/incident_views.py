from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import NotFound
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.response import Response

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
