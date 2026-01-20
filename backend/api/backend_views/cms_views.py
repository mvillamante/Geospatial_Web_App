from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from api.models import CmsGuide
from api.serializer import CmsGuideSerializer

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_guides(request):
    guides = CmsGuide.objects.exclude(status="archived").order_by("-updated_at")
    serializer = CmsGuideSerializer(guides, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_guide(request):
    if request.user.role != "admin":
        return Response({"detail": "Forbidden"}, status=403)

    guide = CmsGuide.objects.create(
        title=request.data["title"],
        category=request.data["category"],
        content=request.data["content"],
        status="draft",
    )

    return Response({
        "id": guide.id,
        "title": guide.title,
        "category": guide.category,
        "updated_at": guide.updated_at,
    }, status=201)



@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_guide(request, pk):
    try:
        guide = CmsGuide.objects.get(pk=pk)
    except CmsGuide.DoesNotExist:
        return Response({"error": "Guide not found"}, status=404)

    serializer = CmsGuideSerializer(guide, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def toggle_publish(request, pk):
    try:
        guide = CmsGuide.objects.get(pk=pk)
    except CmsGuide.DoesNotExist:
        return Response({"error": "Guide not found"}, status=404)

    guide.status = "published" if guide.status != "published" else "draft"
    guide.save()
    return Response({"status": guide.status})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def archive_guide(request, pk):
    try:
        guide = CmsGuide.objects.get(pk=pk)
    except CmsGuide.DoesNotExist:
        return Response({"error": "Guide not found"}, status=404)

    guide.status = "archived"
    guide.save()
    return Response(status=204)