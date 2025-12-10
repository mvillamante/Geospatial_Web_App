from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    # Define user roles
    RESEARCHER = 'researcher'
    ADMIN = 'admin'
    OFFICER = 'officer'
    CITIZEN = 'citizen'

    ROLE_CHOICES = [
        (RESEARCHER, 'Researcher'),
        (ADMIN, 'Admin'),
        (OFFICER, 'Officer'),
        (CITIZEN, 'Citizen'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        blank=True,
    )

    def __str__(self):
        return f"{self.username} ({self.role})" if self.role else f"{self.username} (No role)"
