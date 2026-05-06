from fastapi import APIRouter, Header, HTTPException, Depends
from typing import List
from app.core.config import supabase
from app.schemas.order import CreateOrder
from datetime import datetime
from pydantic import BaseModel

class UpdateOrderStatus(BaseModel):
    status: str

router = APIRouter()

async def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Geçersiz format")
    token = authorization.replace("Bearer ", "")
    response = supabase.auth.get_user(token)
    if not response.user:
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
    return response.user

@router.post("/orders")
async def create_order(order: CreateOrder, user=Depends(get_current_user)):
    user_id = user.id
    
    # Create order first
    order_data = {
        "user_id": user_id,
        "total": order.total,
        "status": "Tamamlandı"
    }
    
    order_res = supabase.table("orders").insert(order_data).execute()
    if not order_res.data:
        raise HTTPException(status_code=500, detail="Sipariş oluşturulamadı")
        
    created_order = order_res.data[0]
    order_id = created_order["id"]
    
    # Create order items
    items_data = []
    for item in order.items:
        # Update event capacities
        event_res = supabase.table("events").select("remaining_capacity, ticket_categories").eq("id", item.event_id).execute()
        if event_res.data:
            event_data = event_res.data[0]
            remaining = event_data.get("remaining_capacity")
            if remaining is not None and remaining < item.quantity:
                raise HTTPException(status_code=400, detail="Yeterli stok yok")
            update_payload = {}
            if remaining is not None:
                new_rem = max(0, remaining - item.quantity)
                update_payload["remaining_capacity"] = new_rem
                
            categories = event_data.get("ticket_categories")
            item_category = getattr(item, "category", None)
            if categories and item_category:
                for cat in categories:
                    if cat.get("name") == item_category:
                        cat["remaining"] = max(0, cat.get("remaining", 0) - item.quantity)
                        break
                update_payload["ticket_categories"] = categories
                
            if update_payload:
                supabase.table("events").update(update_payload).eq("id", item.event_id).execute()

        items_data.append({
            "order_id": order_id,
            "event_id": item.event_id,
            "event_name": item.event_name,
            "event_date": item.event_date,
            "venue": item.venue,
            "quantity": item.quantity,
            "price": item.price,
            "category": item_category
        })
        
    if items_data:
        supabase.table("order_items").insert(items_data).execute()

    # Create one ticket per quantity per item
    tickets_data = []
    for item in order.items:
        for _ in range(item.quantity):
            tickets_data.append({
                "order_id": order_id,
                "event_id": item.event_id,
            })

    tickets_res = supabase.table("tickets").insert(tickets_data).execute()
    tokens = [t["token"] for t in (tickets_res.data or [])]

    # Format created order response
    created_at = created_order["created_at"]
    # Parse timestamptz to simple date format DD.MM.YYYY
    try:
        dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        date_str = dt.strftime("%d.%m.%Y")
    except Exception:
        date_str = created_at
        
    return {
        "id": f"TH-1712100000{order_id}",
        "status": created_order["status"],
        "total": created_order["total"],
        "date": date_str,
        "tokens": tokens
    }

@router.get("/orders")
async def get_orders(user=Depends(get_current_user)):
    user_id = user.id
    
    # Fetch orders
    orders_res = supabase.table("orders").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    orders_data = orders_res.data
    
    if not orders_data:
        return []
        
    order_ids = [o["id"] for o in orders_data]
    
    # Fetch all items for these orders
    items_res = supabase.table("order_items").select("*").in_("order_id", order_ids).execute()
    items_data = items_res.data
    
    # Group items by order
    items_by_order = {}
    for item in items_data:
        oid = item["order_id"]
        if oid not in items_by_order:
            items_by_order[oid] = []
        items_by_order[oid].append({
            "id": item["id"],
            "event_id": item["event_id"],
            "name": item["event_name"],
            "date": item["event_date"],
            "venue": item["venue"],
            "quantity": item["quantity"],
            "price": item["price"]
        })
        
    result = []
    for o in orders_data:
        # Format date
        created_at = o["created_at"]
        try:
            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            date_str = dt.strftime("%d.%m.%Y")
        except Exception:
            date_str = created_at
            
        result.append({
            "id": f"TH-171210{o['id']:04d}",
            "raw_id": o["id"],
            "date": date_str,
            "total": o["total"],
            "status": o["status"],
            "items": items_by_order.get(o["id"], [])
        })

    return result

