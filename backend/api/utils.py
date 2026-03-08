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

    text_message = f"""
Your OTP code is {otp}

This code expires in {otp_expiry_minutes()} minutes.
"""

    html_message = f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:10px;padding:30px;
        box-shadow:0 4px 12px rgba(0,0,0,0.05);">

          <tr>
            <td align="center">
              <h2 style="color:#1f2937;margin-bottom:10px;">
                HazSpot Password Reset
              </h2>

              <p style="color:#6b7280;font-size:14px;">
                Use the OTP below to reset your password
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:30px 0;">
              <div style="
                font-size:32px;
                letter-spacing:8px;
                font-weight:bold;
                color:#2563eb;
                background:#f1f5f9;
                padding:15px 25px;
                border-radius:8px;
                display:inline-block;
                font-family:monospace;">
                {otp}
              </div>
            </td>
          </tr>

          <tr>
            <td align="center">
              <p style="color:#6b7280;font-size:13px;">
                This code expires in <strong>{otp_expiry_minutes()} minutes</strong>.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="color:#9ca3af;font-size:12px;">
                If you didn’t request this reset, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)

    send_mail(
        subject,
        text_message,
        from_email,
        [to_email],
        html_message=html_message,
        fail_silently=False
    )
    
def send_otp_sms(to_phone: str, otp: str):
    """
    Placeholder. Implement via your SMS provider (Semaphore, Twilio, etc).
    """
    pass