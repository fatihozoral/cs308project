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
            if s_lower not in row['name'].lower() and s_lower not in row['city'].lower():
                continue
                
        # Format date from YYYY-MM-DD to "DD Ayy YYYY"
        date_str = row['event_date']
        try:
            year, month, day = date_str.split("-")
            formatted_date = f"{int(day)} {months[int(month)]} {year}"
        except Exception:
            formatted_date = date_str
            
        result.append({
            "id": row["id"],
            "name": row["name"],
            "category": row["category"],
            "date": formatted_date,
            "time": row["event_time"],
            "venue": row["venue"],
            "city": row["city"],
            "price": row["price"],
            "emoji": row["emoji"],
            "place_id": row.get("place_id"),
            "total_capacity": row.get("total_capacity"),
            "remaining_capacity": row.get("remaining_capacity"),
            "ticket_categories": row.get("ticket_categories")
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
        
    return {
        "id": row["id"],
        "name": row["name"],
        "category": row["category"],
        "date": formatted_date,
        "time": row["event_time"],
        "venue": row["venue"],
        "city": row["city"],
        "price": row["price"],
        "emoji": row["emoji"],
        "place_id": row.get("place_id"),
        "description": row.get("description", ""),
        "total_capacity": row.get("total_capacity"),
        "remaining_capacity": row.get("remaining_capacity"),
        "ticket_categories": row.get("ticket_categories")
    }
