from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from api.models import CmsGuide

posts = CmsGuide.objects.all()

@api_view(["GET"])
@permission_classes([AllowAny])
def community_feed(request):
    posts = CmsGuide.objects.filter(status="published").order_by("-published_at")

    data = []
    for p in posts:
        attachments = []
        if hasattr(p, "attachments") and p.attachments.exists():
            attachments = [att.file_url for att in p.attachments.all()]

        data.append({
            "id": p.id,
            "type": p.post_type, 
            "title": p.post_title,
            "body": p.post_body,
            "author": p.created_by.username if p.created_by else "CDRRMO",
            "created_at": p.published_at.isoformat() if p.published_at else p.updated_at.isoformat(),
            "pinned": getattr(p, "pinned", False),
            "area": getattr(p, "area", None),
            "attachments": attachments,   # <-- all URLs here
        })

    return Response(data)
