from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.db import transaction
from django.utils.html import strip_tags

from api.models import IncidentReport, Notification

HIGH_CRIT= {"high", "critical"}

def norm(s: str | None) -> str:
    return (s or "").strip().lower()

def incident_title(obj: IncidentReport) -> str:
    if obj.category == "others" and obj.other_category:
        return obj.other_category.strip()
    return obj.get_category_display()

def incident_place(obj: IncidentReport) -> str:
    return (obj.location_display or "").strip()

@receiver(pre_save, sender=IncidentReport)
def incidentreport_capture_old(sender, instance: IncidentReport, **kwargs):
    """
    Attach old values onto the instance before it is saved.
    """
    if not instance.pk:
        instance._old_verified = None
        instance.old_status = None
        return
    
    old = IncidentReport.objects.filter(pk=instance.pk).only("verified_critical_level", "status").first()
    instance.old_verified = norm(old.verified_critical_level) if old else None
    instance.old_status = norm(old.status) if old else None

@receiver(post_save, sender=IncidentReport)
def incidentreport_create_notifications(sender, instance: IncidentReport, created: bool, **kwargs):
    new_verified = norm(getattr(instance, "verified_critical_level", None))
    new_status = norm(getattr(instance, "status", None))
    old_verified = getattr(instance, "_old_verified", None)
    old_status = getattr(instance, "_old_status", None)

    title = incident_title(instance)
    place = incident_title(instance)

    def create_notif(event: str, notif_title: str, body: str, severity: str):
        Notification.objects.create(
            type="incident",
            event=event,
            title=notif_title,
            body=body,
            incident_id=instance.id,
            severity=severity,
            barangay=place[:255] if place else None,
        )
    
    def do_create():
        if created:
            if new_verified in HIGH_CRIT:
                create_notif(
                    event="verified",
                    notif_title=f"Verified {title}",
                    body=f"{new_verified.title()} • Barangay {place}" if place else new_verified.title(),
                    severity=new_verified,
                )
            
        else:
            if old_verified != new_verified and new_verified in HIGH_CRIT:
                event = "verified" if not old_verified else "severity_changed"
                head = "Verified" if event == "verified" else "Severity changed"

                change_text = f"{(old_verified or 'unverified').title()} → {new_verified.title()}"
                body = change_text + (f" • Barangay {place}" if place else "")
                        
                create_notif(
                    event=event,
                    notif_title=f"{head}: {title}",
                    body=body,
                    severity=new_verified,
                )
            
            if old_status != "resolved" and new_status == "resolved":
                sev = new_verified if new_verified else old_verified
                if sev in HIGH_CRIT:
                    note = (instance.officer_note or "").strip()
                    extra = f" • {strip_tags(note)[:120]}" if note else ""
                    body = f"{title} • {sev.title()}" + (f" • Barangay {place}" if place else "") + extra

                    create_notif(
                        event="resolved",
                        notif_title="Hazard cleared / resolved",
                        body=body,
                        severity=sev,
                    )
    transaction.on_commit(do_create)