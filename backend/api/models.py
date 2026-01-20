from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.db import models
from django.dispatch import receiver
from django.conf import settings

ROLE_CHOICES = [
    ('researcher', 'Researcher'),
    ('admin', 'Admin'),
    ('officer', 'Officer'),
    ('citizen', 'Citizen'),
]

# Custom User model ------------------------------------------------------------------
class CustomUser(AbstractUser):
    # Custom fields
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, blank=True)
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
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')

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

    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Verified", "Verified"),
        ("Rejected", "Rejected"),
        ("Resolved", "Resolved"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="incident_reports",
    )

    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField()

    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    accuracy_m = models.FloatField(null=True, blank=True)

    location_display = models.TextField(blank=True, default="")
    geocode_raw = models.JSONField(null=True, blank=True)

    photo_path = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")


# CMS Guide model ------------------------------------------------------------------
class CmsGuide(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("archived", "Archived"),
    ]

    title = models.CharField(max_length=255)
    category = models.CharField(max_length=50)
    content = models.TextField()
    status = models.CharField(max_length=20, default="draft")
    views = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft"
    )

    views = models.IntegerField(default=0)

    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title