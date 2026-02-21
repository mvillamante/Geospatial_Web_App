from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes

from api.models import ResidentVerificationRequest
from api.serializer import ResidentVerificationRequestSerializer
from api.admin_permissions import IsAdminRole

from api.supabase_storage import create_signed_url

@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminRole])
def get_signed_url(request):
    path = request.GET.get("path")
    if not path:
        return Response({"error": "Missing path"}, status=400)
    
    # Remove domain if accidentally included
    if path.startswith("http://127.0.0.1:8000/"):
        path = path.replace("http://127.0.0.1:8000/", "")
    
    try:
        url = create_signed_url(path, expires_in_seconds=3600*24)
        return Response({"url": url})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

class ResidentVerificationListView(generics.ListAPIView):
    serializer_class = ResidentVerificationRequestSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        return ResidentVerificationRequest.objects.all().order_by('-created_at')

class ApproveRejectResidentVerificationView(generics.UpdateAPIView):
    queryset = ResidentVerificationRequest.objects.all()
    serializer_class = ResidentVerificationRequestSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, *args, **kwargs):
        verification = self.get_object()
        action = request.data.get("action")

        if action not in ["approve", "reject"]:
            return Response(
                {"detail": "Invalid action."},
                status=status.HTTP_400_BAD_REQUEST
            )

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
                user=user,
                type="verification",
                title="Resident Verification Approved",
                body="Your resident verification request has been approved."
            )

        else:
            verification.status = "rejected"
            verification.rejection_reason = request.data.get("reason", "")
            verification.reviewed_by = request.user
            verification.reviewed_at = timezone.now()
            verification.save()

            user.is_resident_verified = False
            user.save()

            Notification.objects.create(
                user=user,
                type="verification",
                title="Resident Verification Rejected",
                body=f"Your verification was rejected. Reason: {verification.rejection_reason}"
            )

        serializer = self.get_serializer(verification)
        return Response(serializer.data)

class ResidentVerificationRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        existing = ResidentVerificationRequest.objects.filter(user=request.user, status="pending").first()

        serializer = ResidentVerificationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if existing:
            existing.barangay = serializer.validated_data["barangay"]
            existing.address = serializer.validated_data["address"]
            existing.id_image = serializer.validated_data["id_image"]
            existing.save()

            return Response({"detail": "Updated pending request."}, status=status.HTTP_200_OK)
        
        ResidentVerificationRequest.objects.create(
            user=request.user,
            barangay=serializer.validated_data["barangay"],
            address=serializer.validated_data["address"],
            id_image=serializer.validated_data["id_image"],
            status="pending",
        )
        return Response({"detail": "Verification request submitted."}, status=status.HTTP_201_CREATED)
