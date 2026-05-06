"""
Unit Tests - Core Feature Test Cases
CS 308 E-Commerce Project
Requirements: REQ 1, 3, 4, 5, 7, 9
"""

import pytest
from unittest.mock import MagicMock, patch, call
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app

client = TestClient(app)

# ─── Mock Helpers ─────────────────────────────────────────────

def make_user(role="customer", user_id="user-123"):
    user = MagicMock()
    user.id = user_id
    user.user_metadata = {"role": role, "name": "Test User"}
    return user

def make_event(id=1, name="Test Konser", category="Konser", city="Istanbul",
               price=250.0, remaining_capacity=10, total_capacity=100):
    return {
        "id": id,
        "name": name,
        "category": category,
        "event_date": "2026-06-01",
        "event_time": "20:00",
        "venue": "Zorlu PSM",
        "city": city,
        "price": price,
        "emoji": "🎵",
        "is_active": True,
        "remaining_capacity": remaining_capacity,
        "total_capacity": total_capacity,
        "ticket_categories": None,
    }

def make_order(order_id=1, user_id="user-123", status="Tamamlandı", total=250.0):
    return {
        "id": order_id,
        "user_id": user_id,
        "total": total,
        "status": status,
        "created_at": "2026-05-01T10:00:00Z",
    }

def make_comment(id=1, event_id=1, rating=5, status="approved", content="Harika!"):
    return {
        "id": id,
        "event_id": event_id,
        "user_id": "user-123",
        "user_name": "Test User",
        "content": content,
        "rating": rating,
        "status": status,
        "created_at": "2026-05-01T12:00:00Z",
    }

ORDER_PAYLOAD = {
    "items": [
        {
            "event_id": 1,
            "event_name": "Test Konser",
            "event_date": "2026-06-01",
            "venue": "Zorlu PSM",
            "quantity": 1,
            "price": 250.0,
        }
    ],
    "total": 250.0,
}

# ─── TEST 1: Stok Azaltma ─────────────────────────────────────
# REQ 3 — Sipariş oluşturulunca remaining_capacity azalmalı

