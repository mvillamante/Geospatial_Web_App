from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from api.models import ResearcherRequest, CustomUser
from api.serializer import ResearcherRequestSerializer
from api.admin_permissions import IsAdminRole
from django.utils import timezone

# Public Researcher Request Submission
class CreateResearcherRequestView(generics.CreateAPIView):
    queryset = ResearcherRequest.objects.all()
    serializer_class = ResearcherRequestSerializer
    # No authentication required for landing page
    permission_classes = []

    def post(self, request):
        serializer = ResearcherRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(status="pending")  # default status
        return Response({"detail": "Researcher request submitted successfully."}, status=status.HTTP_201_CREATED)

# Admin (list all pending requests)
class ResearcherRequestListView(generics.ListAPIView):
    queryset = ResearcherRequest.objects.filter(status="Pending").order_by('-created_at')
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
            
            rejection_reason = request.data.get("reason", "")
            req_obj.rejection_reason = rejection_reason

        req_obj.save()
        serializer = self.get_serializer(req_obj)
        return Response(serializer.data)
