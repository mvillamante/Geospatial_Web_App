from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.db import models
from django.dispatch import receiver
from django.utils import timezone
from django.conf import settings
from django.utils.timezone import now
from api.supabase_storage import delete_cms_photo

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

        if self.status == "published" and (old_status != "published"):
            self.published_at = now()

        if self.status != "published":
            self.published_at = None

        super().save(*args, **kwargs)

        if is_new and not self.post_id:
            self.post_id = f"POST-{self.id}"
            super().save(update_fields=["post_id"])

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