class TestStockReduction:

    @patch("app.api.orders.supabase")
    def test_order_reduces_remaining_capacity(self, mock_supabase):
        """Sipariş sonrası event'in remaining_capacity 1 azalmalı"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        orders_table = MagicMock()
        orders_table.insert.return_value.execute.return_value = MagicMock(data=[make_order(1)])

        events_table = MagicMock()
        events_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[make_event(remaining_capacity=10)]
        )
        events_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        order_items_table = MagicMock()
        order_items_table.insert.return_value.execute.return_value = MagicMock(data=[])

        tickets_table = MagicMock()
        tickets_table.insert.return_value.execute.return_value = MagicMock(data=[{"token": "abc123"}])

        def table_side_effect(name):
            return {"orders": orders_table, "events": events_table,
                    "order_items": order_items_table, "tickets": tickets_table}.get(name, MagicMock())

        mock_supabase.table.side_effect = table_side_effect

        response = client.post("/api/orders", json=ORDER_PAYLOAD, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200

        # update çağrısında remaining_capacity=9 (10-1) gönderilmiş olmalı
        update_calls = events_table.update.call_args_list
        assert len(update_calls) > 0
        updated_payload = update_calls[0][0][0]
        assert updated_payload["remaining_capacity"] == 9


# ─── TEST 2: Sipariş Durumu Güncelleme ────────────────────────
# REQ 3 — Product manager sipariş durumunu değiştirebilmeli
# NOT: Bu endpoint henüz yok (PATCH /orders/{id}/status) — TDD için yazıldı

class TestOrderStatusUpdate:

    @patch("app.api.orders.supabase")
    def test_product_manager_can_update_order_status(self, mock_supabase):
        """Product manager processing→in-transit geçişini yapabilmeli"""
        mock_user = make_user(role="product_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        order_mock = MagicMock()
        order_mock.data = [make_order(1, status="processing")]
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = order_mock

        update_mock = MagicMock()
        update_mock.data = [make_order(1, status="in-transit")]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_mock

        response = client.patch(
            "/api/orders/1/status",
            json={"status": "in-transit"},
            headers={"Authorization": "Bearer fake-token"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "in-transit"

    @patch("app.api.orders.supabase")
    def test_customer_cannot_update_order_status(self, mock_supabase):
        """Customer sipariş durumunu değiştiremez, 403 almalı"""
        mock_user = make_user(role="customer")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        response = client.patch(
            "/api/orders/1/status",
            json={"status": "in-transit"},
            headers={"Authorization": "Bearer fake-token"},
        )
        assert response.status_code == 403


# ─── TEST 3: Stok Bitince Sipariş Engeli ─────────────────────
# REQ 3/7 — remaining_capacity=0 iken sipariş oluşturulamamalı
# NOT: Backend bu kontrolü henüz yapmıyor — TDD için yazıldı

class TestOutOfStockOrderBlocked:

    @patch("app.api.orders.supabase")
    def test_order_blocked_when_out_of_stock(self, mock_supabase):
        """remaining_capacity=0 olan event için sipariş 400 dönmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        event_mock = MagicMock()
        event_mock.data = [make_event(remaining_capacity=0)]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = event_mock

        response = client.post("/api/orders", json=ORDER_PAYLOAD, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 400
        assert "stok" in response.json()["detail"].lower()


# ─── TEST 4: Giriş Olmadan Sipariş Engeli ─────────────────────
# REQ 4 — Kimlik doğrulama olmadan sipariş verilemez

class TestOrderRequiresAuth:

    def test_order_without_token_returns_422(self):
        """Authorization header olmadan istek 422 dönmeli"""
        response = client.post("/api/orders", json=ORDER_PAYLOAD)
        assert response.status_code == 422

    @patch("app.api.orders.supabase")
    def test_order_with_invalid_token_returns_401(self, mock_supabase):
        """Geçersiz token ile istek 401 dönmeli"""
        mock_supabase.auth.get_user.return_value = MagicMock(user=None)
        response = client.post("/api/orders", json=ORDER_PAYLOAD, headers={"Authorization": "Bearer gecersiz"})
        assert response.status_code == 401


# ─── TEST 5: Sipariş Response Alanları ────────────────────────
# REQ 4 — Sipariş oluştururken dönen response doğru alanları içermeli

class TestOrderResponseFields:

    @patch("app.api.orders.supabase")
    def test_create_order_response_has_required_fields(self, mock_supabase):
        """POST /orders response'unda id, status, total, date olmalı"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        orders_table = MagicMock()
        orders_table.insert.return_value.execute.return_value = MagicMock(data=[make_order(1)])

        events_table = MagicMock()
        events_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[make_event(remaining_capacity=10)]
        )
        events_table.update.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        order_items_table = MagicMock()
        order_items_table.insert.return_value.execute.return_value = MagicMock(data=[])

        tickets_table = MagicMock()
        tickets_table.insert.return_value.execute.return_value = MagicMock(data=[{"token": "tok123"}])

        def table_side_effect(name):
            return {"orders": orders_table, "events": events_table,
                    "order_items": order_items_table, "tickets": tickets_table}.get(name, MagicMock())

        mock_supabase.table.side_effect = table_side_effect

        response = client.post("/api/orders", json=ORDER_PAYLOAD, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        data = response.json()

        assert "id" in data
        assert "status" in data
        assert "total" in data
        assert "date" in data
        assert data["id"].startswith("TH-171210")
        assert data["total"] == 250.0


# ─── TEST 6: Puan Aralığı Validasyonu ─────────────────────────
# REQ 5 — Rating 1-5 dışında değer kabul edilmemeli
# NOT: Backend'de bu validasyon henüz yok — TDD için yazıldı

class TestRatingValidation:

    @patch("app.api.comments.supabase")
    def test_rating_zero_rejected(self, mock_supabase):
        """rating=0 olan yorum isteği 422 dönmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        payload = {"event_id": 1, "content": "Kötüydü", "rating": 0}
        response = client.post("/api/comments", json=payload, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 422

    @patch("app.api.comments.supabase")
    def test_rating_six_rejected(self, mock_supabase):
        """rating=6 olan yorum isteği 422 dönmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        payload = {"event_id": 1, "content": "Süperdü", "rating": 6}
        response = client.post("/api/comments", json=payload, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 422

    @patch("app.api.comments.supabase")
    def test_rating_five_accepted(self, mock_supabase):
        """rating=5 olan yorum başarıyla oluşturulmalı"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        insert_mock = MagicMock()
        insert_mock.data = [make_comment(rating=5, status="pending")]
        mock_supabase.table.return_value.insert.return_value.execute.return_value = insert_mock

        payload = {"event_id": 1, "content": "Harika!", "rating": 5}
        response = client.post("/api/comments", json=payload, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200


# ─── TEST 7: Sadece Onaylı Yorumlar Görünür ───────────────────
# REQ 5 — pending/rejected yorumlar customer'a gösterilmemeli

class TestOnlyApprovedCommentsVisible:

    @patch("app.api.comments.supabase")
    def test_only_approved_comments_returned(self, mock_supabase):
        """GET /comments/event/{id} sadece approved yorumları dönmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        comments_mock = MagicMock()
        comments_mock.data = [
            make_comment(id=1, status="approved"),
            make_comment(id=2, status="approved"),
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = comments_mock

        response = client.get("/api/comments/event/1", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        statuses = [c["status"] for c in response.json()]
        assert all(s == "approved" for s in statuses)

    @patch("app.api.comments.supabase")
    def test_empty_list_when_no_approved_comments(self, mock_supabase):
        """Hiç approved yorum yoksa boş liste dönmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        comments_mock = MagicMock()
        comments_mock.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = comments_mock

        response = client.get("/api/comments/event/1", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json() == []


# ─── TEST 8: Product Manager Yorum Onaylama ve Yetki ──────────
# REQ 5 — Sadece product_manager onaylayabilir, customer 403 almalı

class TestCommentApproval:

    @patch("app.api.comments.supabase")
    def test_product_manager_can_approve_comment(self, mock_supabase):
        """Product manager yorumu approved yapabilmeli"""
        mock_user = make_user(role="product_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        update_mock = MagicMock()
        update_mock.data = [make_comment(id=1, status="approved")]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_mock

        response = client.patch(
            "/api/comments/1",
            json={"status": "approved"},
            headers={"Authorization": "Bearer fake-token"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "approved"

    @patch("app.api.comments.supabase")
    def test_customer_cannot_approve_comment(self, mock_supabase):
        """Customer yorum onaylayamaz, 403 almalı"""
        mock_user = make_user(role="customer")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        response = client.patch(
            "/api/comments/1",
            json={"status": "approved"},
            headers={"Authorization": "Bearer fake-token"},
        )
        assert response.status_code == 403

    @patch("app.api.comments.supabase")
    def test_invalid_status_value_rejected(self, mock_supabase):
        """Geçersiz status değeri (ör. 'maybe') 400 dönmeli"""
        mock_user = make_user(role="product_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        response = client.patch(
            "/api/comments/1",
            json={"status": "maybe"},
            headers={"Authorization": "Bearer fake-token"},
        )
        assert response.status_code == 400


# ─── TEST 9: Fiyata Göre Sıralama ─────────────────────────────
# REQ 7 — GET /events?sort=price_asc en ucuz event ilk sırada olmalı
# NOT: sort parametresi henüz yok — TDD için yazıldı

class TestSortByPrice:

    @patch("app.api.events.supabase")
    def test_sort_price_asc_returns_cheapest_first(self, mock_supabase):
        """sort=price_asc ile fiyatlar artan sırada dönmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        events_mock = MagicMock()
        events_mock.data = [
            make_event(id=1, price=500.0),
            make_event(id=2, price=150.0),
            make_event(id=3, price=300.0),
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = events_mock

        response = client.get("/api/events?sort=price_asc", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        prices = [e["price"] for e in response.json()]
        assert prices == sorted(prices)

    @patch("app.api.events.supabase")
    def test_sort_price_desc_returns_most_expensive_first(self, mock_supabase):
        """sort=price_desc ile fiyatlar azalan sırada dönmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        events_mock = MagicMock()
        events_mock.data = [
            make_event(id=1, price=500.0),
            make_event(id=2, price=150.0),
            make_event(id=3, price=300.0),
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = events_mock

        response = client.get("/api/events?sort=price_desc", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        prices = [e["price"] for e in response.json()]
        assert prices == sorted(prices, reverse=True)


# ─── TEST 10: Kategori Filtresi ───────────────────────────────
# REQ 1/7 — Kategori filtresi sadece o kategorideki eventleri dönmeli

class TestCategoryFilter:

    @patch("app.api.events.supabase")
    def test_category_filter_returns_only_matching_events(self, mock_supabase):
        """category=Konser filtresi sadece Konser kategorisini dönmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        events_mock = MagicMock()
        events_mock.data = [
            make_event(id=1, category="Konser"),
            make_event(id=2, category="Konser"),
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = events_mock

        response = client.get("/api/events?category=Konser", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(e["category"] == "Konser" for e in data)

    @patch("app.api.events.supabase")
    def test_tumü_category_returns_all_events(self, mock_supabase):
        """category=Tümü filtresi tüm kategorileri dönmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        events_mock = MagicMock()
        events_mock.data = [
            make_event(id=1, category="Konser"),
            make_event(id=2, category="Spor"),
            make_event(id=3, category="Tiyatro"),
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = events_mock

        response = client.get("/api/events?category=Tümü", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert len(response.json()) == 3
