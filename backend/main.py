from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, events, orders, comments, wishlist, admin, notifications

app = FastAPI(
    title="CS308 Ticketing Platform - FastAPI Backend",
    version="1.0.0",
    description="Online Ticketing Platform Backend migrated to FastAPI + Supabase"
)

# CORS configuration for bridging React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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

@app.get("/")
def read_root():
    return {"status": "success", "message": "FastAPI with Supabase Backend is running!"}
