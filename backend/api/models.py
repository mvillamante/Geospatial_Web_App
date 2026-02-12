from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.db import models
from django.dispatch import receiver
from django.utils import timezone
from django.conf import settings
from django.utils.timezone import now
from api.supabase_storage import delete_cms_photo

from django.utils.html import strip_tags

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
    staff_number = models.PositiveIntegerField(null=True, blank=True, unique=True)
    department = models.CharField(max_length=100, blank=True, null=True)

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
        if not self.staff_number:
            return ""
        return f"STF-{self.staff_number:03d}"
    
    def save(self, *args, **kwargs):
        staff_roles = ["researcher", "officer", "admin"]

        # Only assign staff_number if role is staff and not assigned yet
        user_roles = [(self.role or "").lower()] + [r.lower() for r in self.extra_roles or []]
        if any(r in staff_roles for r in user_roles) and not self.staff_number:
            from django.contrib.auth import get_user_model
            User = get_user_model()

            max_number = User.objects.filter(staff_number__isnull=False).aggregate(models.Max('staff_number'))['staff_number__max'] or 0
            self.staff_number = max_number + 1

        super().save(*args, **kwargs)
    
    def has_group(self, name: str) -> bool:
        return self.groups.filter(name=name).exists()

    def add_group(self, name: str):
        from django.contrib.auth.models import Group
        group, _ = Group.objects.get_or_create(name=name)
        self.groups.add(group)

    def remove_group(self, name: str):
        from django.contrib.auth.models import Group
        self.groups.remove(Group.objects.filter(name=name))
        
        
@receiver(post_save, sender=CustomUser)
def sync_user_groups(sender, instance: CustomUser, **kwargs):
    instance.groups.clear()

    # Primary role
    if instance.role:
        instance.add_group(instance.role.capitalize())

    # Extra roles
    for r in instance.extra_roles or []:
        instance.add_group(r.capitalize()) 
        
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
        ("archived", "Archived"),
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
    needs_info_note = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(null=True, blank=True)

    last_updated_at = models.DateTimeField(auto_now=True)
    
    reply_message = models.TextField(null=True, blank=True, help_text="Temporary reply from citizen when report needs info")
    reply_image_url = models.TextField(null=True, blank=True, help_text="Optional URL for reply image (e.g., stored in Supabase)")


# CMS Guide model ------------------------------------------------------------------
class CmsGuide(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("archived", "Archived"),
    ]

    POST_TYPE_CHOICES = [
        ("advisory", "Advisory"),
        ("announcement", "Announcement"),
        ("guide", "Guide"),
    ]

    # Internal ID
    id = models.BigAutoField(primary_key=True)

    # Public-facing ID
    post_id = models.CharField(max_length=50, unique=True, blank=True, null=True)

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
        default="advisory"
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

        did_just_publish = (self.status == "published" and old_status != "published")

        if did_just_publish:
            self.published_at = now()
        elif self.status != "published":
            self.published_at = None

        super().save(*args, **kwargs)

        if not self.post_id:
            self.post_id = f"POST-{self.id}"
            super().save(update_fields=["post_id"])
        
        if did_just_publish:
            Notification.objects.create(
                type="official",
                title=f"{self.get_post_type_display()}: {self.post_title}",
                body=(strip_tags(self.post_body) or "")[:220],
                cms_guide_id=self.id,
                cms_post_id=self.post_id,
            )
            

    def delete(self, *args, **kwargs):
        for attachment in getattr(self, "attachments", []).all():
            delete_cms_photo(attachment.file_url)
        super().delete(*args, **kwargs)

class CmsGuideAttachment(models.Model):
    guide = models.ForeignKey(
        CmsGuide,
        related_name="attachments",
        on_delete=models.CASCADE
    )
    file_url = models.TextField()
    file_type = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)



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


# Quick Contacts model ---------------------------------------------------------------
class QuickContact(models.Model):
    name = models.CharField(max_length=150)
    description = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True, null=True)
    facebook_url = models.URLField(blank=True, null=True)
    website_url = models.URLField(blank=True, null=True)
    office_hours = models.CharField(max_length=150, blank=True)
    address = models.TextField(blank=True)
    map_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class QuickContactPhone(models.Model):
    PHONE_TYPE_CHOICES = [
        ("hotline", "Hotline"),
        ("landline", "Landline"),
        ("mobile", "Mobile"),
    ]

    contact = models.ForeignKey(
        QuickContact,
        related_name="phones",
        on_delete=models.CASCADE
    )
    type = models.CharField(max_length=20, choices=PHONE_TYPE_CHOICES)
    label = models.CharField(max_length=100) 
    number = models.CharField(max_length=50)
    priority = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["priority"]

    def __str__(self):
        return f"{self.label} - {self.number}"
    
# Notification model ------------------------------------------------------------------
class Notification(models.Model):
    TYPE_CHOICES = [
        ("official", "Official"),
        ("incident", "Incident"),
        ("report", "Report"),
    ]
    
    EVENT_CHOICES = [
        ("verified", "Verified"),
        ("severity_changed", "Severity Changed"),
        ("resolved", "Resolved"),
    ]

    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    event = models.CharField(max_length = 30, choices=EVENT_CHOICES, null=True, blank=True)
    category = models.CharField(max_length=40, null=True, blank=True)
    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length = 255)
    body = models.TextField(blank=True, null=True)

    incident_id = models.BigIntegerField(null=True, blank=True)
    severity = models.CharField(max_length=20, null=True, blank=True)
    severity_from = models.CharField(max_length=20, null=True, blank=True)
    severity_to = models.CharField(max_length=20, null=True, blank=True)
    barangay = models.CharField(max_length=120, null=True, blank=True)

    cms_guide_id = models.BigIntegerField(null=True, blank=True)
    cms_post_id = models.CharField(max_length=50, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type}: {self.title}"

class NotificationRead(models.Model):
    """Tracks read/unread per user"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name="read")
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "notification")

# Resident Verification Model ========================================================
class ResidentVerificationRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="resident_verification_requests")
    barangay = models.CharField(max_length=120)
    address = models.TextField()
    id_image = models.ImageField(upload_to="verification_ids/")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    rejection_reason = models.TextField(blank=True, null=True)

    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_resident_verifications")
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

# Researcher Request model -----------------------------------------------------------
class ResearcherRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='researcher_requests'
    )
    purpose = models.TextField(blank=True, null=True)
    orgSchool = models.CharField(max_length=255, blank=True, null=True)
    attachment = models.FileField(upload_to="researcher_attachments/", blank=True, null=True)

    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
