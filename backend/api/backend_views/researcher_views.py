from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from api.models import ResearcherRequest, CustomUser
from api.serializer import ResearcherRequestSerializer
from api.admin_permissions import IsAdminRole
from django.utils import timezone

# Citizen Requesting Researcher Role
class CreateResearcherRequestView(generics.CreateAPIView):
    queryset = ResearcherRequest.objects.all()
    serializer_class = ResearcherRequestSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # Check if user is already a researcher or admin
        if request.user.role in ["researcher", "admin"]:
            return Response({"detail": "You already have researcher access."}, status=status.HTTP_400_BAD_REQUEST)
        
        existing = ResearcherRequest.objects.filter(user=request.user, status="Pending").first()
        if existing:
            return Response({"detail": "You already have a pending request."}, status=status.HTTP_400_BAD_REQUEST)
        
        req = ResearcherRequest.objects.create(user=request.user)
        serializer = self.get_serializer(req)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# Admin (list all pending requests)
class ResearcherRequestListView(generics.ListAPIView):
    queryset = ResearcherRequest.objects.filter(status="Pending").order_by('-requested_at')
    serializer_class = ResearcherRequestSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]


# Admin (approve or reject request)
class ApproveRejectResearcherRequestView(generics.UpdateAPIView):
    queryset = ResearcherRequest.objects.all()
    serializer_class = ResearcherRequestSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, *args, **kwargs):
        req_obj = self.get_object()
        action = request.data.get("action")  # "approve" or "reject"

        if action not in ["approve", "reject"]:
            return Response({"detail": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)

        if action == "approve":
            req_obj.status = "Approved"
            
            user = req_obj.user
            # Ensure extra_roles exists and is a list
            if not user.extra_roles:
                user.extra_roles = []

            # Add "Researcher" if not already present
            if "Researcher" not in [r.lower() for r in user.extra_roles]:
                user.extra_roles.append("Researcher")
            
            user.save()
            user.refresh_from_db()
            
        else:
            req_obj.status = "Rejected"
            
            reject_reason = request.data.get("reason", "")
            req_obj.reject_reason = reject_reason
            req_obj.rejected_at = timezone.now()

        req_obj.save()
        serializer = self.get_serializer(req_obj)
        return Response(serializer.data)
