from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes

from api.models import ResidentVerificationRequest, CustomUser, Notification
from api.serializer import ResidentVerificationRequestSerializer
from api.admin_permissions import IsAdminRole
from api.supabase_storage import upload_private_photo
from django.conf import settings
from django.db.models import Q, Value
from django.db.models.functions import Concat
from api.supabase_storage import create_signed_url
from django.utils import timezone
from rest_framework.parsers import MultiPartParser, FormParser

@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def get_signed_url(request):
    path = request.GET.get("path")
    if not path:
        return Response({"error": "Missing path"}, status=400)
    
    if path.startswith("http://127.0.0.1:8000/"):
        path = path.replace("http://127.0.0.1:8000/", "")
    
    try:
        url = create_signed_url(path, expires_in_seconds=3600*24)
        return Response({"url": url})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

class ResidentVerificationListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        search = request.GET.get("search", "").strip()

        citizens = CustomUser.objects.filter(role="citizen")

        if search:
            search_parts = search.split()
            # Only match if there are exactly 2 parts (first and last)
            if len(search_parts) == 2:
                first, last = search_parts
                # Exact match on first_name AND last_name (case-insensitive)
                citizens = citizens.filter(
                    first_name__iexact=first,
                    last_name__iexact=last
                )
            else:
                citizens = citizens.none()

        results = []

        for c in citizens:
            latest_request = ResidentVerificationRequest.objects.filter(
                user=c
            ).order_by("-created_at").first()

            results.append({
                "citizen_id": c.id,
                "first_name": c.first_name,
                "last_name": c.last_name,
                "barangay": c.barangay,
                "email": c.email,

                "date_joined": c.date_joined,
                "last_login": c.last_login,
                "is_active": c.is_active,
                "is_resident_verified": c.is_resident_verified,

                "verification": None if not latest_request else {
                    "id": latest_request.id,
                    "status": latest_request.status,
                    "barangay": latest_request.barangay,
                    "address": latest_request.address,
                    "id_image": create_signed_url(
                        latest_request.id_image,
                        bucket="resident-attachments",
                        expires_in_seconds=3600
                    ) if latest_request.id_image else None,
                    "rejection_reason": latest_request.rejection_reason,
                    "created_at": latest_request.created_at,
                    "reviewed_at": latest_request.reviewed_at
                }
            })

        return Response({
            "count": len(results),
            "results": results
        })

class CitizenOverviewView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        search = request.query_params.get("search")
        status_param = request.query_params.get("status")

        # Citizen verification requests
        request_qs = ResidentVerificationRequest.objects.filter(
            user__role="citizen"
        )

        # Existing citizen users
        citizen_qs = CustomUser.objects.filter(
            role__iexact="citizen"
        )

        # SEARCH
        if search:
            request_qs = request_qs.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search)
            )

            citizen_qs = citizen_qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )

        #Format requests
        request_data = [
            {
                "id": r.id,
                "type": "verification_request",
                "first_name": r.user.first_name,
                "last_name": r.user.last_name,
                "email": r.user.email,
                "status": r.status.lower(),
                "created_at": r.created_at,
                "reviewed_at": r.reviewed_at,
            }
            for r in request_qs
        ]

        # Format citizens
        citizen_data = [
            {
                "id": c.id,
                "type": "citizen",
                "first_name": c.first_name,
                "last_name": c.last_name,
                "email": c.email,
                "status": "active" if c.is_active else "inactive",
                "created_at": c.date_joined,
                "last_login": c.last_login,
            }
            for c in citizen_qs
        ]

        # Combine both
        combined = request_data + citizen_data

        # Optional status filter
        if status_param and status_param.lower() != "all":
            combined = [
                item for item in combined
                if item["status"] == status_param.lower()
            ]

        return Response({
            "count": len(combined),
            "results": combined
        })

class CitizenStatusUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk, role="citizen")
        except CustomUser.DoesNotExist:
            return Response({"detail": "Citizen not found."}, status=404)

        action = request.data.get("action")

        if action == "activate":
            user.is_active = True
        elif action == "deactivate":
            user.is_active = False
        else:
            return Response({"detail": "Invalid action."}, status=400)

        user.save()

        return Response({
            "id": user.id,
            "status": "active" if user.is_active else "inactive"
        })

        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param.lower())

        return queryset
    
class ApproveRejectResidentVerificationView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, pk):
        try:
            verification = ResidentVerificationRequest.objects.select_related("user").get(pk=pk)
        except ResidentVerificationRequest.DoesNotExist:
            return Response({"detail": "Verification request not found."}, status=404)

        action = request.data.get("action")
        user = verification.user

        if action == "approve":
            verification.status = "approved"
            verification.reviewed_by = request.user
            verification.reviewed_at = timezone.now()
            verification.save()

            user.is_resident_verified = True
            user.barangay = verification.barangay
            user.save()

            Notification.objects.create(
                target_user=user,
                type="verification",
                title="Resident Verification Approved",
                body="Your resident verification request has been approved."
            )

        elif action == "reject":
            reason = request.data.get("reason", "")
            
            # Delete the ID image if it exists
            if verification.id_image:
                from api.supabase_storage import delete_private_photo
                deleted = delete_private_photo(verification.id_image, bucket="resident-attachments")
                if deleted:
                    verification.id_image = None  

            verification.status = "rejected"
            verification.rejection_reason = reason
            verification.reviewed_by = request.user
            verification.reviewed_at = timezone.now()
            verification.save()

            user.is_resident_verified = False
            user.save()

            Notification.objects.create(
                target_user=user,
                type="verification",
                title="Resident Verification Rejected",
                body=f"Your verification was rejected. Reason: {reason}"
            )

        else:
            return Response({"detail": "Invalid action."}, status=400)

        return Response({
            "id": verification.id,
            "status": verification.status,
            "reviewed_at": verification.reviewed_at
        })

class ResidentVerificationRequestView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):

        existing = ResidentVerificationRequest.objects.filter(
            user=request.user,
            status="pending"
        ).first()

        serializer = ResidentVerificationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uploaded_file = request.FILES.get("id_image")

        file_path = None
        if uploaded_file:
            file_path = upload_private_photo(
                uploaded_file,
                bucket="resident-attachments"
            )

        if existing:
            existing.barangay = serializer.validated_data["barangay"]
            existing.address = serializer.validated_data["address"]

            if file_path:
                existing.id_image = file_path

            existing.save()

            return Response(
                {"detail": "Updated pending request."},
                status=status.HTTP_200_OK
            )

        ResidentVerificationRequest.objects.create(
            user=request.user,
            barangay=serializer.validated_data["barangay"],
            address=serializer.validated_data["address"],
            id_image=file_path,
            status="pending",
        )

        return Response(
            {"detail": "Verification request submitted."},
            status=status.HTTP_201_CREATED
        )