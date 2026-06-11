from fastapi import APIRouter
from app.schemas.user import UserRegister, UserLogin
from app.core.config import supabase
from fastapi import HTTPException, status

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user: UserRegister):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase connection not initialized. Please verify .env")

    try:
        # Supabase API for Registration
        response = supabase.auth.sign_up({
            "email": str(user.email),
            "password": user.password,
            "options": {
                "data": {
                    "name": user.name,
                    "tax_id": user.tax_id,
                    "home_address": user.home_address,
                    "role": "customer"
                }
            }
        })
        
        # NOTE: Ideally in Supabase, you create a Trigger on 'auth.users' to automatically copy 
        # these custom data into your 'public.users' table whenever a new user signs up.
        
        if response.user:
            return {
                "message": "Kayıt başarılı.",
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "name": user.name,
                    "role": "customer",
                    "tax_id": user.tax_id,
                    "home_address": user.home_address
                }
            }
        else:
            raise HTTPException(status_code=400, detail="Supabase registration failed without details.")
            
    except Exception as e:
        # e.g., email already exists
        raise HTTPException(status_code=409, detail=f"Registration error: {str(e)}")

@router.post("/login")
def login_user(user: UserLogin):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase connection not initialized.")
        
    try:
        response = supabase.auth.sign_in_with_password({
            "email": str(user.email),
            "password": user.password
        })
        
        # Access token acts as the JWT from before
        return {
            "token": response.session.access_token,
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "name": response.user.user_metadata.get("name", ""),
                "role": response.user.user_metadata.get("role", "customer"),
                "tax_id": response.user.user_metadata.get("tax_id", ""),
                "home_address": response.user.user_metadata.get("home_address", "")
            }
        }
    except Exception as e:
        message = str(e) or "Geçersiz e-posta veya şifre."
        raise HTTPException(status_code=401, detail=f"Login failed: {message}")

from app.schemas.user import UserUpdate
from app.core.config import SUPABASE_URL, SUPABASE_KEY
from fastapi import Header
from supabase import create_client

@router.put("/update")
def update_user_profile(user_update: UserUpdate, authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Geçersiz yetkilendirme formatı.")
    token = authorization.replace("Bearer ", "")
    
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase bağlantısı başlatılamadı.")

    try:
        # Create user-scoped client
        user_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        user_client.auth.set_session(access_token=token, refresh_token="")
        
        # Build update body
        update_attrs = {}
        if user_update.email:
            update_attrs["email"] = str(user_update.email)
        if user_update.password:
            update_attrs["password"] = user_update.password
            
        metadata = {}
        if user_update.name is not None:
            metadata["name"] = user_update.name
        if user_update.home_address is not None:
            metadata["home_address"] = user_update.home_address
            
        if metadata:
            update_attrs["data"] = metadata
            
        if not update_attrs:
            raise HTTPException(status_code=400, detail="Güncellenecek bilgi gönderilmedi.")
            
        response = user_client.auth.update_user(update_attrs)
        
        if not response.user:
            raise HTTPException(status_code=400, detail="Profil güncellenemedi.")
            
        return {
            "message": "Profil başarıyla güncellendi.",
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "name": response.user.user_metadata.get("name", ""),
                "role": response.user.user_metadata.get("role", "customer"),
                "tax_id": response.user.user_metadata.get("tax_id", ""),
                "home_address": response.user.user_metadata.get("home_address", "")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Profil güncelleme hatası: {str(e)}")

