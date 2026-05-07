from fastapi import APIRouter, Header, HTTPException, Depends
from typing import Optional
from app.core.config import supabase
from app.schemas.event import EventCreate

router = APIRouter()


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Giriş yapmanız gerekiyor")
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


async def require_product_manager(user=Depends(get_current_user)):
    role = user.user_metadata.get("role", "customer")
    if role != "product_manager":
        raise HTTPException(status_code=403, detail="Product manager yetkisi gerekiyor")
    return user


@router.get("/events")
async def get_admin_events(user=Depends(require_product_manager)):
    res = supabase.table("events").select("*").order("id").execute()
    return res.data or []


@router.post("/events")
async def create_admin_event(event: EventCreate, user=Depends(require_product_manager)):
    payload = event.model_dump(mode="json", exclude_none=True)
    if payload.get("remaining_capacity") is None and payload.get("total_capacity") is not None:
        payload["remaining_capacity"] = payload["total_capacity"]
    res = supabase.table("events").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Etkinlik eklenemedi")
    return res.data[0]


@router.patch("/events/{event_id}")
async def update_admin_event(event_id: int, body: dict, user=Depends(require_product_manager)):
    allowed_fields = {
        "name", "description", "featured_names", "category", "emoji", "price",
        "total_capacity", "remaining_capacity", "venue", "city", "event_date",
        "event_time", "place_id", "ticket_categories", "is_active"
    }
    payload = {key: value for key, value in body.items() if key in allowed_fields}
    if not payload:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok")

    res = supabase.table("events").update(payload).eq("id", event_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    return res.data[0]


@router.delete("/events/{event_id}")
async def delete_admin_event(event_id: int, user=Depends(require_product_manager)):
    res = supabase.table("events").update({"is_active": False}).eq("id", event_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    return {"success": True}
