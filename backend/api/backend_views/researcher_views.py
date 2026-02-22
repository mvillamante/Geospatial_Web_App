from rest_framework import generics, status, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from api.models import ResearcherRequest, CustomUser
from api.serializer import ResearcherRequestSerializer
from api.admin_permissions import IsAdminRole
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import random, string

# Public Researcher Request Submission
class CreateResearcherRequestView(generics.CreateAPIView):
    queryset = ResearcherRequest.objects.all()
    serializer_class = ResearcherRequestSerializer
    # No authentication required for landing page
    permission_classes = []

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Ensure first_name and last_name are present
        first_name = serializer.validated_data.get("first_name")
        last_name = serializer.validated_data.get("last_name")
        if not first_name or not last_name:
            return Response(
                {"detail": "First name and last name are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer.save(status="pending")  # default status
        return Response(
            {"detail": "Researcher request submitted successfully."},
            status=status.HTTP_201_CREATED
        )

# Admin (list all pending requests)
class ResearcherRequestListView(generics.ListAPIView):
    # queryset = ResearcherRequest.objects.filter(status__iexact="pending").order_by('-created_at')
    queryset = ResearcherRequest.objects.all().order_by('-created_at')
    serializer_class = ResearcherRequestSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]


# Serializer specifically for admin approve/reject action
class ApproveRejectSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject"])
    reason = serializers.CharField(required=False, allow_blank=True)

# Admin (approve or reject request)
class ApproveRejectResearcherRequestView(generics.UpdateAPIView):
    queryset = ResearcherRequest.objects.all()
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, *args, **kwargs):
        req_obj = self.get_object()
        action = request.data.get("action")  # "approve" or "reject"

        if action not in ["approve", "reject"]:
            return Response({"detail": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)

        if action == "approve":
            req_obj.status = "Approved"

            # Check if user already exists
            user = CustomUser.objects.filter(email=req_obj.email).first()

            if not user:
                # Generate temporary password
                temp_password = ''.join(
                    random.choices(string.ascii_letters + string.digits + "!@#$%^&*()", k=10)
                )

                # Create base user (NOT researcher role)
                user = CustomUser.objects.create_user(
                    username=f"{req_obj.first_name.lower()}.{req_obj.last_name.lower()}",
                    email=req_obj.email,
                    first_name=req_obj.first_name,
                    last_name=req_obj.last_name,
                    role="",
                    password=temp_password,
                    is_active=True
                )

                # Add Researcher in extra_roles
                user.extra_roles = user.extra_roles or []
                if "Researcher" not in user.extra_roles:
                    user.extra_roles.append("Researcher")
                user.save()

                # Send approval email
                subject = "Your Researcher Account Has Been Created"
                message = f"""
        Greetings {user.first_name},

        Your research request has been APPROVED.
        Your account has been created.

        Login Email: {user.email}
        Temporary Password: {temp_password}

        Please change your password after logging in.

        Disclaimer:
        Your account will be automatically deactivated if inactive for 90 days.
        """
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False
                )

            else:
                # User exists → just add Researcher extra role
                user.extra_roles = user.extra_roles or []
                if "Researcher" not in user.extra_roles:
                    user.extra_roles.append("Researcher")
                    user.save()

        else:  # reject
            req_obj.status = "Rejected"
            rejection_reason = request.data.get("reason", "")
            req_obj.rejection_reason = rejection_reason

            # Send rejection email
            subject = "Your Researcher Request Has Been Rejected"
            message = f"""
Greetings {req_obj.first_name},

We regret to inform you that your researcher request has been REJECTED.

Reason: {rejection_reason or 'Not specified'}

If you believe this is a mistake or have additional information, please contact the administration.
"""
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [req_obj.email], fail_silently=False)

        req_obj.reviewed_at = timezone.now()
        req_obj.save()

        # Return simple JSON response (avoids serializer read-only issues)
        return Response({
            "id": req_obj.id,
            "status": req_obj.status,
            "rejection_reason": req_obj.rejection_reason,
            "reviewed_at": req_obj.reviewed_at,
        })