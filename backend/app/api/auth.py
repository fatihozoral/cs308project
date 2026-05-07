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
                    "role": "customer"
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
                "role": response.user.user_metadata.get("role", "customer")
            }
        }
    except Exception as e:
        message = str(e) or "Geçersiz e-posta veya şifre."
        raise HTTPException(status_code=401, detail=f"Login failed: {message}")
