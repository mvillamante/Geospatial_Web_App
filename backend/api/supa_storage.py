# api/supa_storage.py
import os
import uuid
from django.conf import settings
from supabase import create_client, Client

supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

def upload_private_photo(file_obj, bucket: str) -> str:
    ext = os.path.splitext(file_obj.name)[1].lower() or ".jpg"
    path = f"{uuid.uuid4()}{ext}"

    file_bytes = file_obj.read()

    supabase.storage.from_(bucket).upload(
        path,
        file_bytes,
        {"content-type": file_obj.content_type or "application/octet-stream"}
    )

    return path

def delete_private_photo(path: str, bucket: str) -> bool:
    """
    Delete a file from Supabase Storage.
    Returns True if deleted, False otherwise.
    """
    if not path:
        return False
    try:
        res = supabase.storage.from_(bucket).remove([path])
        if res.get("error"):
            print("Supabase delete error:", res["error"])
            return False
        return True
    except Exception as e:
        print("Exception deleting from Supabase:", e)
        return False
        
def create_signed_url(path: str, bucket: str, expires_in_seconds: int = 3600) -> str:
    if not path:
        return None

    try:
        res = supabase.storage.from_(bucket).create_signed_url(
            path,
            expires_in_seconds,
        )

        signed = res.get("signedURL") or res.get("signedUrl") or res.get("signed_url")

        if not signed:
            return None

        return signed

    except Exception as e:
        print("Signed URL error:", e)
        return None

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

