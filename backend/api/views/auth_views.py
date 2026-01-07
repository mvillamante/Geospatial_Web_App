from django.http import JsonResponse
from django.db import IntegrityError
from django.conf import settings

from api.models import CustomUser

from supabase import create_client, Client

import jwt

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status



# Supabase client initialization
url = settings.SUPABASE_URL
key = settings.SUPABASE_KEY
supabase: Client = create_client(url, key)


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

        if user.check_password(password):
            refresh = RefreshToken.for_user(user)
            return JsonResponse({
                "message": "Login successful",
                "access_token": str(refresh.access_token),
                "user_id": user.id,
                "role": user.role
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
    
    print("REQUEST DATA in views @here:", request.data)

    if not all([first_name, last_name, email, phone, password]):
        return JsonResponse({"error": "All fields are required"}, status=400)

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
                "supabase_uid": user.supabase_uid,
            }
        }, status=201)

    except IntegrityError:
        return JsonResponse({"error": "Email or phone already exists"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
