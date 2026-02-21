from django.core.management.base import BaseCommand
from django.utils.timezone import now
from datetime import timedelta
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = "Deactivate inactive researchers"

    def handle(self, *args, **kwargs):
        User = get_user_model()
        cutoff = now() - timedelta(days=90)

        inactive_researchers = User.objects.filter(
            role="researcher",
            is_active=True,
            last_login__lt=cutoff
        )

        count = inactive_researchers.update(is_active=False)

        self.stdout.write(
            self.style.SUCCESS(f"Deactivated {count} inactive researchers.")
        )