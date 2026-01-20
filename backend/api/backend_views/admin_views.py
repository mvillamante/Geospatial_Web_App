from rest_framework import generics
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes

from api.models import CustomUser
from api.serializer import AdminUserListSerializer, AssignUserRoleSerializer
from api.admin_permissions import IsAdminRole

from .pagination import AdminUserPagination

class UserListView(ListAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = AdminUserListSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    pagination_class = AdminUserPagination
    
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
        user.is_active = not user.is_active
        user.save()
        return Response({
            "id": user.id,
            "status": "Active" if user.is_active else "Inactive"
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
