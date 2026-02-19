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

class NotificationList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        verification = ResidentVerificationRequest.objects.filter(
            user=request.user,
            status="approved"
        ).first()

        user_barangay = verification.barangay if verification else None

        # Get all report IDs owned by the user
        user_report_ids = IncidentReport.objects.filter(
            user=request.user
        ).values_list("id", flat=True)

        qs = Notification.objects.filter(
            Q(barangay=user_barangay) |
            Q(barangay__isnull=True) |
            Q(report_id__in=user_report_ids)
        ).distinct().order_by("-created_at")[:200]

        return Response(
            NotificationSerializer(qs, many=True, context={"request": request}).data
        )



    
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
        ids = list(Notification.objects.values_list("id", flat=True))

        NotificationRead.objects.filter(
            user=request.user,
            notification_id__in=ids
        ).update(is_read=True, read_at=now())

        existing_ids = set(
            NotificationRead.objects.filter(user=request.user, notification_id__in=ids)
            .values_list("notification_id", flat=True)
        )

        missing_ids = [nid for nid in ids if nid not in existing_ids]

        NotificationRead.objects.bulk_create(
            [
                NotificationRead(user=request.user, notification_id=nid, is_read=True, read_at=now())
                for nid in missing_ids
            ],
            ignore_conflicts=True
        )


        return Response({"ok": True})
        
class UnreadNotificationCount(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = now().date()

        unread_count = Notification.objects.filter(
            created_at__date=today
        ).exclude(
            read__user=request.user,
            read__is_read=True
        ).count()

        return Response({"unread_count": unread_count})

