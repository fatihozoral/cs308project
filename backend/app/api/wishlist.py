from fastapi import APIRouter, Header, HTTPException, Depends
from app.core.config import supabase

router = APIRouter()

async def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Geçersiz format")
    token = authorization.replace("Bearer ", "")
    response = supabase.auth.get_user(token)
    if not response.user:
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
    return response.user

@router.get("/wishlist")
async def get_wishlist(user=Depends(get_current_user)):
    res = supabase.table("wishlist").select("*").eq("user_id", str(user.id)).execute()
    return res.data or []

@router.post("/wishlist/{event_id}")
async def add_to_wishlist(event_id: int, user=Depends(get_current_user)):
    existing = supabase.table("wishlist").select("id").eq("user_id", str(user.id)).eq("event_id", event_id).execute()
    if existing.data:
        return existing.data[0]
    res = supabase.table("wishlist").insert({"user_id": str(user.id), "event_id": event_id}).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="İstek listesine eklenemedi")
    return res.data[0]

@router.delete("/wishlist/{event_id}")
async def remove_from_wishlist(event_id: int, user=Depends(get_current_user)):
    supabase.table("wishlist").delete().eq("user_id", str(user.id)).eq("event_id", event_id).execute()
    return {"success": True}
