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
