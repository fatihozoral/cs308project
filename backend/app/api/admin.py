from fastapi import APIRouter, Header, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
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


async def require_manager(user=Depends(get_current_user)):
    role = user.user_metadata.get("role", "customer")
    if role not in ("product_manager", "sales_manager"):
        raise HTTPException(status_code=403, detail="Yönetici yetkisi gerekiyor")
    return user


@router.get("/events")
async def get_admin_events(user=Depends(require_product_manager)):
    res = supabase.table("events").select("*").order("id").execute()
    return res.data or []


@router.post("/events")
async def create_admin_event(event: EventCreate, user=Depends(require_product_manager)):
    payload = event.model_dump(mode="json", exclude_none=True)
    for field in ["model", "serial_number", "warranty_status", "distributor_info", "description", "featured_names", "place_id"]:
        if payload.get(field) == "":
            payload[field] = None
            
    if payload.get("remaining_capacity") is None and payload.get("total_capacity") is not None:
        payload["remaining_capacity"] = payload["total_capacity"]
    res = supabase.table("events").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Etkinlik eklenemedi")
    return res.data[0]


@router.patch("/events/{event_id}")
async def update_admin_event(event_id: int, body: dict, user=Depends(require_manager)):
    allowed_fields = {
        "name", "description", "featured_names", "category", "emoji", "image_url", "price",
        "total_capacity", "remaining_capacity", "venue", "city", "event_date",
        "event_time", "place_id", "ticket_categories", "is_active",
        "model", "serial_number", "warranty_status", "distributor_info", "discount_rate", "cost"
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


class DiscountPayload(BaseModel):
    discount_rate: int


class PricePayload(BaseModel):
    price: float


async def require_sales_manager(user=Depends(get_current_user)):
    role = user.user_metadata.get("role", "customer")
    if role != "sales_manager":
        raise HTTPException(status_code=403, detail="Sales manager yetkisi gerekiyor")
    return user


@router.patch("/events/{event_id}/price")
async def update_event_price(event_id: int, payload: PricePayload, user=Depends(require_sales_manager)):
    if payload.price < 0:
        raise HTTPException(status_code=400, detail="Fiyat negatif olamaz")
    res = supabase.table("events").update({"price": payload.price}).eq("id", event_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    return res.data[0]


@router.patch("/events/{event_id}/discount")
async def update_event_discount(event_id: int, payload: DiscountPayload, user=Depends(require_sales_manager)):
    if payload.discount_rate < 0 or payload.discount_rate > 90:
        raise HTTPException(status_code=400, detail="İndirim oranı %0 ile %90 arasında olmalıdır")

    event_res = supabase.table("events").select("name, price").eq("id", event_id).execute()
    if not event_res.data:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    event_data = event_res.data[0]
    event_name = event_data["name"]
    original_price = float(event_data["price"])

    res = supabase.table("events").update({"discount_rate": payload.discount_rate}).eq("id", event_id).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="İndirim oranı güncellenemedi")

    if payload.discount_rate > 0:
        discounted_price = round(original_price * (1 - payload.discount_rate / 100.0), 2)
        wishlist_res = supabase.table("wishlist").select("user_id").eq("event_id", event_id).execute()
        if wishlist_res.data:
            notifications = []
            for item in wishlist_res.data:
                notifications.append({
                    "user_id": item["user_id"],
                    "title": "İstek Listenizde İndirim Fırsatı! 🏷️",
                    "message": f"İstek listenizdeki '{event_name}' ürününde %{payload.discount_rate} indirim başladı! Yeni fiyat: ₺{discounted_price}!"
                })
            if notifications:
                try:
                    supabase.table("notifications").insert(notifications).execute()
                except Exception as exc:
                    print(f"Failed to insert discount notifications: {exc}")

    return res.data[0]

