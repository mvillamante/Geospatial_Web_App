from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from api.models import ResidentVerificationRequest
from api.serializer import ResidentVerificationRequestSerializer

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
