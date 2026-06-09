from fastapi import APIRouter, Header, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
from app.core.config import supabase

router = APIRouter()

DEFAULT_CATEGORIES = ["Konser", "Spor", "Tiyatro", "Festival"]


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
    token = authorization.replace("Bearer ", "")
    try:
        response = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş oturum")
    if not response.user:
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
    return response.user


async def require_product_manager(user=Depends(get_current_user)):
    if user.user_metadata.get("role") != "product_manager":
        raise HTTPException(status_code=403, detail="Product manager yetkisi gerekiyor")
    return user


class CategoryPayload(BaseModel):
    name: str


def _fallback_categories():
    """categories tablosu yoksa mevcut etkinliklerden türet."""
    try:
        res = supabase.table("events").select("category").execute()
        names = sorted({r["category"] for r in (res.data or []) if r.get("category")})
        return names or DEFAULT_CATEGORIES
    except Exception:
        return list(DEFAULT_CATEGORIES)


@router.get("/categories")
async def list_categories():
    try:
        res = supabase.table("categories").select("name").order("name").execute()
        if res.data is not None and len(res.data) > 0:
            return [c["name"] for c in res.data]
    except Exception:
        pass
    return _fallback_categories()


@router.post("/admin/categories")
async def create_category(payload: CategoryPayload, user=Depends(require_product_manager)):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Kategori adı boş olamaz")
    try:
        existing = supabase.table("categories").select("id").eq("name", name).execute()
        if existing.data:
            raise HTTPException(status_code=409, detail="Bu kategori zaten mevcut")
        res = supabase.table("categories").insert({"name": name}).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Kategori eklenemedi")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"'categories' tablosu bulunamadı veya yazılamadı. Migration çalıştırıldı mı? ({e})"
        )


@router.delete("/admin/categories/{name}")
async def delete_category(name: str, user=Depends(require_product_manager)):
    name = name.strip()
    try:
        in_use = supabase.table("events").select("id").eq("category", name).eq("is_active", True).limit(1).execute()
        if in_use.data:
            raise HTTPException(
                status_code=400,
                detail="Bu kategoriyi kullanan aktif etkinlikler var. Önce o etkinlikleri silin veya başka kategoriye taşıyın."
            )
        supabase.table("categories").delete().eq("name", name).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
