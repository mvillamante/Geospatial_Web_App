import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions
from .models import CustomUser

class SupabaseJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth = request.headers.get("Authorization")
        if not auth:
            return None

        try:
            scheme, token = auth.split(" ", 1)
            if scheme.lower() != "bearer":
                return None

            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )

            supabase_uid = payload.get("sub")
            if not supabase_uid:
                raise exceptions.AuthenticationFailed("Invalid token (no sub)")

            user, created = CustomUser.objects.get_or_create(
                supabase_uid=supabase_uid,
                defaults={
                    "email": payload.get("email", ""),
                    "first_name": payload.get("user_metadata", {}).get("first_name", "Citizen"),
                    "last_name": payload.get("user_metadata", {}).get("last_name", ""),
                    "role": "citizen",
                    "is_active": True,
                },
            )

            if created:
                fn = (user.first_name or "Citizen").strip()
                ln = (user.last_name or "").strip()
                user.username = f"{fn.capitalize()}{ln.capitalize()}" if ln else fn.capitalize()
                user.set_unusable_password()
                user.save()

            return (user, None)

        except Exception:
            raise exceptions.AuthenticationFailed("Invalid token")
