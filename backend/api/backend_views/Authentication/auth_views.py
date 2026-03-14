import jwt

from datetime import timedelta
from django.utils import timezone
from django.http import JsonResponse
from django.db import IntegrityError
from django.conf import settings

from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import generics
from rest_framework_simplejwt.views import TokenObtainPairView

from api.models import CustomUser
from api.serializer import *

from supabase import create_client, Client

# Supabase client initialization
url = settings.SUPABASE_URL
key = settings.SUPABASE_SERVICE_ROLE_KEY
supabase: Client = create_client(url, key)

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

def get_current_user(request):
    """
    Endpoint: GET /api/current_user/
    Requires: Authorization: Bearer <JWT>
    Returns: Django CustomUser info mapped from Supabase UID
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return JsonResponse({"error": "No Authorization header"}, status=401)

    try:
        # Extract JWT token from the Authorization header
        token = auth_header.split(" ")[1]  # Expecting "Bearer <token>"

        # Decode the token using the secret key
        payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")  # Extract user ID from the payload

        if not user_id:
            return JsonResponse({"error": "Invalid token payload"}, status=401)

        # Find the user from your database
        user = CustomUser.objects.get(id=user_id)
        
        # Return the user data in the response
        return JsonResponse({"id": user.id, "username": user.username, "email": user.email}, status=200)

    except jwt.ExpiredSignatureError:
        return JsonResponse({"error": "Token expired"}, status=401)
    except jwt.InvalidTokenError:
        return JsonResponse({"error": "Invalid token"}, status=401)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    data = request.data
    username_or_phone = data.get("username_or_phone", "").strip()
    password = data.get("password", "").strip()

    if not username_or_phone or not password:
        return JsonResponse({"error": "Username/phone and password required"}, status=400)

    try:
        if "@" in username_or_phone:
            user = CustomUser.objects.get(email=username_or_phone)
        else:
            user = CustomUser.objects.get(phone=username_or_phone)

        # automatic deactivation for inactive Researchers
        if "Researcher" in (user.extra_roles or []) and user.last_login:
            if timezone.now() - user.last_login > timedelta(days=90):
                user.is_active = False
                user.save(update_fields=['is_active'])
                return JsonResponse({
                    "error": "Your account has been deactivated due to 90 days of inactivity. Contact admin to reactivate."
                }, status=403)

        if not user.is_active:
            return JsonResponse({"error": "Account is inactive. Please contact an administrator."}, status=403)

        if user.check_password(password):
            try:
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])
            except Exception as e:
                print("Failed to update last_login:", e)
            
            refresh = RefreshToken.for_user(user)
            return JsonResponse({
                "message": "Login successful",
                "access_token": str(refresh.access_token),
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "role": user.role,
                    "extra_roles": user.extra_roles or [],
                    "is_resident_verified": user.is_resident_verified,
                }
            }, status=200)
        else:
            return JsonResponse({"error": "Invalid credentials"}, status=401)

    except CustomUser.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)

# Signup User using JWT tokens
@api_view(['POST'])
@permission_classes([AllowAny])
def sign_up(request):
    data = request.data
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    email = data.get('email', "").strip()
    phone = data.get('phone', "").strip()
    password = data.get('password')

    if not all([first_name, last_name, email, phone, password]):
        return JsonResponse({"error": "All fields are required"}, status=400)
    if CustomUser.objects.filter(email=email).exists():
        return JsonResponse({"error": "Email already exists"}, status=400)
    if CustomUser.objects.filter(phone=phone).exists():
        return JsonResponse({"error": "Phone already exists"}, status=400)

    username = f"{first_name.capitalize()}.{last_name.capitalize()}"

    try:
        # Create Django user with hashed password
        user = CustomUser.objects.create(
            username=username,
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            role="citizen",
            is_active=True,
        )
        user.set_password(password)
        user.save()

        # Generate Django JWT
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        return JsonResponse({
            "message": "User registered successfully",
            "access_token": access_token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "phone": user.phone,
                "role": user.role,
            }
        }, status=201)

    except IntegrityError:
        return JsonResponse({"error": "Email or phone already exists"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

class MeView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user
    
