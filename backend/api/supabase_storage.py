# api/supabase_storage.py
import os
import uuid
from django.conf import settings
from supabase import create_client, Client

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def upload_private_photo(file_obj, bucket: str) -> str:
    """
    Upload to private bucket.
    Returns storage path to save in DB.
    """
    ext = os.path.splitext(file_obj.name)[1].lower() or ".jpg"
    path = f"{uuid.uuid4()}{ext}"

    supabase.storage.from_(bucket).upload(
        path,
        file_obj.read(),
        {"content-type": file_obj.content_type or "application/octet-stream"},
    )

    return path

def create_signed_url(path: str, bucket: str, expires_in_seconds: int = 3600) -> str:
    res = supabase.storage.from_(bucket).create_signed_url(
        path,
        expires_in_seconds,
    )
    signed = res.get("signedURL") or res.get("signedUrl") or res.get("signed_url")
    if not signed:
        raise RuntimeError("Failed to create signed URL")
    return signed

def upload_cms_photo(file, bucket="cms-photos"):
    ext = file.name.split(".")[-1]
    path = f"cms-guides/{uuid.uuid4()}.{ext}"

    supabase.storage.from_(bucket).upload(
        path,
        file.read(),
        {"content-type": file.content_type}
    )

    public_url = supabase.storage.from_(bucket).get_public_url(path)
    return public_url, file.content_type

def delete_cms_photo(file_url: str, bucket="cms-photos"):
    """
    Deletes a file from Supabase storage given its public URL
    """
    try:
        path = file_url.split(f"/{bucket}/")[1]
        supabase.storage.from_(bucket).remove([path])
    except IndexError:
        print(f"Failed to extract path from URL: {file_url}")

def upload_reply_photo(file, report_id: str) -> str:
    ext = os.path.splitext(file.name)[1].lower() or ".jpg"
    path = f"replies/{report_id}{ext}"

    storage = supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET)

    try:
        storage.remove([path])
    except Exception:
        pass

    storage.upload(
        path,
        file.read(),
        {"content-type": file.content_type or "image/jpeg"},
    )

    return path