@router.patch("/orders/{order_id}/cancel")
async def cancel_order(order_id: int, user=Depends(get_current_user)):
    user_id = user.id
    res = supabase.table("orders").select("*").eq("id", order_id).eq("user_id", user_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    if res.data["status"] == "İptal Edildi":
        raise HTTPException(status_code=400, detail="Sipariş zaten iptal edilmiş")
    supabase.table("orders").update({"status": "İptal Edildi"}).eq("id", order_id).execute()
    return {"success": True}

@router.get("/orders/all")
async def get_all_orders(user=Depends(get_current_user)):
    role = user.user_metadata.get("role", "customer")
    if role != "sales_manager":
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    orders_res = supabase.table("orders").select("*").order("created_at", desc=True).execute()
    orders_data = orders_res.data
    
    if not orders_data:
        return []
    
    order_ids = [o["id"] for o in orders_data]
    
    items_res = supabase.table("order_items").select("*").in_("order_id", order_ids).execute()
    items_data = items_res.data
    
    items_by_order = {}
    for item in items_data:
        oid = item["order_id"]
        if oid not in items_by_order:
            items_by_order[oid] = []
        items_by_order[oid].append({
            "id": item["id"],
            "event_id": item["event_id"],
            "name": item["event_name"],
            "date": item["event_date"],
            "venue": item["venue"],
            "quantity": item["quantity"],
            "price": item["price"]
        })
    
    result = []
    for o in orders_data:
        created_at = o["created_at"]
        try:
            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            date_str = dt.strftime("%d.%m.%Y")
        except Exception:
            date_str = created_at
        
        result.append({
            "id": f"TH-171210{o['id']:04d}",
            "date": date_str,
            "total": o["total"],
            "status": o["status"],
            "user_id": o["user_id"],
            "items": items_by_order.get(o["id"], [])
        })

    return result


VALID_STATUSES = {"processing", "in-transit", "delivered"}

@router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: int, body: UpdateOrderStatus, user=Depends(get_current_user)):
    role = user.user_metadata.get("role", "customer")
    if role != "product_manager":
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Geçersiz durum değeri")
    res = supabase.table("orders").select("*").eq("id", order_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    update_res = supabase.table("orders").update({"status": body.status}).eq("id", order_id).execute()
    if not update_res.data:
        raise HTTPException(status_code=500, detail="Durum güncellenemedi")
    return {"id": order_id, "status": update_res.data[0]["status"]}


@router.get("/tickets/{token}/verify")
async def verify_ticket(token: str, user=Depends(get_current_user)):
    res = supabase.table("tickets").select("*, events(name, event_date, venue)").eq("token", token).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Bilet bulunamadı")
    t = res.data
    return {
        "valid": True,
        "is_used": t["is_used"],
        "used_at": t["used_at"],
        "event": t["events"]["name"] if t.get("events") else None,
    }


@router.post("/tickets/{token}/redeem")
async def redeem_ticket(token: str, user=Depends(get_current_user)):
    res = supabase.table("tickets").select("*").eq("token", token).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Bilet bulunamadı")
    if res.data["is_used"]:
        raise HTTPException(status_code=409, detail="Bu bilet zaten kullanılmış")
    from datetime import datetime, timezone
    supabase.table("tickets").update({
        "is_used": True,
        "used_at": datetime.now(timezone.utc).isoformat()
    }).eq("token", token).execute()
    return {"success": True}

@router.patch("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, user=Depends(get_current_user)):
    user_id = user.id
    try:
        real_id_str = order_id.replace("TH-171210", "")
        real_id = int(real_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Geçersiz sipariş ID formatı")
        
    res = supabase.table("orders").select("*").eq("id", real_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı veya yetkisizsiniz")
        
    order = res.data[0]
    if order["status"] not in ["Tamamlandı", "processing"]:
        raise HTTPException(status_code=400, detail="Bu sipariş iptal edilemez")
        
    # Update status
    update_res = supabase.table("orders").update({"status": "cancelled"}).eq("id", real_id).execute()
    if not update_res.data:
        raise HTTPException(status_code=500, detail="Sipariş iptal edilirken bir hata oluştu")
        
    return {"message": "Sipariş başarıyla iptal edildi"}