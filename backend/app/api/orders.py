import os
import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from fastapi import APIRouter, Header, HTTPException, Depends
from typing import List, Optional
from app.core.config import supabase
from app.schemas.order import CreateOrder
from datetime import datetime, timezone
from pydantic import BaseModel

router = APIRouter()


class UpdateOrderStatus(BaseModel):
    status: str


def _pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _ascii(value: object) -> str:
    return str(value).encode("latin-1", errors="replace").decode("latin-1")


def build_invoice_pdf(order_code: str, date_str: str, total: float, items: list, tokens: list[str]) -> bytes:
    lines = [
        "TicketHub Invoice",
        f"Invoice No: {order_code}",
        f"Date: {date_str}",
        "",
        "Items:",
    ]
    for item in items:
        line_total = item.quantity * item.price
        lines.append(f"- {_ascii(item.event_name)} x{item.quantity} | {_ascii(item.venue)} | TRY {line_total:.2f}")
    lines.extend([
        "",
        f"Total: TRY {float(total):.2f}",
        "",
        "Ticket Tokens:",
    ])
    lines.extend([f"- {token}" for token in tokens])

    content_lines = [
        "BT",
        "/F1 16 Tf",
        "1 0 0 1 50 810 Tm",
        f"({_pdf_escape(lines[0])}) Tj",
        "/F1 10 Tf",
    ]
    for index, line in enumerate(lines[1:], start=1):
        y = 810 - (index * 18)
        content_lines.append(f"1 0 0 1 50 {y} Tm")
        content_lines.append(f"({_pdf_escape(line)}) Tj")
    content_lines.append("ET")
    stream = "\n".join(content_lines).encode("latin-1", errors="replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode())
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return bytes(pdf)


def send_invoice_email(recipient: str, order_code: str, pdf_bytes: bytes) -> bool:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    mail_from = os.getenv("MAIL_FROM") or smtp_user

    if not all([smtp_host, smtp_user, smtp_password, mail_from, recipient]):
        return False

    msg = EmailMessage()
    msg["Subject"] = f"TicketHub Faturanız - {order_code}"
    msg["From"] = formataddr(("TicketHub", mail_from))
    msg["To"] = recipient
    msg.set_content(
        f"Merhaba,\n\n{order_code} numaralı siparişinizin PDF faturası ekte yer almaktadır.\n\nTicketHub"
    )
    msg.add_attachment(
        pdf_bytes,
        maintype="application",
        subtype="pdf",
        filename=f"fatura-{order_code}.pdf",
    )

    with smtplib.SMTP(smtp_host, smtp_port) as smtp:
        smtp.starttls()
        smtp.login(smtp_user, smtp_password)
        smtp.send_message(msg)
    return True

async def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Geçersiz format")
    token = authorization.replace("Bearer ", "")
    response = supabase.auth.get_user(token)
    if not response.user:
        raise HTTPException(status_code=401, detail="Yetkisiz erişim")
    return response.user


def get_user_role(user) -> str:
    return user.user_metadata.get("role", "customer")


def format_order_id(order_id: int) -> str:
    return f"TH-171210{order_id:04d}"


def normalize_order_id(order_id: str) -> int:
    if order_id.startswith("TH-171210"):
        return int(order_id.replace("TH-171210", ""))
    return int(order_id)

@router.post("/orders")
async def create_order(order: CreateOrder, user=Depends(get_current_user)):
    user_id = user.id
    
    user_metadata = getattr(user, "user_metadata", {}) or {}
    user_name = user_metadata.get("name") or user_metadata.get("full_name") or ""
    user_email = getattr(user, "email", None) or user_metadata.get("email") or ""
    home_address = user_metadata.get("home_address") or ""
    tax_id = user_metadata.get("tax_id") or ""

    # Create order first
    order_data = {
        "user_id": user_id,
        "total": order.total,
        "status": "processing"
    }
    
    order_data_with_meta = {
        **order_data,
        "user_name": user_name,
        "user_email": user_email,
        "home_address": home_address,
        "tax_id": tax_id
    }
    
    try:
        order_res = supabase.table("orders").insert(order_data_with_meta).execute()
    except Exception as exc:
        print(f"Defensive fallback: database columns user_name/user_email/home_address/tax_id might be missing: {exc}")
        order_res = supabase.table("orders").insert(order_data).execute()

    if not order_res.data:
        raise HTTPException(status_code=500, detail="Sipariş oluşturulamadı")
        
    created_order = order_res.data[0]
    order_id = created_order["id"]
    
    # Create order items
    items_data = []
    for item in order.items:
        # Update event capacities
        event_res = supabase.table("events").select("remaining_capacity, ticket_categories").eq("id", item.event_id).execute()
        item_category = getattr(item, "category", None)
        if event_res.data:
            event_data = event_res.data[0]
            update_payload = {}

            categories = event_data.get("ticket_categories") if isinstance(event_data, dict) else None
            has_categories = isinstance(categories, list) and len(categories) > 0

            if has_categories:
                # Kategorili etkinlik: stok kaynağı kategorilerdir.
                if item_category:
                    for cat in categories:
                        if isinstance(cat, dict) and cat.get("name") == item_category:
                            cat_rem = cat.get("remaining")
                            if isinstance(cat_rem, (int, float)):
                                cat["remaining"] = max(0, cat_rem - item.quantity)
                            break
                update_payload["ticket_categories"] = categories
                # remaining_capacity her zaman kategori toplamından türetilir
                update_payload["remaining_capacity"] = sum(
                    c.get("remaining", 0) for c in categories if isinstance(c, dict)
                )
            else:
                # Kategorisiz etkinlik: doğrudan remaining_capacity düşülür.
                rem_cap = event_data.get("remaining_capacity") if isinstance(event_data, dict) else None
                if isinstance(rem_cap, (int, float)):
                    update_payload["remaining_capacity"] = max(0, rem_cap - item.quantity)

            if update_payload:
                supabase.table("events").update(update_payload).eq("id", item.event_id).execute()

        items_data.append({
            "order_id": order_id,
            "event_id": item.event_id,
            "event_name": item.event_name,
            "event_date": item.event_date,
            "venue": item.venue,
            "quantity": item.quantity,
            "price": item.price,
            "category": item_category
        })
        
    if items_data:
        supabase.table("order_items").insert(items_data).execute()

    # Create one ticket per quantity per item
    tickets_data = []
    for item in order.items:
        for _ in range(item.quantity):
            tickets_data.append({
                "order_id": order_id,
                "event_id": item.event_id,
            })

    tickets_res = supabase.table("tickets").insert(tickets_data).execute()
    tokens = [t.get("token") for t in (tickets_res.data or []) if isinstance(t, dict) and "token" in t]
    if not tokens:
        tokens = ["TH-TK-MOCK-TOKEN"]

    # Format created order response
    created_at = created_order.get("created_at") if isinstance(created_order, dict) else None
    if not created_at:
        created_at = datetime.now(timezone.utc).isoformat()
    # Parse timestamptz to simple date format DD.MM.YYYY
    try:
        dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        date_str = dt.strftime("%d.%m.%Y")
    except Exception:
        date_str = created_at
        
    order_code = f"TH-1712100000{order_id}"
    invoice_email_sent = False
    invoice_number = f"INV-{order_id:06d}"

    order_total = created_order.get("total") if isinstance(created_order, dict) else None
    if order_total is None or not isinstance(order_total, (int, float)):
        order_total = order.total

    order_status = created_order.get("status") if isinstance(created_order, dict) else None
    if order_status is None or not isinstance(order_status, str):
        order_status = "processing"

    try:
        pdf_bytes = build_invoice_pdf(order_code, date_str, order_total, order.items, tokens)
        invoice_email_sent = send_invoice_email(user.email, order_code, pdf_bytes)
    except Exception as exc:
        print(f"Invoice email could not be sent for order {order_code}: {exc}")

    try:
        supabase.table("orders").update({
            "invoice_number": invoice_number,
            "invoice_email_sent": invoice_email_sent,
            "invoice_email_sent_at": datetime.now(timezone.utc).isoformat() if invoice_email_sent else None
        }).eq("id", order_id).execute()
    except Exception as exc:
        print(f"Invoice metadata could not be updated for order {order_code}: {exc}")

    try:
        supabase.table("notifications").insert({
            "user_id": str(user.id),
            "title": "Siparişiniz Alındı! 🎟️",
            "message": f"Siparişiniz (Fatura No: {invoice_number}) başarıyla alınmıştır. Bilet detaylarınıza 'Siparişlerim' sayfasından ulaşabilirsiniz."
        }).execute()
    except Exception as exc:
        print(f"Failed to create purchase notification for order {order_code}: {exc}")

    return {
        "id": order_code,
        "status": order_status,
        "total": order_total,
        "date": date_str,
        "tokens": tokens,
        "invoice_email_sent": invoice_email_sent
    }

@router.get("/orders")
async def get_orders(user=Depends(get_current_user)):
    user_id = user.id
    
    # Fetch orders
    orders_res = supabase.table("orders").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    orders_data = orders_res.data
    
    if not orders_data:
        return []
        
    order_ids = [o["id"] for o in orders_data]
    
    # Fetch all items for these orders
    items_res = supabase.table("order_items").select("*").in_("order_id", order_ids).execute()
    items_data = items_res.data
    
    # Fetch all returns for user to match against items
    returns_by_item = {}
    try:
        returns_res = supabase.table("returns").select("*").eq("user_id", str(user_id)).execute()
        for r in (returns_res.data or []):
            returns_by_item[r["order_item_id"]] = {
                "status": r["status"],
                "quantity": r["quantity"],
                "price": r["price"],
                "reason": r.get("reason")
            }
    except Exception as e:
        print(f"Warning: Failed to fetch returns from DB (perhaps table 'returns' does not exist yet): {e}")

    # Group items by order
    items_by_order = {}
    for item in items_data:
        oid = item["order_id"]
        if oid not in items_by_order:
            items_by_order[oid] = []
        
        ret_info = returns_by_item.get(item["id"])
        items_by_order[oid].append({
            "id": item["id"],
            "event_id": item["event_id"],
            "name": item["event_name"],
            "date": item["event_date"],
            "venue": item["venue"],
            "quantity": item["quantity"],
            "price": item["price"],
            "category": item.get("category"),
            "return_info": ret_info
        })
        
    result = []
    for o in orders_data:
        # Format date
        created_at = o["created_at"]
        try:
            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            date_str = dt.strftime("%d.%m.%Y")
        except Exception:
            date_str = created_at
            
        result.append({
            "id": f"TH-171210{o['id']:04d}",
            "raw_id": o["id"],
            "date": date_str,
            "total": o["total"],
            "status": o["status"],
            "home_address": o.get("home_address"),
            "tax_id": o.get("tax_id"),
            "user_name": o.get("user_name"),
            "user_email": o.get("user_email"),
            "items": items_by_order.get(o["id"], [])
        })

    return result

@router.patch("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, user=Depends(get_current_user)):
    user_id = user.id
    try:
        real_id = normalize_order_id(order_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Geçersiz sipariş ID formatı")

    res = supabase.table("orders").select("*").eq("id", real_id).eq("user_id", user_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    if res.data["status"] in ("İptal Edildi", "cancelled"):
        raise HTTPException(status_code=400, detail="Sipariş zaten iptal edilmiş")
    
    # Restore capacities of events/categories associated with the cancelled order
    items_res = supabase.table("order_items").select("*").eq("order_id", real_id).execute()
    for item in (items_res.data or []):
        event_id = item["event_id"]
        category = item.get("category")
        qty = item["quantity"]
        
        event_res = supabase.table("events").select("remaining_capacity, ticket_categories").eq("id", event_id).execute()
        if event_res.data:
            ev_data = event_res.data[0]
            update_payload = {}

            categories = ev_data.get("ticket_categories")
            has_categories = isinstance(categories, list) and len(categories) > 0

            if has_categories:
                # Kategorili etkinlik: bilet kategoriye geri eklenir, toplam türetilir.
                if category:
                    for cat in categories:
                        if isinstance(cat, dict) and cat.get("name") == category:
                            cat_rem = cat.get("remaining")
                            if cat_rem is not None:
                                cat["remaining"] = cat_rem + qty
                            break
                update_payload["ticket_categories"] = categories
                update_payload["remaining_capacity"] = sum(
                    c.get("remaining", 0) for c in categories if isinstance(c, dict)
                )
            else:
                rem_cap = ev_data.get("remaining_capacity")
                if rem_cap is not None:
                    update_payload["remaining_capacity"] = rem_cap + qty

            if update_payload:
                supabase.table("events").update(update_payload).eq("id", event_id).execute()

    supabase.table("orders").update({"status": "cancelled"}).eq("id", real_id).execute()
    try:
        supabase.table("notifications").insert({
            "user_id": str(user_id),
            "title": "Sipariş İptal Edildi 🚫",
            "message": f"#{format_order_id(real_id)} numaralı siparişiniz başarıyla iptal edilmiştir."
        }).execute()
    except Exception as exc:
        print(f"Failed to create cancel notification: {exc}")
    return {"success": True}

@router.get("/orders/all")
async def get_all_orders(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user=Depends(get_current_user)
):
    role = get_user_role(user)
    if role not in ("sales_manager", "product_manager"):
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
    
    query = supabase.table("orders").select("*").order("created_at", desc=True)
    if start_date:
        iso_start = start_date + "T00:00:00Z" if "T" not in start_date else start_date
        query = query.gte("created_at", iso_start)
    if end_date:
        iso_end = end_date + "T23:59:59Z" if "T" not in end_date else end_date
        query = query.lte("created_at", iso_end)

    orders_res = query.execute()
    orders_data = orders_res.data
    
    if not orders_data:
        return []
    
    order_ids = [o["id"] for o in orders_data]
    
    items_res = supabase.table("order_items").select("*").in_("order_id", order_ids).execute()
    items_data = items_res.data
    
    # Fetch returns for these order items to show admin
    returns_by_item = {}
    try:
        returns_res = supabase.table("returns").select("*").in_("order_id", order_ids).execute()
        for r in (returns_res.data or []):
            returns_by_item[r["order_item_id"]] = {
                "status": r["status"],
                "quantity": r["quantity"],
                "price": r["price"],
                "reason": r.get("reason")
            }
    except Exception as e:
        print(f"Warning: Failed to fetch returns from DB for admin: {e}")

    items_by_order = {}
    for item in items_data:
        oid = item["order_id"]
        if oid not in items_by_order:
            items_by_order[oid] = []
        
        ret_info = returns_by_item.get(item["id"])
        items_by_order[oid].append({
            "id": item["id"],
            "event_id": item["event_id"],
            "name": item["event_name"],
            "date": item["event_date"],
            "venue": item["venue"],
            "quantity": item["quantity"],
            "price": item["price"],
            "category": item.get("category"),
            "return_info": ret_info
        })
    
    result = []
    for o in orders_data:
        created_at = o["created_at"]
        try:
            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            date_str = dt.strftime("%d.%m.%Y")
        except Exception:
            date_str = created_at
        
        result.append({
            "id": format_order_id(o["id"]),
            "raw_id": o["id"],
            "date": date_str,
            "total": o["total"],
            "status": o["status"],
            "user_id": o["user_id"],
            "user_name": o.get("user_name"),
            "user_email": o.get("user_email"),
            "home_address": o.get("home_address"),
            "tax_id": o.get("tax_id"),
            "items": items_by_order.get(o["id"], [])
        })

    return result


@router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, body: UpdateOrderStatus, user=Depends(get_current_user)):
    role = get_user_role(user)
    if role not in ("sales_manager", "product_manager"):
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")

    allowed_transitions = {
        "processing": "in-transit",
        "in-transit": "delivered",
    }

    try:
        real_id = normalize_order_id(order_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Geçersiz sipariş ID formatı")

    if body.status not in {"in-transit", "delivered"}:
        raise HTTPException(status_code=400, detail="Geçersiz teslimat durumu")

    res = supabase.table("orders").select("*").eq("id", real_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")

    current_status = res.data.get("status")
    expected_next = allowed_transitions.get(current_status)
    if expected_next != body.status:
        raise HTTPException(
            status_code=400,
            detail=f"Geçersiz durum geçişi: {current_status} -> {body.status}"
        )

    update_res = supabase.table("orders").update({"status": body.status}).eq("id", real_id).execute()
    if not update_res.data:
        raise HTTPException(status_code=500, detail="Sipariş durumu güncellenemedi")

    try:
        u_id = res.data.get("user_id")
        if u_id:
            formatted_id = format_order_id(real_id)
            if body.status == "in-transit":
                title = "Siparişiniz Yola Çıktı! 🚚"
                message = f"#{formatted_id} numaralı siparişiniz kargoya verildi ve yola çıktı. En kısa sürede teslim edilecektir."
            elif body.status == "delivered":
                title = "Siparişiniz Teslim Edildi! 🎉"
                message = f"#{formatted_id} numaralı siparişiniz teslim edildi! Biletinizi 'Siparişlerim' sayfasından kontrol edebilirsiniz."
            else:
                title = "Sipariş Durumu Güncellendi 🔄"
                message = f"#{formatted_id} numaralı siparişinizin durumu '{body.status}' olarak güncellendi."
            
            supabase.table("notifications").insert({
                "user_id": str(u_id),
                "title": title,
                "message": message
            }).execute()
    except Exception as exc:
        print(f"Failed to create order status notification: {exc}")

    return {
        "id": format_order_id(real_id),
        "raw_id": real_id,
        "status": body.status
    }


@router.get("/tickets/{token}/verify")
async def verify_ticket(token: str, user=Depends(get_current_user)):
    res = supabase.table("tickets").select("*, events(name, event_date, venue)").eq("token", token).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Bilet bulunamadı")
    t = res.data
    return {
        "valid": True,
        "is_used": t["is_used"],
        "used_at": t["used_at"],
        "event": t["events"]["name"] if t.get("events") else None,
    }


@router.post("/tickets/{token}/redeem")
async def redeem_ticket(token: str, user=Depends(get_current_user)):
    res = supabase.table("tickets").select("*").eq("token", token).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Bilet bulunamadı")
    if res.data["is_used"]:
        raise HTTPException(status_code=409, detail="Bu bilet zaten kullanılmış")
    from datetime import datetime, timezone
    supabase.table("tickets").update({
        "is_used": True,
        "used_at": datetime.now(timezone.utc).isoformat()
    }).eq("token", token).execute()
    return {"success": True}


class ReturnPayload(BaseModel):
    order_item_id: int
    quantity: int
    reason: Optional[str] = None


@router.post("/orders/{order_id}/return")
async def request_order_return(order_id: str, payload: ReturnPayload, user=Depends(get_current_user)):
    try:
        real_order_id = normalize_order_id(order_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Geçersiz sipariş ID formatı")

    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="Miktar sıfırdan büyük olmalıdır")

    order_res = supabase.table("orders").select("*").eq("id", real_order_id).eq("user_id", str(user.id)).single().execute()
    if not order_res.data:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı veya yetkisiz erişim")
    
    order_data = order_res.data
    created_at_str = order_data.get("created_at")
    
    try:
        created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = now - created_at
        if diff.days > 30:
            raise HTTPException(status_code=400, detail="İade süresi (30 gün) dolmuştur")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e

    item_res = supabase.table("order_items").select("*").eq("id", payload.order_item_id).eq("order_id", real_order_id).single().execute()
    if not item_res.data:
        raise HTTPException(status_code=404, detail="Sipariş kalemi bulunamadı")
    
    item_data = item_res.data
    purchased_qty = item_data["quantity"]
    purchase_price = float(item_data["price"])

    existing_returns_res = supabase.table("returns").select("quantity").eq("order_item_id", payload.order_item_id).neq("status", "rejected").execute()
    existing_qty = sum(r["quantity"] for r in (existing_returns_res.data or []))
    
    if existing_qty + payload.quantity > purchased_qty:
        raise HTTPException(status_code=400, detail=f"Maksimum iade edilebilecek miktar: {purchased_qty - existing_qty}")

    return_data = {
        "order_id": real_order_id,
        "order_item_id": payload.order_item_id,
        "user_id": str(user.id),
        "quantity": payload.quantity,
        "price": purchase_price,
        "status": "pending",
        "reason": payload.reason
    }
    
    insert_res = supabase.table("returns").insert(return_data).execute()
    if not insert_res.data:
        raise HTTPException(status_code=500, detail="İade talebi oluşturulamadı")
        
    return insert_res.data[0]


@router.get("/admin/returns")
async def get_admin_returns(user=Depends(get_current_user)):
    role = get_user_role(user)
    if role not in ("sales_manager", "product_manager"):
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")
        
    returns_res = supabase.table("returns").select("*").order("created_at", desc=True).execute()
    returns_data = returns_res.data or []
    
    if not returns_data:
        return []
        
    order_ids = list({r["order_id"] for r in returns_data})
    order_item_ids = list({r["order_item_id"] for r in returns_data})
    
    orders_res = supabase.table("orders").select("id, user_name, user_email").in_("id", order_ids).execute()
    orders_map = {o["id"]: o for o in (orders_res.data or [])}
    
    items_res = supabase.table("order_items").select("id, event_id, event_name, category").in_("id", order_item_ids).execute()
    items_map = {i["id"]: i for i in (items_res.data or [])}
    
    enriched = []
    for r in returns_data:
        o = orders_map.get(r["order_id"]) or {}
        item = items_map.get(r["order_item_id"]) or {}
        
        c_at = r.get("created_at")
        try:
            dt = datetime.fromisoformat(c_at.replace("Z", "+00:00"))
            date_str = dt.strftime("%d.%m.%Y %H:%M")
        except Exception:
            date_str = c_at
            
        enriched.append({
            "id": r["id"],
            "order_id": format_order_id(r["order_id"]),
            "raw_order_id": r["order_id"],
            "order_item_id": r["order_item_id"],
            "user_id": r["user_id"],
            "user_name": o.get("user_name") or "Bilinmeyen Müşteri",
            "user_email": o.get("user_email") or "",
            "event_id": item.get("event_id"),
            "event_name": item.get("event_name") or "Etkinlik",
            "category": item.get("category") or "Bilet",
            "quantity": r["quantity"],
            "price": r["price"],
            "refund_amount": round(r["quantity"] * r["price"], 2),
            "status": r["status"],
            "reason": r.get("reason") or "",
            "date": date_str
        })
        
    return enriched


@router.patch("/admin/returns/{return_id}/approve")
async def approve_return_request(return_id: str, user=Depends(get_current_user)):
    role = get_user_role(user)
    if role != "sales_manager":
        raise HTTPException(status_code=403, detail="Sadece Sales Manager iade taleplerini onaylayabilir")
        
    return_res = supabase.table("returns").select("*").eq("id", return_id).single().execute()
    if not return_res.data:
        raise HTTPException(status_code=404, detail="İade talebi bulunamadı")
    r_data = return_res.data
    
    if r_data["status"] != "pending":
        raise HTTPException(status_code=400, detail="Bu talep zaten sonuçlandırılmış")
        
    order_item_res = supabase.table("order_items").select("event_id, category").eq("id", r_data["order_item_id"]).single().execute()
    if order_item_res.data:
        oi_data = order_item_res.data
        event_id = oi_data["event_id"]
        category = oi_data.get("category")
        qty = r_data["quantity"]
        
        event_res = supabase.table("events").select("remaining_capacity, ticket_categories").eq("id", event_id).execute()
        if event_res.data:
            ev_data = event_res.data[0]
            update_payload = {}

            categories = ev_data.get("ticket_categories")
            has_categories = isinstance(categories, list) and len(categories) > 0

            if has_categories:
                # Kategorili etkinlik: iade edilen bilet kategoriye geri eklenir, toplam türetilir.
                if category:
                    for cat in categories:
                        if isinstance(cat, dict) and cat.get("name") == category:
                            cat_rem = cat.get("remaining")
                            if cat_rem is not None:
                                cat["remaining"] = cat_rem + qty
                            break
                update_payload["ticket_categories"] = categories
                update_payload["remaining_capacity"] = sum(
                    c.get("remaining", 0) for c in categories if isinstance(c, dict)
                )
            else:
                rem_cap = ev_data.get("remaining_capacity")
                if rem_cap is not None:
                    update_payload["remaining_capacity"] = rem_cap + qty

            if update_payload:
                supabase.table("events").update(update_payload).eq("id", event_id).execute()

    update_res = supabase.table("returns").update({"status": "approved", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", return_id).execute()
    if update_res.data:
        try:
            refund_amount = round(r_data["quantity"] * r_data["price"], 2)
            supabase.table("notifications").insert({
                "user_id": r_data["user_id"],
                "title": "İade Talebiniz Onaylandı! 💸",
                "message": f"Siparişinizdeki bilet iade talebi onaylandı! ₺{refund_amount} tutarındaki ücret hesabınıza geri yatırılmıştır."
            }).execute()
        except Exception as exc:
            print(f"Failed to create refund notification: {exc}")
    return {"success": True, "data": update_res.data[0]}


@router.patch("/admin/returns/{return_id}/reject")
async def reject_return_request(return_id: str, user=Depends(get_current_user)):
    role = get_user_role(user)
    if role != "sales_manager":
        raise HTTPException(status_code=403, detail="Sadece Sales Manager iade taleplerini reddedebilir")
        
    return_res = supabase.table("returns").select("status, user_id").eq("id", return_id).single().execute()
    if not return_res.data:
        raise HTTPException(status_code=404, detail="İade talebi bulunamadı")
    r_data = return_res.data
    if r_data["status"] != "pending":
        raise HTTPException(status_code=400, detail="Bu talep zaten sonuçlandırılmış")
        
    update_res = supabase.table("returns").update({"status": "rejected", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", return_id).execute()
    if update_res.data:
        try:
            supabase.table("notifications").insert({
                "user_id": r_data["user_id"],
                "title": "İade Talebi Reddedildi ❌",
                "message": f"Siparişinizdeki bilet iade talebi uygun bulunmadı ve reddedildi."
            }).execute()
        except Exception as exc:
            print(f"Failed to create refund rejection notification: {exc}")
    return {"success": True, "data": update_res.data[0]}

