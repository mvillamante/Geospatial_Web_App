import random
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

def generate_otp(length: int = 6) -> str:
    return "".join(str(random.randint(0,9)) for _ in range(length))

def otp_expiry_minutes() -> int:
    return getattr(settings, "PASSWORD_RESET_OTP_EXP_MINUTES", 5)

def make_expiry():
    return timezone.now() + timedelta(minutes=otp_expiry_minutes())

def send_otp_email(to_email: str, otp: str):
    subject = "Your HazSpot password reset code"
    message = f"Your OTP code is {otp}\n\nThis code expires in {otp_expiry_minutes()} minutes."
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
    send_mail(subject, message, from_email, [to_email], fail_silently=False)

def send_otp_sms(to_phone: str, otp: str):
    """
    Placeholder. Implement via your SMS provider (Semaphore, Twilio, etc).
    """
    pass