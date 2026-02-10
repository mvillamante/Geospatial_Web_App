from django.utils.timezone import now

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from api.models import CmsGuide, CmsGuideAttachment, QuickContact, QuickContactPhone
from api.serializer import CmsGuideSerializer, CmsGuideAttachmentSerializer, CmsGuideAttachmentCreateSerializer,QuickContactSerializer, QuickContactPhoneSerializer
from api.supabase_storage import upload_cms_photo

def admin_only(user):
    return user.role == "admin"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_guides(request):
    guides = CmsGuide.objects.all().order_by("-updated_at")
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

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def restore_guide(request, pk):
    if not admin_only(request.user):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    try:
        guide = CmsGuide.objects.get(pk=pk)
    except CmsGuide.DoesNotExist:
        return Response({"error": "Guide not found"}, status=status.HTTP_404_NOT_FOUND)

    if guide.status != "archived":
        return Response(
            {"error": "Guide is not archived"},
            status=status.HTTP_400_BAD_REQUEST
        )

    guide.status = "draft"
    guide.save()

    return Response(
        CmsGuideSerializer(guide).data,
        status=status.HTTP_200_OK
    )


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
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_guide_attachment(request, attachment_id):
    if not admin_only(request.user):
        return Response({"detail": "Forbidden"}, status=403)

    try:
        attachment = CmsGuideAttachment.objects.get(pk=attachment_id)
    except CmsGuideAttachment.DoesNotExist:
        return Response({"error": "Attachment not found"}, status=404)

   
    from api.supabase_storage import delete_cms_photo

    delete_cms_photo(attachment.file_url) 

    
    attachment.delete()

    return Response(status=204)

#Quick Contacts View
@api_view(["GET"])
@permission_classes([AllowAny])
def quick_contacts(request):
    contact = QuickContact.objects.filter(is_active=True).first()
    if not contact:
        return Response({}, status=status.HTTP_200_OK)
    serializer = QuickContactSerializer(contact)
    return Response(serializer.data)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_quick_contact(request, pk):
    if not admin_only(request.user):
        return Response({"detail": "Forbidden"}, status=403)

    try:
        contact = QuickContact.objects.get(pk=pk)
    except QuickContact.DoesNotExist:
        return Response({"error": "QuickContact not found"}, status=404)

    
    phones_data = request.data.pop("phones", [])

    
    serializer = QuickContactSerializer(contact, data=request.data, partial=True)
    if serializer.is_valid():
        contact = serializer.save()

       
        sent_ids = []

        for phone in phones_data:
            phone_id = phone.get("id")
            if phone_id:
                
                try:
                    phone_obj = QuickContactPhone.objects.get(pk=phone_id, contact=contact)
                    phone_serializer = QuickContactPhoneSerializer(phone_obj, data=phone, partial=True)
                    if phone_serializer.is_valid():
                        phone_serializer.save()
                        sent_ids.append(phone_obj.id)
                except QuickContactPhone.DoesNotExist:
                    continue
            else:
                
                phone_serializer = QuickContactPhoneSerializer(data=phone)
                if phone_serializer.is_valid():
                    new_phone = phone_serializer.save(contact=contact)
                    sent_ids.append(new_phone.id)

       
        QuickContactPhone.objects.filter(contact=contact).exclude(id__in=sent_ids).delete()

       
        return Response(QuickContactSerializer(contact).data)

    return Response(serializer.errors, status=400)




#Quick Contact Phone CRUD
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_quick_contact_phone(request, pk):
    if not admin_only(request.user):
        return Response({"detail": "Forbidden"}, status=403)
    try:
        contact = QuickContact.objects.get(pk=pk)
    except QuickContact.DoesNotExist:
        return Response({"error": "QuickContact not found"}, status=404)

    serializer = QuickContactPhoneSerializer(data=request.data)
    if serializer.is_valid():
        phone = serializer.save(contact=contact)
        return Response(QuickContactPhoneSerializer(phone).data, status=201)
    return Response(serializer.errors, status=400)

@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_quick_contact_phone(request, phone_id):
    if not admin_only(request.user):
        return Response({"detail": "Forbidden"}, status=403)
    try:
        phone = QuickContactPhone.objects.get(pk=phone_id)
    except QuickContactPhone.DoesNotExist:
        return Response({"error": "Phone not found"}, status=404)

    serializer = QuickContactPhoneSerializer(phone, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=400)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_quick_contact_phone(request, phone_id):
    if not admin_only(request.user):
        return Response({"detail": "Forbidden"}, status=403)
    try:
        phone = QuickContactPhone.objects.get(pk=phone_id)
    except QuickContactPhone.DoesNotExist:
        return Response({"error": "Phone not found"}, status=404)
    phone.delete()
    return Response(status=204)
