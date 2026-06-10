import os
from fastapi import APIRouter, Header, HTTPException, Depends
from typing import Optional, List
from app.core.config import supabase
from app.schemas.event import EventResponse

router = APIRouter()

async def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Geçersiz format")
    token = authorization.replace("Bearer ", "")
    response = supabase.auth.get_user(token)
    if not response.user:
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
    return response.user

@router.get("/events")
async def get_events(search: Optional[str] = None, category: Optional[str] = None):
    query = supabase.table("events").select("*").eq("is_active", True)
    
    # We fetch all events and filter in memory to handle search better, 
    # or handle category in query if provided.
    if category and category != 'Tümü':
        query = query.eq("category", category)
        
    response = query.execute()
    data = response.data
    
    # map to frontend format
    result = []
    
    # Turkish month names translation
    months = {
        1: "Oca", 2: "Şub", 3: "Mar", 4: "Nis",
        5: "May", 6: "Haz", 7: "Tem", 8: "Ağu",
        9: "Eyl", 10: "Eki", 11: "Kas", 12: "Ara"
    }
    
    for row in data:
        if search:
            s_lower = search.lower()
            searchable = " ".join([
                str(row.get("name") or ""),
                str(row.get("city") or ""),
                str(row.get("venue") or ""),
                str(row.get("description") or ""),
                str(row.get("featured_names") or ""),
                str(row.get("category") or "")
            ]).lower()
            if s_lower not in searchable:
                continue
                
        # Format date from YYYY-MM-DD to "DD Ayy YYYY"
        date_str = row['event_date']
        try:
            year, month, day = date_str.split("-")
            formatted_date = f"{int(day)} {months[int(month)]} {year}"
        except Exception:
            formatted_date = date_str
            
        orig_price = float(row.get("price") or 0.0)
        discount_rate = int(row.get("discount_rate") or 0)
        active_price = orig_price
        if discount_rate > 0:
            active_price = round(orig_price * (1 - discount_rate / 100.0), 2)

        result.append({
            "id": row["id"],
            "name": row["name"],
            "category": row["category"],
            "date": formatted_date,
            "time": row["event_time"],
            "venue": row["venue"],
            "city": row["city"],
            "price": active_price,
            "original_price": orig_price,
            "discount_rate": discount_rate,
            "emoji": row["emoji"],
            "image_url": row.get("image_url"),
            "description": row.get("description", ""),
            "featured_names": row.get("featured_names", ""),
            "place_id": row.get("place_id"),
            "total_capacity": row.get("total_capacity"),
            "remaining_capacity": row.get("remaining_capacity"),
            "ticket_categories": row.get("ticket_categories"),
            "model": row.get("model"),
            "serial_number": row.get("serial_number"),
            "warranty_status": row.get("warranty_status"),
            "distributor_info": row.get("distributor_info"),
            "cost": row.get("cost")
        })

    return result

@router.get("/events/{event_id}")
async def get_event(event_id: int):
    response = supabase.table("events").select("*").eq("id", event_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Etkinlik bulunamadı")
    
    row = response.data
    months = {
        1: "Oca", 2: "Şub", 3: "Mar", 4: "Nis",
        5: "May", 6: "Haz", 7: "Tem", 8: "Ağu",
        9: "Eyl", 10: "Eki", 11: "Kas", 12: "Ara"
    }
    date_str = row['event_date']
    try:
        year, month, day = date_str.split("-")
        formatted_date = f"{int(day)} {months[int(month)]} {year}"
    except Exception:
        formatted_date = date_str
        
    orig_price = float(row.get("price") or 0.0)
    discount_rate = int(row.get("discount_rate") or 0)
    active_price = orig_price
    if discount_rate > 0:
        active_price = round(orig_price * (1 - discount_rate / 100.0), 2)

    return {
        "id": row["id"],
        "name": row["name"],
        "category": row["category"],
        "date": formatted_date,
        "time": row["event_time"],
        "venue": row["venue"],
        "city": row["city"],
        "price": active_price,
        "original_price": orig_price,
        "discount_rate": discount_rate,
        "emoji": row["emoji"],
        "image_url": row.get("image_url"),
        "place_id": row.get("place_id"),
        "description": row.get("description", ""),
        "total_capacity": row.get("total_capacity"),
        "remaining_capacity": row.get("remaining_capacity"),
        "ticket_categories": row.get("ticket_categories"),
        "model": row.get("model"),
        "serial_number": row.get("serial_number"),
        "warranty_status": row.get("warranty_status"),
        "distributor_info": row.get("distributor_info"),
        "cost": row.get("cost")
    }
