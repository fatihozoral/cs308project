from dotenv import load_dotenv
import os
import httpx

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

headers = {"apikey": key, "Authorization": f"Bearer {key}"}
response = httpx.get(f"{url}/rest/v1/events?select=*&limit=1", headers=headers)
print("Events:", response.json())

# Check tickets table structure too
response_orders = httpx.get(f"{url}/rest/v1/orders?select=*&limit=1", headers=headers)
print("Orders:", response_orders.json())
