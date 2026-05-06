from fastapi import APIRouter, Header, HTTPException, Depends
from app.core.config import supabase
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()

async def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Geçersiz format")
    token = authorization.replace("Bearer ", "")
    response = supabase.auth.get_user(token)
    if not response.user:
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
    return response.user

class CreateComment(BaseModel):
    event_id: int
    content: str
    rating: int = Field(..., ge=1, le=5)

class UpdateComment(BaseModel):
    status: str

@router.get("/comments/pending")
async def get_pending_comments(user=Depends(get_current_user)):
    role = user.user_metadata.get("role", "customer")
    if role != "product_manager":
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    res = supabase.table("comments").select("*").eq("status", "pending").order("created_at", desc=True).execute()
    return res.data or []

@router.get("/comments/event/{event_id}")
async def get_event_comments(event_id: int, user=Depends(get_current_user)):
    res = supabase.table("comments").select("*").eq("event_id", event_id).eq("status", "approved").order("created_at", desc=True).execute()
    return res.data or []

@router.post("/comments")
async def create_comment(comment: CreateComment, user=Depends(get_current_user)):
    data = {
        "event_id": comment.event_id,
        "user_id": user.id,
        "user_name": user.user_metadata.get("name", ""),
        "content": comment.content,
        "rating": comment.rating,
        "status": "pending"
    }
    res = supabase.table("comments").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Yorum eklenemedi")
    return res.data[0]

@router.patch("/comments/{comment_id}")
async def update_comment_status(comment_id: int, body: UpdateComment, user=Depends(get_current_user)):
    role = user.user_metadata.get("role", "customer")
    if role != "product_manager":
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    if body.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Geçersiz durum")
    
    res = supabase.table("comments").update({"status": body.status}).eq("id", comment_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Yorum bulunamadı")
    return res.data[0]
