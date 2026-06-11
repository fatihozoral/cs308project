from fastapi import APIRouter, Header, HTTPException, Depends
from app.core.config import supabase

router = APIRouter()

async def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Geçersiz format")
    token = authorization.replace("Bearer ", "")
    try:
        response = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş oturum")
    if not response.user:
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
    return response.user

@router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    res = supabase.table("notifications").select("*").eq("user_id", str(user.id)).order("created_at", desc=True).execute()
    return res.data or []

@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
    res = supabase.table("notifications").update({"is_read": True}).eq("id", notification_id).eq("user_id", str(user.id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    return res.data[0]

@router.patch("/notifications/read-all")
async def mark_all_notifications_read(user=Depends(get_current_user)):
    res = supabase.table("notifications").update({"is_read": True}).eq("user_id", str(user.id)).execute()
    return {"success": True}

@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, user=Depends(get_current_user)):
    res = supabase.table("notifications").delete().eq("id", notification_id).eq("user_id", str(user.id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    return {"success": True}

@router.delete("/notifications/delete-all")
async def delete_all_notifications(user=Depends(get_current_user)):
    res = supabase.table("notifications").delete().eq("user_id", str(user.id)).execute()
    return {"success": True}

