from rest_framework import generics
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes

from api.models import CustomUser, IncidentReport, Department
from api.serializer import AdminUserListSerializer, AssignUserRoleSerializer, CreateStaffUserSerializer, DepartmentSerializer
from api.admin_permissions import IsAdminRole

from django.db.models import Q
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone

from ..Services.pagination import AdminUserPagination

class DepartmentListCreateView(generics.ListCreateAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    
class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

class UserListView(ListAPIView):
    serializer_class = AdminUserListSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    pagination_class = AdminUserPagination

    def get_queryset(self):
        qs = CustomUser.objects.filter(
            Q(role__iexact="admin") |
            Q(role__iexact="officer")
        )

        # Get query params
        role = self.request.query_params.get('role')
        status = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        ordering = self.request.query_params.get('ordering')

        # Default view: exclude citizens without extra_roles
        if not search:  # only exclude when not searching
            qs = qs.exclude(
                role__iexact='citizen',
                extra_roles=[]
            )

        # Apply role filter
        if role and role.lower() != "all":
            role_lower = role.lower()
            if role_lower == "researcher":
                qs = qs.filter(extra_roles__contains=['Researcher'])
            else:
                qs = qs.filter(role__iexact=role)

        # Apply status filter
        if status and status.lower() != "all":
            is_active = status.lower() == "active"
            qs = qs.filter(is_active=is_active)

        # Apply search filter (include citizens if they match)
        if search:
            search = search.strip()

            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search) |
                Q(first_name__icontains=search.split(" ")[0],
                last_name__icontains=search.split(" ")[-1])
    )


        # Ordering
        if ordering:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by('date_joined')

        return qs
    
class UserDistributionView(ListAPIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        users = CustomUser.objects.all()
        serializer = AdminUserListSerializer(users, many=True)
        return Response(serializer.data)

    
class AssignUserRoleView(generics.UpdateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = AssignUserRoleSerializer
    permission_classes = [IsAdminRole]

    def perform_update(self, serializer):
        if self.request.user.id == self.get_object().id:
            raise PermissionDenied("Admins cannot change their own role.")
        serializer.save()
        
class ToggleUserStatusView(generics.UpdateAPIView):
    queryset = CustomUser.objects.all()
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, *args, **kwargs):
        user = self.get_object()

        if user == request.user:
            raise PermissionDenied("Admins cannot deactivate themselves.")

        if not user.is_active:
            # Activating user
            user.is_active = True
            user.last_login = None  # Reset inactivity timer
        else:
            # Deactivating user
            user.is_active = False

        user.save()

        return Response({
            "id": user.id,
            "status": "Active" if user.is_active else "Inactive"
        })
        
class RevokeResearcherView(generics.UpdateAPIView):
    queryset = CustomUser.objects.all()
    permission_classes = [IsAdminRole]

    def update(self, request, *args, **kwargs):
        user = self.get_object()

        if request.user.id == user.id:
            raise PermissionDenied("You cannot modify your own roles.")

        # Only applies to Citizen + Researcher
        if user.role != 'citizen' or 'Researcher' not in (user.extra_roles or []):
            raise ValidationError("User does not have Researcher access to revoke.")

        user.extra_roles = [
            r for r in user.extra_roles if r != 'Researcher'
        ]
        user.save()

        return Response({
            "id": user.id,
            "role": user.role,
            "extra_roles": user.extra_roles
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_user_role(request, user_id):
    if request.user.role != 'admin':
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    
    new_role = request.data.get('role')
    user = CustomUser.objects.get(supabase_uid=user_id)
    user.role = new_role
    user.save()
    return Response({"detail": "Role updated"}, status=status.HTTP_200_OK)

class CreateStaffUserView(generics.CreateAPIView):
    serializer_class = CreateStaffUserSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            # Debug: print errors
            print("Serializer errors:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.save()

        temp_password = request.data.get("password")

        subject = "Your Temporary Login Credentials"
        message = f"""
            Hello {user.first_name},

            Your account has been created.

            Username: {user.username}
            Temporary Password: {temp_password}

            Please login and change your password immediately.

            Regards,
            Admin
            """

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
        except Exception as e:
            print("EMAIL ERROR:", e)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminRole])
def change_user_password(request, user_id):
    try:
        user = CustomUser.objects.get(id=user_id) 
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)

    password = request.data.get("password")
    if not password:
        return Response({"detail": "Password required"}, status=400)

    user.set_password(password)
    user.save()
    return Response({"detail": "Password changed successfully"})
    
# Dashboard Views
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    active_users = CustomUser.objects.filter(is_active=True).count()

    #count all reports even archived
    total_reports = IncidentReport.objects.count()

    #count reports that have no assigned officer and are not archived
    unassigned_reports = IncidentReport.objects.filter(assigned_officer__isnull=True).exclude(status="archived").count()

    high_critical_reports = IncidentReport.objects.filter(suggested_critical_level__in=["high", "critical"]).exclude(status="archived").count()

    return Response({
        "active_users": active_users,
        "total_reports": total_reports,
        "unassigned_reports": unassigned_reports,
        "high_critical_reports": high_critical_reports,
    })