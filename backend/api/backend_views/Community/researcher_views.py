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
from rest_framework.views import APIView
from django.db.models import Q
from api.supa_storage import upload_private_photo, create_signed_url

# Public Researcher Request Submission
class CreateResearcherRequestView(generics.CreateAPIView):
    queryset = ResearcherRequest.objects.all()
    serializer_class = ResearcherRequestSerializer
    # No authentication required for landing page
    permission_classes = []

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        first_name = serializer.validated_data.get("first_name")
        last_name = serializer.validated_data.get("last_name")

        if not first_name or not last_name:
            return Response(
                {"detail": "First name and last name are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        attachment = request.FILES.get("attachment")
        attachment_path = None

        if attachment:
            attachment_path = upload_private_photo(attachment,bucket="researcher-attachments")

        serializer.save(
            status="pending",
            attachment=attachment_path
        )

        return Response(
            {"detail": "Researcher request submitted successfully."},
            status=status.HTTP_201_CREATED
        )

class ResearcherAttachmentSignedURLView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, pk):
        try:
            req_obj = ResearcherRequest.objects.get(pk=pk)
        except ResearcherRequest.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        if not req_obj.attachment:
            return Response({"detail": "No attachment."}, status=400)

        signed_url = create_signed_url(
            req_obj.attachment,
            bucket="researcher-attachments",
            expires_in_seconds=300
        )

        return Response({"url": signed_url})

# Admin (list all pending requests)
class ResearcherRequestListView(generics.ListAPIView):
    # queryset = ResearcherRequest.objects.filter(status__iexact="pending").order_by('-created_at')
    queryset = ResearcherRequest.objects.all().order_by('-created_at')
    serializer_class = ResearcherRequestSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

class ResearcherOverviewView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        search = request.query_params.get("search")
        status_param = request.query_params.get("status")

        # Researcher Requests
        request_qs = ResearcherRequest.objects.all()

        # Researchers
        researcher_qs = CustomUser.objects.filter(extra_roles__contains=["Researcher"])

        if search:
            request_qs = request_qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )

            researcher_qs = researcher_qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )

        request_data = [
            {
                "id": r.id,
                "type": "request",
                "first_name": r.first_name,
                "last_name": r.last_name,
                "email": r.email,
                "status": r.status.lower(),
                "created_at": r.created_at,
                "reviewed_at": r.reviewed_at, 
                "purpose": r.purpose,
                "orgSchool": r.orgSchool,
                "attachment": r.attachment,
            }
            for r in request_qs
        ]

        researcher_data = [
            {
                "id": r.id,
                "type": "researcher",
                "first_name": r.first_name,
                "last_name": r.last_name,
                "email": r.email,
                "status": "active" if r.is_active else "inactive",
                "created_at": r.date_joined,
                "last_login": r.last_login,
            }
            for r in researcher_qs
        ]

        combined = request_data + researcher_data

        if status_param and status_param.lower() != "all":
            combined = [
                item for item in combined
                if item["status"] == status_param.lower()
            ]

        return Response({
            "count": len(combined),
            "results": combined
        })

    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk, extra_roles__contains=["Researcher"])
        except CustomUser.DoesNotExist:
            return Response({"detail": "Researcher not found."}, status=404)

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