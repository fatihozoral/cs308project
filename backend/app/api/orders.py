from fastapi import APIRouter, Header, HTTPException, Depends
from typing import List
from app.core.config import supabase
from app.schemas.order import CreateOrder
from datetime import datetime

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
        items_data.append({
            "order_id": order_id,
            "event_id": item.event_id,
            "event_name": item.event_name,
            "event_date": item.event_date,
            "venue": item.venue,
            "quantity": item.quantity,
            "price": item.price
        })
        
    if items_data:
        supabase.table("order_items").insert(items_data).execute()
        
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
        "date": date_str
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
            "date": date_str,
            "total": o["total"],
            "status": o["status"],
            "items": items_by_order.get(o["id"], [])
        })
        
    return result
