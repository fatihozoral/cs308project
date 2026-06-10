import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("❌ ERROR: SUPABASE_URL and SUPABASE_KEY must be set in backend/.env")
    sys.exit(1)

supabase = create_client(url, key)

def check_tables():
    print("Checking database tables...")
    required_tables = ["events", "orders", "order_items", "tickets", "returns", "notifications"]
    missing = []
    for t in required_tables:
        try:
            supabase.table(t).select("*").limit(1).execute()
            print(f"✅ Table '{t}' exists.")
        except Exception:
            missing.append(t)
            print(f"❌ Table '{t}' DOES NOT exist.")
    
    if missing:
        print("\n⚠️ WARNING: The following tables are missing:")
        for m in missing:
            print(f"  - {m}")
        print("\nPlease run the SQL queries in SUPABASE_SETUP.md through your Supabase SQL Editor first!")
        return False
    return True

def create_or_login_customer():
    email = "customer@ticketing.com"
    password = "Customer1234!"
    name = "Ahmet Yilmaz"
    tax_id = "12345678901"
    home_address = "Kadikoy, Istanbul"
    
    print(f"\nSetting up customer account: {email}")
    try:
        # Try logging in first
        res = supabase.auth.sign_in_with_password({"email": email, "password": password})
        print(f"✅ Logged in successfully. User ID: {res.user.id}")
        return res.user.id
    except Exception:
        # Try signing up
        try:
            res = supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "name": name,
                        "tax_id": tax_id,
                        "home_address": home_address,
                        "role": "customer"
                    }
                }
            })
            if res.user:
                print(f"✅ Registered customer successfully. User ID: {res.user.id}")
                return res.user.id
        except Exception as signup_err:
            print(f"❌ Error setting up customer account: {signup_err}")
            sys.exit(1)

