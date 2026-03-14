from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import timedelta
from django.db import transaction
from django.core.cache import cache


from api.models import PasswordResetOTP
from api.serializer import *

from api.utils import *

import hmac

User = get_user_model()

def find_user_by_email_or_phone(email_or_phone: str):
    eop = (email_or_phone or "").strip()
    if not eop:
        return None
    user = User.objects.filter(email__iexact=eop).first()
    if user:
        return user
    return User.objects.filter(phone__iexact=eop).first()


class PasswordResetRequestOTP(APIView):
    """
    POST { email_or_phone }
    Always returns 200 to avoid account enumeration.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        ser = PasswordResetRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        email_or_phone = ser.validated_data["email_or_phone"].strip()

        ip = request.META.get("REMOTE_ADOR")

        rate_key = f"otp_rate:{ip}"
        if cache.get(rate_key):
            return Response(
                {"detail": "Too many requests. Please wait."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        cache.set(rate_key, True, 60)

        recent = PasswordResetOTP.objects.filter(
            email_or_phone=email_or_phone,
            created_at__gte=timezone.now() - timedelta(seconds=60)
        ).exists()

        if recent:
            return Response(
                {"detail": "If the account exists, an OTP was sent. Please wait a minute before retrying."},
                status=status.HTTP_200_OK,
            )

        user = find_user_by_email_or_phone(email_or_phone)

        otp = generate_otp(6)
        otp_hash = PasswordResetOTP.hash_otp(otp)
        expires_at = timezone.now() + timedelta(minutes=5)

        # Delete previous OTPs for this identifier
        PasswordResetOTP.objects.filter(
            email_or_phone=email_or_phone
        ).delete()

        # Create OTP entry
        PasswordResetOTP.objects.create(
            email_or_phone=email_or_phone,
            user=user if user else None,
            otp_hash=otp_hash,
            expires_at=expires_at
)

        # Send only if user exists (avoid enumeration)
        if user:
            if "@" in email_or_phone:
                send_otp_email(email_or_phone, otp)
            else:
                send_otp_sms(email_or_phone, otp)

        return Response(
            {"detail": "If the account exists, an OTP has been sent."},
            status=status.HTTP_200_OK,
        )

class PasswordResetVerifyOTP(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        ser = PasswordResetVerifySerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        email_or_phone = ser.validated_data["email_or_phone"].strip()
        otp = ser.validated_data["otp"].strip()

        record = (
            PasswordResetOTP.objects.filter(
                email_or_phone=email_or_phone,
                is_used=False
            )
            .order_by("-created_at")
            .first()
        )

        if not record:
            return Response({"detail": "Invalid OTP."}, status=400)

        if record.is_expired():
            return Response({"detail": "OTP expired."}, status=400)

        if record.attempts >= record.max_attempts:
            return Response({"detail": "Too many attempts."}, status=400)

        incoming_hash = PasswordResetOTP.hash_otp(otp)

        if not hmac.compare_digest(incoming_hash, record.otp_hash):
            record.attempts += 1
            record.save(update_fields=["attempts"])
            return Response({"detail": "Invalid OTP."}, status=400)

        return Response({"detail": "OTP verified."}, status=200)
    
class PasswordResetConfirmOTP(APIView):
    """
    POST { email_or_phone, otp, new_password }
    Validates OTP and resets password.
    """
    authentication_classes = []
    permission_classes = []

    @transaction.atomic
    def post(self, request):
        ser = PasswordResetConfirmSerializer(data=request.data)

        if not ser.is_valid():
            print("SERIALIZER ERROR:", ser.errors)
            return Response(ser.errors, status=400)

        ser.is_valid(raise_exception=True)

        email_or_phone = ser.validated_data["email_or_phone"].strip()
        otp = ser.validated_data["otp"].strip()
        new_password = ser.validated_data["new_password"]

        user = find_user_by_email_or_phone(email_or_phone)

        if not user:
            return Response({"detail": "Invalid request."}, status=400)

        record = (
            PasswordResetOTP.objects.filter(email_or_phone=email_or_phone, is_used=False)
            .order_by("-created_at")
            .first()
        )

        if not record:
            return Response({"detail": "Invalid OTP or expired."}, status=status.HTTP_400_BAD_REQUEST)

        if record.is_expired():
            return Response({"detail": "OTP expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)

        if record.attempts >= record.max_attempts:
            return Response({"detail": "Too many attempts. Please request a new OTP."}, status=status.HTTP_400_BAD_REQUEST)

        incoming_hash = PasswordResetOTP.hash_otp(otp)

        if not hmac.compare_digest(incoming_hash, record.otp_hash):
            return Response({"detail": "Invalid OTP."}, status=400)

        record.is_used = True
        record.save(update_fields=["is_used"])

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response({"detail": "Password reset successful."}, status=status.HTTP_200_OK)

