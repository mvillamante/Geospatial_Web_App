from django.contrib.auth.models import AbstractUser
from django.db.models.signals import post_save
from django.db import models
from django.dispatch import receiver

ROLE_CHOICES = [
    ('researcher', 'Researcher'),
    ('admin', 'Admin'),
    ('officer', 'Officer'),
    ('citizen', 'Citizen'),
]

class CustomUser(AbstractUser):
    # Custom fields
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, blank=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    supabase_uid = models.CharField(max_length=255, null=True, blank=True)

    # Override the default related_name for the groups and user_permissions fields
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='customuser_groups',  # Custom related name to avoid clashes
        blank=True,
        help_text='The groups this user belongs to.',
        related_query_name='customuser'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='customuser_permissions',  # Custom related name to avoid clashes
        blank=True,
        help_text='Specific permissions for this user.',
        related_query_name='customuser'
    )

    def __str__(self):
        return f"{self.username} ({self.role})" if self.role else f"{self.username} (No role)"
    
