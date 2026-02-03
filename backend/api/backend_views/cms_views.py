from django.utils.timezone import now

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from api.models import CmsGuide, CmsGuideAttachment
from api.serializer import CmsGuideSerializer, CmsGuideAttachmentSerializer, CmsGuideAttachmentCreateSerializer
from api.supabase_storage import upload_cms_photo

def admin_only(user):
    return user.role == "admin"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_guides(request):
    guides = (
        CmsGuide.objects
        .exclude(status="archived")
        .order_by("-updated_at")
    )
    serializer = CmsGuideSerializer(guides, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_guide(request):
    if not admin_only(request.user):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    guide = CmsGuide.objects.create(
        post_title=request.data.get("postTitle"),
        post_type=request.data.get("postType"),
        post_body=request.data.get("postBody"),
        status="draft",
        created_by=request.user,
    )

    serializer = CmsGuideSerializer(guide)
    return Response(serializer.data, status=status.HTTP_201_CREATED)



@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_guide(request, pk):
    if not admin_only(request.user):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    try:
        guide = CmsGuide.objects.get(pk=pk)
    except CmsGuide.DoesNotExist:
        return Response({"error": "Guide not found"}, status=status.HTTP_404_NOT_FOUND)

    data = {
        "post_title": request.data.get("postTitle"),
        "post_type": request.data.get("postType"),
        "post_body": request.data.get("postBody"),
    }

    serializer = CmsGuideSerializer(guide, data=data, partial=True)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def toggle_publish(request, pk):
    if not admin_only(request.user):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    try:
        guide = CmsGuide.objects.get(pk=pk)
    except CmsGuide.DoesNotExist:
        return Response({"error": "Guide not found"}, status=status.HTTP_404_NOT_FOUND)

    if guide.status != "published":
        guide.status = "published"
        guide.published_at = now()
    else:
        guide.status = "draft"
        guide.published_at = None

    guide.save()

    return Response({
        "status": guide.status,
        "published_at": guide.published_at,
        "updated_at": guide.updated_at,
    })


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def archive_guide(request, pk):
    if not admin_only(request.user):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    try:
        guide = CmsGuide.objects.get(pk=pk)
    except CmsGuide.DoesNotExist:
        return Response({"error": "Guide not found"}, status=status.HTTP_404_NOT_FOUND)

    guide.status = "archived"
    guide.save()

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def permanent_delete_guide(request, pk):
    if not admin_only(request.user):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    try:
        guide = CmsGuide.objects.get(pk=pk)
    except CmsGuide.DoesNotExist:
        return Response({"error": "Guide not found"}, status=status.HTTP_404_NOT_FOUND)

    guide.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_guide_attachment(request, pk):
    if not admin_only(request.user):
        return Response({"detail": "Forbidden"}, status=403)

    try:
        guide = CmsGuide.objects.get(pk=pk)
    except CmsGuide.DoesNotExist:
        return Response({"error": "Guide not found"}, status=404)

    file = request.FILES.get("image")
    if not file:
        return Response({"error": "No file provided"}, status=400)

    file_url, file_type = upload_cms_photo(file, "cms-photos")

    attachment = CmsGuideAttachment.objects.create(
        guide=guide,
        file_url=file_url,
        file_type=file_type
    )

    return Response(
        CmsGuideAttachmentSerializer(attachment).data,
        status=201
    )
