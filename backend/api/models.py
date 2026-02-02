from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.db import models
from django.dispatch import receiver
from django.utils import timezone
from django.conf import settings
from django.utils.timezone import now

import uuid
import hashlib


ROLE_CHOICES = [
    ('researcher', 'Researcher'),
    ('admin', 'Admin'),
    ('officer', 'Officer'),
    ('citizen', 'Citizen'),
]

# Custom User model ------------------------------------------------------------------
class CustomUser(AbstractUser):
    # Custom fields
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, blank=True, null=True)
    extra_roles = models.JSONField(default=list, blank=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    supabase_uid = models.CharField(max_length=255, null=True, blank=True)

    groups = models.ManyToManyField(
        'auth.Group',
        related_name='customuser_groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_query_name='customuser'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='customuser_permissions',
        blank=True,
        help_text='Specific permissions for this user.',    
        related_query_name='customuser'
    )

    def __str__(self):
        return f"{self.username} ({self.role})" if self.role else f"{self.username} (No role)"
    
    # ===== Staff ID property =====
    @property
    def staff_id(self) -> str:
        role = (self.role or "").lower()
        extra_roles = self.extra_roles or []

        # Citizens without Researcher role do NOT get a staff ID
        if role == "citizen" and "Researcher" not in extra_roles:
            return ""

        if not self.id:
            return ""

        # Base36 style ID
        import string
        chars = string.digits + string.ascii_uppercase
        n = self.id
        result = ""
        while n > 0:
            n, rem = divmod(n, 36)
            result = chars[rem] + result

        return f"STF-{result or '0'}"
    
    
    
    
    
# Researcher Request model -----------------------------------------------------------
class ResearcherRequest(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='researcher_requests'
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reject_reason = models.TextField(blank=True, null=True)
    rejected_at = models.DateTimeField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.status}"





# Incident Report model ------------------------------------------------------------------
class IncidentReport(models.Model):
    CATEGORY_CHOICES = [
        ("fire", "Fire"),
        ("flood", "Flood"),
        ("landslide", "Landslide"),
        ("accident", "Accident"),
        ("others", "Others"),
    ]

    SUGGESTED_CRITICAL_LEVEL_CHOICES = [
        ("low", "Low"),
        ("moderate", "Moderate"),
        ("high", "High"),
        ("critical", "Critical")
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("needs_info", "Needs Info"),
        ("rejected", "Rejected"),
        ("resolved", "Resolved"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="incident_reports",
    )

    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    other_category = models.CharField(max_length=100, null=True, blank=True)

    description = models.TextField()
    suggested_critical_level = models.CharField(max_length=20, null=True, choices=SUGGESTED_CRITICAL_LEVEL_CHOICES)

    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    accuracy_m = models.FloatField(null=True, blank=True)

    location_display = models.TextField(blank=True, default="")

    photo_path = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    verified_critical_level = models.CharField(max_length=20, null=True, blank=True, choices=SUGGESTED_CRITICAL_LEVEL_CHOICES,)
    assigned_officer = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_incident_reports",)
    officer_note = models.TextField(null=True, blank=True)
    rejection_reason = models.TextField(null=True, blank=True)

    last_updated_at = models.DateTimeField(auto_now=True)



# CMS Guide model ------------------------------------------------------------------
class CmsGuide(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("archived", "Archived"),
    ]

    POST_TYPE_CHOICES = [
        ("safety", "Safety"),
        ("protocol", "Protocol"),
        ("preparedness", "Preparedness"),
        ("announcement", "Announcement"),
    ]

    # Internal ID
    id = models.BigAutoField(primary_key=True)

    # Public-facing ID
    post_id = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True
    )

    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cms_guides"
    )

    post_type = models.CharField(
        max_length=50,
        choices=POST_TYPE_CHOICES,
        default="safety"
    )

    post_title = models.CharField(max_length=255)
    post_body = models.TextField()  # Lexical HTML / JSON

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft"
    )

    is_pinned = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.post_title} ({self.status})"

    @property
    def staff_id(self):
        return self.created_by.staff_id if self.created_by else ""

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_status = None

        if self.pk:
            old_status = CmsGuide.objects.get(pk=self.pk).status

        if self.status == "published" and (old_status != "published"):
            self.published_at = now()

        if self.status != "published":
            self.published_at = None

        super().save(*args, **kwargs)

        if is_new and not self.post_id:
            self.post_id = f"POST-{self.id}"
            super().save(update_fields=["post_id"])

class CmsGuideAttachment(models.Model):
    FILE_TYPE_CHOICES = [
        ("image", "Image"),
    ]

    guide = models.ForeignKey(
        CmsGuide,
        on_delete=models.CASCADE,
        related_name="attachments"
    )

    file = models.ImageField(upload_to="cms_guides/")
    file_type = models.CharField(
        max_length=20,
        choices=FILE_TYPE_CHOICES,
        default="image"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file_type} - {self.guide.post_title}"


# Evacuation Center model ---------------------------------------------------------------
class EvacuationCenter(models.Model):
    CENTER_TYPE_CHOICES = [
        ("school", "School"),
        ("court", "Court"),
        ("hall", "Hall"),
        ("gymnasium", "Gymnasium"),
    ]

    name = models.CharField(max_length=255)
    type = models.CharField(max_length=50, choices=CENTER_TYPE_CHOICES)
    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    capacity = models.PositiveIntegerField(default=0)
    address = models.TextField(blank=True)
    barangay = models.CharField(max_length=100, blank=True)
    contact = models.CharField(max_length=50, blank=True)
    facilities = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"

    @property
    def coordinates(self):
        """Return coordinates as a tuple for Leaflet use"""
        return (float(self.latitude), float(self.longitude))
    
class PasswordResetOTP(models.Model):
    """
    Stores a hashed OTP for password reset.
    Use email_or_phone to find the user.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email_or_phone = models.CharField(max_length=255, db_index=True)

    otp_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=5)
    is_used = models.BooleanField(default=False)

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at
    
    @staticmethod
    def hash_otp(otp: str) -> str:
        return hashlib.sha256(otp.encode("utf-8")).hexdigest()
    
    def __str__(self):
        return f"PasswordResetOTP({self.email_or_phone})"