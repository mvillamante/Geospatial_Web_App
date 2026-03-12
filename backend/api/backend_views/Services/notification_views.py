from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.timezone import now
from django.db.models import Q
from datetime import timedelta
from rest_framework import status
from api.models import Notification, NotificationRead
from api.serializer import NotificationSerializer, ResidentVerificationRequest
from api.models import IncidentReport
from django.db.models import Q

def get_visible_notifications(user):

    qs = Notification.objects.filter(
        Q(target_user=user) |
        Q(type__in=["official", "incident"]),
        created_at__gte=user.date_joined
    ).distinct()

    # Community announcements toggle
    if not user.receive_community_announcements:
        qs = qs.exclude(type="official")

    # Hazard alerts toggle
    if not user.receive_hazard_alerts:
        qs = qs.exclude(type="incident")

    severity_rank = {
        "low": 1,
        "moderate": 2,
        "high": 3,
        "critical": 4,
    }

    if user.alert_severity:
        min_rank = severity_rank.get(user.alert_severity, 1)

        allowed = [s for s, r in severity_rank.items() if r >= min_rank]

        qs = qs.filter(
            Q(type="incident", severity__in=allowed) |
            ~Q(type="incident")
        )

    return qs

class NotificationList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = get_visible_notifications(request.user).order_by("-created_at")[:200]

        serializer = NotificationSerializer(
            qs,
            many=True,
            context={"request": request}
        )

        return Response(serializer.data)

    
class MarkNotificationRead(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        notif_id = request.data.get("notification_id")
        if not notif_id:
            return Response({"detail": "notification_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if not Notification.objects.filter(id=notif_id).exists():
            return Response({"detail": "Notification not found"}, status=status.HTTP_404_NOT_FOUND)

        rel, _ = NotificationRead.objects.get_or_create(
            user=request.user, 
            notification_id=notif_id,
            defaults={"is_read": True, "read_at": now()},
        )

        if not rel.is_read:
            rel.is_read = True
            rel.read_at = now()
            rel.save(update_fields=["is_read", "read_at"])

        return Response({"ok": True})
        

class MarkAllRead(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        qs = get_visible_notifications(request.user)
        ids = list(qs.values_list("id", flat=True))

        NotificationRead.objects.filter(
            user=request.user,
            notification_id__in=ids
        ).update(is_read=True, read_at=now())

        existing_ids = set(
            NotificationRead.objects.filter(
                user=request.user,
                notification_id__in=ids
            ).values_list("notification_id", flat=True)
        )

        missing_ids = [nid for nid in ids if nid not in existing_ids]

        NotificationRead.objects.bulk_create(
            [
                NotificationRead(
                    user=request.user,
                    notification_id=nid,
                    is_read=True,
                    read_at=now()
                )
                for nid in missing_ids
            ],
            ignore_conflicts=True
        )

        return Response({"ok": True})
        
class UnreadNotificationCount(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = get_visible_notifications(request.user)

        unread_count = qs.filter(
            ~Q(read__user=request.user, read__is_read=True)
        ).distinct().count()

        return Response({"unread_count": unread_count})