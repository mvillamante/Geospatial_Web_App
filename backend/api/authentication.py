import jwt
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
from .models import CustomUser
import os

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

class SupabaseJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return None

        try:
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"])
            supabase_uid = payload.get("sub")

            try:
                user = CustomUser.objects.get(supabase_uid=supabase_uid)
            except CustomUser.DoesNotExist:
                email = payload.get("email", "")
                first_name = payload.get("user_metadata", {}).get("first_name", "Citizen")
                last_name = payload.get("user_metadata", {}).get("last_name", "")
                username = f"{first_name.capitalize()}.{last_name.capitalize()}" if last_name else first_name.capitalize()

                user = CustomUser.objects.create(
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    role="citizen",
                    supabase_uid=supabase_uid,
                    is_active=True,
                )
                # JWT-only login, password not required
                user.set_unusable_password()
                user.save()

            return (user, None)
        except Exception:
            raise exceptions.AuthenticationFailed("Invalid token")