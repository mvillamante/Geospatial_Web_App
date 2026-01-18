# api/supabase_storage.py
import os
import uuid
from django.conf import settings
from supabase import create_client, Client

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def upload_private_photo(file_obj) -> str:
    """
    Upload to private bucket.
    Returns storage path to save in DB.
    """
    ext = os.path.splitext(file_obj.name)[1].lower() or ".jpg"
    path = f"incidents/{uuid.uuid4()}{ext}"

    supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).upload(
        path,
        file_obj.read(),
        {"content-type": file_obj.content_type or "image/jpeg"},
    )
    return path

def create_signed_url(path: str, expires_in_seconds: int = 3600) -> str:
    res = supabase.storage.from_(settings.SUPABASE_STORAGE_BUCKET).create_signed_url(
        path,
        expires_in_seconds,
    )
    signed = res.get("signedURL") or res.get("signedUrl") or res.get("signed_url")
    if not signed:
        raise RuntimeError("Failed to create signed URL")
    return signed
