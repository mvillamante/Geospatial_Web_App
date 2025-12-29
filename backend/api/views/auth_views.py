# auth_views.py
from django.http import JsonResponse
from django.conf import settings
from api.models import CustomUser
import jwt

def get_current_user(request):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return JsonResponse({"error": "No Authorization header"}, status=401)

    try:
        token = auth_header.split(" ")[1]  # Expect: "Bearer <token>"
        payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"])
        supabase_uid = payload["sub"]
        user = CustomUser.objects.get(supabase_uid=supabase_uid)

        return JsonResponse({
            "id": user.id,
            "email": user.email,
            "role": user.role
        })
    except jwt.ExpiredSignatureError:
        return JsonResponse({"error": "Token expired"}, status=401)
    except jwt.InvalidTokenError:
        return JsonResponse({"error": "Invalid token"}, status=401)
    except CustomUser.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
