from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from api.models import CustomUser
from api.serializer import AdminUserListSerializer
from api.admin_permissions import IsAdminRole

class UserListView(ListAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = AdminUserListSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
