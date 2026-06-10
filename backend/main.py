import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, events, orders, comments, wishlist, admin, notifications, categories

app = FastAPI(
    title="CS308 Ticketing Platform - FastAPI Backend",
    version="1.0.0",
    description="Online Ticketing Platform Backend migrated to FastAPI + Supabase"
)

# CORS configuration for bridging React Frontend.
# Sadece bilinen frontend origin'lerine izin ver (güvenlik - Madde 16).
# Farklı bir origin için .env'de CORS_ORIGINS="https://a.com,https://b.com" tanımlanabilir.
_cors_env = os.getenv("CORS_ORIGINS")
allowed_origins = (
    [o.strip() for o in _cors_env.split(",") if o.strip()]
    if _cors_env else [
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
    ]
)
# Auth Bearer token (header) ile çalışıyoruz, cookie kullanmıyoruz → credentials kapalı.
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect modular routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(events.router, prefix="/api", tags=["Events"])
app.include_router(orders.router, prefix="/api", tags=["Orders"])
app.include_router(comments.router, prefix="/api", tags=["Comments"])
app.include_router(wishlist.router, prefix="/api", tags=["Wishlist"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(notifications.router, prefix="/api", tags=["Notifications"])
app.include_router(categories.router, prefix="/api", tags=["Categories"])

@app.get("/")
def read_root():
    return {"status": "success", "message": "FastAPI with Supabase Backend is running!"}
