"""
Unit Tests - Admin API (Events, Stock, and Discounts)
CS 308 Online Ticketing Project
"""

# pyrefly: ignore [missing-import]
import pytest
from unittest.mock import MagicMock, patch
# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from main import app

client = TestClient(app)

def make_admin_user(role="product_manager", name="Test Admin"):
    user = MagicMock()
    user.id = "admin-123"
    user.user_metadata = {"role": role, "name": name}
    return user

# ─── GET /api/admin/events ────────────────────────────────────

class TestGetAdminEvents:

    @patch("app.api.admin.supabase")
    def test_get_admin_events_success(self, mock_supabase):
        """Product Manager tüm etkinlikleri listeleyebilmeli"""
        mock_user = make_admin_user(role="product_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        events_mock = MagicMock()
        events_mock.data = [{"id": 1, "name": "Konser", "remaining_capacity": 100}]
        mock_supabase.table.return_value.select.return_value.order.return_value.execute.return_value = events_mock

        response = client.get("/api/admin/events", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) == 1

    @patch("app.api.admin.supabase")
    def test_get_admin_events_unauthorized_customer(self, mock_supabase):
        """Customer rolü admin etkinlik listesine erişmeye çalışırsa 403 almalı"""
        mock_user = make_admin_user(role="customer")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        response = client.get("/api/admin/events", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 403
        assert response.json()["detail"] == "Product manager yetkisi gerekiyor"

# ─── POST /api/admin/events ───────────────────────────────────

class TestCreateAdminEvent:

    @patch("app.api.admin.supabase")
    def test_create_event_success(self, mock_supabase):
        """Product Manager yeni bir etkinlik ekleyebilmeli"""
        mock_user = make_admin_user(role="product_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        insert_mock = MagicMock()
        insert_mock.data = [{"id": 5, "name": "Yeni Tiyatro", "total_capacity": 150}]
        mock_supabase.table.return_value.insert.return_value.execute.return_value = insert_mock

        payload = {
            "name": "Yeni Tiyatro",
            "category": "Tiyatro",
            "event_date": "2026-07-20",
            "event_time": "20:00",
            "venue": "Mekan X",
            "city": "Istanbul",
            "price": 200.0,
            "total_capacity": 150,
            "remaining_capacity": 150
        }

        response = client.post("/api/admin/events", json=payload, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json()["name"] == "Yeni Tiyatro"

# ─── DELETE /api/admin/events/{event_id} ──────────────────────

class TestDeleteAdminEvent:

    @patch("app.api.admin.supabase")
    def test_delete_event_success(self, mock_supabase):
        """Product Manager bir etkinliği silebilmeli (is_active=False yapılmalı)"""
        mock_user = make_admin_user(role="product_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        update_mock = MagicMock()
        update_mock.data = [{"id": 1, "is_active": False}]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_mock

        response = client.delete("/api/admin/events/1", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json()["success"] is True

# ─── PATCH /api/admin/events/{event_id}/discount ──────────────

class TestUpdateEventDiscount:

    @patch("app.api.admin.supabase")
    def test_apply_discount_success(self, mock_supabase):
        """Sales Manager indirim uygulayabilmeli ve istek listesindeki kullanıcılara bildirim gitmeli"""
        mock_user = make_admin_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        # 1. Mock select event name & price
        select_event_mock = MagicMock()
        select_event_mock.data = [{"name": "Tarkan Konseri", "price": 500.0}]
        
        # 2. Mock update discount_rate
        update_discount_mock = MagicMock()
        update_discount_mock.data = [{"id": 1, "name": "Tarkan Konseri", "discount_rate": 20}]
        
        # 3. Mock wishlist select
        wishlist_mock = MagicMock()
        wishlist_mock.data = [{"user_id": "user-456"}]

        # Hook all database calls sequentially
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
            select_event_mock,  # select event details
            wishlist_mock       # select users in wishlist
        ]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_discount_mock
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()

        response = client.patch("/api/admin/events/1/discount", json={"discount_rate": 20}, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json()["discount_rate"] == 20

    @patch("app.api.admin.supabase")
    def test_discount_rate_above_90_returns_400(self, mock_supabase):
        """İndirim oranı %90'ı geçince 400 dönmeli"""
        mock_user = make_admin_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        response = client.patch(
            "/api/admin/events/1/discount",
            json={"discount_rate": 95},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 400
        assert "%90" in response.json()["detail"]

    @patch("app.api.admin.supabase")
    def test_discount_rate_negative_returns_400(self, mock_supabase):
        """Negatif indirim oranı 400 dönmeli"""
        mock_user = make_admin_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        response = client.patch(
            "/api/admin/events/1/discount",
            json={"discount_rate": -5},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 400

    @patch("app.api.admin.supabase")
    def test_discount_on_nonexistent_event_returns_404(self, mock_supabase):
        """Olmayan ürüne indirim uygulanmak istenince 404 dönmeli"""
        mock_user = make_admin_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        event_mock = MagicMock()
        event_mock.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = event_mock

        response = client.patch(
            "/api/admin/events/999/discount",
            json={"discount_rate": 20},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 404

    @patch("app.api.admin.supabase")
    def test_product_manager_cannot_set_discount(self, mock_supabase):
        """Product Manager indirim uygulayamaz, 403 dönmeli"""
        mock_user = make_admin_user(role="product_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        response = client.patch(
            "/api/admin/events/1/discount",
            json={"discount_rate": 20},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 403

    @patch("app.api.admin.supabase")
    def test_discount_notifies_wishlist_users(self, mock_supabase):
        """İndirim uygulanınca istek listesindeki kullanıcılara bildirim gitmeli"""
        mock_user = make_admin_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        event_mock = MagicMock()
        event_mock.data = [{"name": "Konser", "price": 300.0}]

        update_mock = MagicMock()
        update_mock.data = [{"id": 1, "discount_rate": 30}]

        wishlist_mock = MagicMock()
        wishlist_mock.data = [{"user_id": "user-1"}, {"user_id": "user-2"}]

        notif_mock = MagicMock()

        def table_side_effect(table_name):
            t = MagicMock()
            if table_name == "events":
                t.select.return_value.eq.return_value.execute.return_value = event_mock
                t.update.return_value.eq.return_value.execute.return_value = update_mock
            elif table_name == "wishlist":
                t.select.return_value.eq.return_value.execute.return_value = wishlist_mock
            elif table_name == "notifications":
                t.insert.return_value.execute.return_value = notif_mock
            return t

        mock_supabase.table.side_effect = table_side_effect

        response = client.patch(
            "/api/admin/events/1/discount",
            json={"discount_rate": 30},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 200

        notif_calls = [c for c in mock_supabase.table.call_args_list if c.args and c.args[0] == "notifications"]
        assert len(notif_calls) > 0

# ─── PATCH /api/admin/events/{event_id} (price update) ───────

class TestUpdateEventPrice:

    @patch("app.api.admin.supabase")
    def test_sales_manager_can_set_price(self, mock_supabase):
        """Sales Manager ürün fiyatını belirleyebilmeli"""
        mock_user = make_admin_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        update_mock = MagicMock()
        update_mock.data = [{"id": 1, "name": "Ürün D", "price": 350.0}]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_mock

        response = client.patch(
            "/api/admin/events/1",
            json={"price": 350.0},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 200
        assert response.json()["price"] == 350.0

    @patch("app.api.admin.supabase")
    def test_product_manager_can_set_price(self, mock_supabase):
        """Product Manager de ürün fiyatını güncelleyebilmeli"""
        mock_user = make_admin_user(role="product_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        update_mock = MagicMock()
        update_mock.data = [{"id": 1, "price": 200.0}]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_mock

        response = client.patch(
            "/api/admin/events/1",
            json={"price": 200.0},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 200

    @patch("app.api.admin.supabase")
    def test_customer_cannot_update_price(self, mock_supabase):
        """Müşteri fiyat güncelleyemez, 403 dönmeli"""
        mock_user = make_admin_user(role="customer")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        response = client.patch(
            "/api/admin/events/1",
            json={"price": 100.0},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 403

    @patch("app.api.admin.supabase")
    def test_update_price_nonexistent_event_returns_404(self, mock_supabase):
        """Olmayan ürünün fiyatı güncellenmeye çalışılınca 404 dönmeli"""
        mock_user = make_admin_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        update_mock = MagicMock()
        update_mock.data = []
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_mock

        response = client.patch(
            "/api/admin/events/999",
            json={"price": 100.0},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 404

    @patch("app.api.admin.supabase")
    def test_empty_payload_returns_400(self, mock_supabase):
        """Boş payload gönderilince 400 dönmeli"""
        mock_user = make_admin_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        response = client.patch(
            "/api/admin/events/1",
            json={},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 400
        assert "alan yok" in response.json()["detail"]