def seed_events():
    print("\nSeeding demo events (Products)...")
    
    # Check if events already exist and delete/disable them to prevent duplicates or clean them up
    existing = supabase.table("events").select("id, name").execute()
    existing_map = {e["name"]: e["id"] for e in (existing.data or [])}
    
    demo_events = [
        {
            "name": "Product A (Stoksuz)",
            "category": "Konser",
            "event_date": (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d"),
            "event_time": "20:00",
            "venue": "Zorlu PSM",
            "city": "Istanbul",
            "price": 120.00,
            "cost": 50.00,
            "emoji": "🎵",
            "total_capacity": 100,
            "remaining_capacity": 0,
            "is_active": True,
            "model": "PA-100",
            "serial_number": "SN-A111",
            "warranty_status": "Yok",
            "distributor_info": "TicketHub TR"
        },
        {
            "name": "Product B (Tek Stoklu)",
            "category": "Konser",
            "event_date": (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d"),
            "event_time": "21:00",
            "venue": "Volkswagen Arena",
            "city": "Istanbul",
            "price": 180.00,
            "cost": 80.00,
            "emoji": "🎹",
            "total_capacity": 100,
            "remaining_capacity": 1,
            "is_active": True,
            "model": "PB-200",
            "serial_number": "SN-B222",
            "warranty_status": "2 Yil",
            "distributor_info": "TicketHub TR"
        },
        {
            "name": "Product C (Cok Stoklu)",
            "category": "Spor",
            "event_date": (datetime.now() + timedelta(days=20)).strftime("%Y-%m-%d"),
            "event_time": "19:00",
            "venue": "Nef Stadyumu",
            "city": "Istanbul",
            "price": 250.00,
            "cost": 100.00,
            "emoji": "⚽",
            "total_capacity": 100,
            "remaining_capacity": 45,
            "is_active": True,
            "model": "PC-300",
            "serial_number": "SN-C333",
            "warranty_status": "Yok",
            "distributor_info": "Spor Biletleme A.S."
        },
        {
            "name": "Product E (Eski Alinan)",
            "category": "Tiyatro",
            "event_date": (datetime.now() - timedelta(days=40)).strftime("%Y-%m-%d"),
            "event_time": "20:30",
            "venue": "Kadıkoy Sahne",
            "city": "Istanbul",
            "price": 60.00,
            "cost": 25.00,
            "emoji": "🎭",
            "total_capacity": 50,
            "remaining_capacity": 0,
            "is_active": True,
            "model": "PE-500",
            "serial_number": "SN-E555",
            "warranty_status": "1 Yil",
            "distributor_info": "Kultur Sanat Ltd."
        },
        {
            "name": "Product F (Iade Edilebilir)",
            "category": "Festival",
            "event_date": (datetime.now() + timedelta(days=25)).strftime("%Y-%m-%d"),
            "event_time": "14:00",
            "venue": "Kilyos Beach",
            "city": "Istanbul",
            "price": 300.00,
            "cost": 150.00,
            "emoji": "⛺",
            "total_capacity": 500,
            "remaining_capacity": 150,
            "is_active": True,
            "model": "PF-600",
            "serial_number": "SN-F666",
            "warranty_status": "Yok",
            "distributor_info": "Festival Organizasyon"
        },
        {
            "name": "Product G (Hazirlanan)",
            "category": "Konser",
            "event_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "event_time": "20:00",
            "venue": "Kuruceşme Open Air",
            "city": "Istanbul",
            "price": 140.00,
            "cost": 60.00,
            "emoji": "🎸",
            "total_capacity": 150,
            "remaining_capacity": 120,
            "is_active": True,
            "model": "PG-700",
            "serial_number": "SN-G777",
            "warranty_status": "Yok",
            "distributor_info": "TicketHub TR"
        },
        {
            "name": "Product H (Yolda)",
            "category": "Spor",
            "event_date": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"),
            "event_time": "18:00",
            "venue": "Sinan Erdem Dome",
            "city": "Istanbul",
            "price": 90.00,
            "cost": 40.00,
            "emoji": "🏀",
            "total_capacity": 80,
            "remaining_capacity": 30,
            "is_active": True,
            "model": "PH-800",
            "serial_number": "SN-H888",
            "warranty_status": "Yok",
            "distributor_info": "Basketbol Fed."
        }
    ]
    
    event_ids = {}
    for ev in demo_events:
        name = ev["name"]
        if name in existing_map:
            # Update
            eid = existing_map[name]
            supabase.table("events").update(ev).eq("id", eid).execute()
            event_ids[name] = eid
            print(f"  - Updated: {name} (ID: {eid})")
        else:
            # Insert
            res = supabase.table("events").insert(ev).execute()
            if res.data:
                eid = res.data[0]["id"]
                event_ids[name] = eid
                print(f"  - Created: {name} (ID: {eid})")
    return event_ids

def seed_orders(user_id, event_ids):
    print("\nSeeding order history for customer...")
    
    # First, clean existing orders for this user to avoid duplication during multiple seeds
    existing_orders = supabase.table("orders").select("id").eq("user_id", str(user_id)).execute()
    if existing_orders.data:
        order_ids = [o["id"] for o in existing_orders.data]
        try:
            supabase.table("returns").delete().eq("user_id", str(user_id)).execute()
        except Exception as e:
            print(f"  - Warning: could not clean returns table: {e}")
        try:
            supabase.table("order_items").delete().in_("order_id", order_ids).execute()
        except Exception as e:
            print(f"  - Warning: could not clean order_items table: {e}")
        try:
            supabase.table("tickets").delete().in_("order_id", order_ids).execute()
        except Exception as e:
            print(f"  - Warning: could not clean tickets table: {e}")
        try:
            supabase.table("orders").delete().eq("user_id", str(user_id)).execute()
        except Exception as e:
            print(f"  - Warning: could not clean orders table: {e}")
        print("  - Cleared existing order history where possible.")
        
    customer_name = "Ahmet Yilmaz"
    customer_email = "customer@ticketing.com"
    customer_address = "Kadikoy, Istanbul"
    customer_tax_id = "12345678901"

    # 1. Product E (Delivered > 30 days ago)
    order_date_e = (datetime.now(timezone.utc) - timedelta(days=40)).isoformat()
    order_e = supabase.table("orders").insert({
        "user_id": str(user_id),
        "total": 60.00,
        "status": "delivered",
        "created_at": order_date_e,
        "user_name": customer_name,
        "user_email": customer_email,
        "home_address": customer_address,
        "tax_id": customer_tax_id,
        "invoice_number": "INV-000001",
        "invoice_email_sent": False
    }).execute()
    
    if order_e.data:
        oid = order_e.data[0]["id"]
        supabase.table("order_items").insert({
            "order_id": oid,
            "event_id": event_ids["Product E (Eski Alinan)"],
            "event_name": "Product E (Eski Alinan)",
            "event_date": (datetime.now() - timedelta(days=40)).strftime("%d.%m.%Y"),
            "venue": "Kadıkoy Sahne",
            "quantity": 1,
            "price": 60.00
        }).execute()
        supabase.table("tickets").insert({
            "order_id": oid,
            "event_id": event_ids["Product E (Eski Alinan)"],
            "token": str(uuid.uuid4()),
            "is_used": True,
            "used_at": (datetime.now(timezone.utc) - timedelta(days=39)).isoformat()
        }).execute()
        print("  - Seeded Order for Product E (Delivered 40 days ago)")

    # 2. Product F (Delivered < 30 days ago)
    order_date_f = (datetime.now(timezone.utc) - timedelta(days=15)).isoformat()
    order_f = supabase.table("orders").insert({
        "user_id": str(user_id),
        "total": 300.00,
        "status": "delivered",
        "created_at": order_date_f,
        "user_name": customer_name,
        "user_email": customer_email,
        "home_address": customer_address,
        "tax_id": customer_tax_id,
        "invoice_number": "INV-000002",
        "invoice_email_sent": False
    }).execute()
    
    if order_f.data:
        oid = order_f.data[0]["id"]
        supabase.table("order_items").insert({
            "order_id": oid,
            "event_id": event_ids["Product F (Iade Edilebilir)"],
            "event_name": "Product F (Iade Edilebilir)",
            "event_date": (datetime.now() + timedelta(days=25)).strftime("%d.%m.%Y"),
            "venue": "Kilyos Beach",
            "quantity": 1,
            "price": 300.00
        }).execute()
        supabase.table("tickets").insert({
            "order_id": oid,
            "event_id": event_ids["Product F (Iade Edilebilir)"],
            "token": str(uuid.uuid4()),
            "is_used": False
        }).execute()
        print("  - Seeded Order for Product F (Delivered 15 days ago)")

    # 3. Product G (Processing recently)
    order_date_g = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    order_g = supabase.table("orders").insert({
        "user_id": str(user_id),
        "total": 120.00,
        "status": "processing",
        "created_at": order_date_g,
        "user_name": customer_name,
        "user_email": customer_email,
        "home_address": customer_address,
        "tax_id": customer_tax_id,
        "invoice_number": "INV-000003",
        "invoice_email_sent": False
    }).execute()
    
    if order_g.data:
        oid = order_g.data[0]["id"]
        supabase.table("order_items").insert({
            "order_id": oid,
            "event_id": event_ids["Product G (Hazirlanan)"],
            "event_name": "Product G (Hazirlanan)",
            "event_date": (datetime.now() + timedelta(days=30)).strftime("%d.%m.%Y"),
            "venue": "Kuruceşme Open Air",
            "quantity": 1,
            "price": 120.00
        }).execute()
        supabase.table("tickets").insert({
            "order_id": oid,
            "event_id": event_ids["Product G (Hazirlanan)"],
            "token": str(uuid.uuid4()),
            "is_used": False
        }).execute()
        print("  - Seeded Order for Product G (Processing 2 hours ago)")

    # 4. Product H (In-transit recently)
    order_date_h = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    order_h = supabase.table("orders").insert({
        "user_id": str(user_id),
        "total": 90.00,
        "status": "in-transit",
        "created_at": order_date_h,
        "user_name": customer_name,
        "user_email": customer_email,
        "home_address": customer_address,
        "tax_id": customer_tax_id,
        "invoice_number": "INV-000004",
        "invoice_email_sent": False
    }).execute()
    
    if order_h.data:
        oid = order_h.data[0]["id"]
        supabase.table("order_items").insert({
            "order_id": oid,
            "event_id": event_ids["Product H (Yolda)"],
            "event_name": "Product H (Yolda)",
            "event_date": (datetime.now() + timedelta(days=5)).strftime("%d.%m.%Y"),
            "venue": "Sinan Erdem Dome",
            "quantity": 1,
            "price": 90.00
        }).execute()
        supabase.table("tickets").insert({
            "order_id": oid,
            "event_id": event_ids["Product H (Yolda)"],
            "token": str(uuid.uuid4()),
            "is_used": False
        }).execute()
        print("  - Seeded Order for Product H (In-transit 1 hour ago)")

if __name__ == "__main__":
    print("====================================================")
    print("TicketHub - Demo Seeding script starting...")
    print("====================================================")
    
    if check_tables():
        cust_id = create_or_login_customer()
        e_ids = seed_events()
        seed_orders(cust_id, e_ids)
        print("\n🎉 SUCCESS: All demo seeding has completed successfully!")
        print("Your demo environment is fully populated and ready for action.")
        print("\nLogin info for Customer account in Demo:")
        print("  Email: customer@ticketing.com")
        print("  Password: Customer1234!")
    else:
        print("\n❌ ABORTED: Seeding aborted because of missing schema.")
        print("Please check the database and create the tables first.")
    print("====================================================")
