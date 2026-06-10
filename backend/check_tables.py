import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

tables = ["events", "orders", "order_items", "tickets", "returns", "notifications", "wishlist"]

for table in tables:
    try:
        res = supabase.table(table).select("*").limit(1).execute()
        if res.data:
            print(f"Columns in '{table}': {list(res.data[0].keys())}")
        else:
            print(f"Table '{table}' is empty, cannot inspect columns.")
    except Exception as e:
        print(f"❌ Table '{table}' failed: {e}")
