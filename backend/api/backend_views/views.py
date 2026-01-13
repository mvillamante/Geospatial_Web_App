""" from django.http import JsonResponse
from .views.satellite import fetch_copernicus

def copernicus_test(request):
    data = fetch_copernicus()
    return JsonResponse(data, safe=False) """


from django.shortcuts import render
from django.http import JsonResponse
from api.models import CustomUser

from api.serializer import MyTokenObtainPairSerializer, RegisterSerializer

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes

from rest_framework.exceptions import PermissionDenied
from api.admin_permissions import IsAdminRole
from api.serializer import AssignUserRoleSerializer

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class AssignUserRoleView(generics.UpdateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = AssignUserRoleSerializer
    permission_classes = [IsAdminRole]

    def perform_update(self, serializer):
        # Prevent admin from changing their own role
        if self.request.user.id == self.get_object().id:
            raise PermissionDenied("Admins cannot change their own role.")
        serializer.save()

# Get All Routes

@api_view(['GET'])
def getRoutes(request):
    routes = [
        '/api/token/',
        '/api/register/',
        '/api/token/refresh/'
    ]
    return Response(routes)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def testEndPoint(request):
    if request.method == 'GET':
        data = f"Congratulation {request.user}, your API just responded to GET request"
        return Response({'response': data}, status=status.HTTP_200_OK)
    elif request.method == 'POST':
        text = "Hello buddy"
        data = f'Congratulation your API just responded to POST request with text: {text}'
        return Response({'response': data}, status=status.HTTP_200_OK)
    return Response({}, status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_user_role(request, user_id):
    if request.user.role != 'admin':
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
    
    new_role = request.data.get('role')
    user = CustomUser.objects.get(id=user_id)
    user.role = new_role
    user.save()
    return Response({"detail": "Role updated"}, status=status.HTTP_200_OK)
