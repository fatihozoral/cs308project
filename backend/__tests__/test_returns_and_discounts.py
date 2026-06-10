"""
Unit Tests - Returns & Discounts API
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

def make_user(role="customer", user_id="user-123"):
    user = MagicMock()
    user.id = user_id
    user.user_metadata = {"role": role, "name": "Test User"}
    return user

class TestDiscounts:

    @patch("app.api.admin.supabase")
    def test_update_discount_success(self, mock_supabase):
        """Sales manager can set discount successfully and trigger wishlist notification check"""
        mock_user = make_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        events_table = MagicMock()
        wishlist_table = MagicMock()
        notifications_table = MagicMock()

        def table_side_effect(table_name):
            if table_name == "events":
                return events_table
            elif table_name == "wishlist":
                return wishlist_table
            elif table_name == "notifications":
                return notifications_table
            return MagicMock()

        mock_supabase.table.side_effect = table_side_effect

        # Mock event fetch for original price
        event_mock = MagicMock()
        event_mock.data = [{"price": 100.0, "name": "Rock Fest"}]
        events_table.select.return_value.eq.return_value.execute.return_value = event_mock

        # Mock update
        update_mock = MagicMock()
        update_mock.data = [{"id": 1, "discount_rate": 20}]
        events_table.update.return_value.eq.return_value.execute.return_value = update_mock

        # Mock wishlist fetch
        wishlist_mock = MagicMock()
        wishlist_mock.data = [{"user_id": "user-456"}]
        wishlist_table.select.return_value.eq.return_value.execute.return_value = wishlist_mock

        # Mock notifications insert
        notifications_table.insert.return_value.execute.return_value = MagicMock(data=[])

        payload = {"discount_rate": 20}
        response = client.patch("/api/admin/events/1/discount", json=payload, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json()["discount_rate"] == 20

    @patch("app.api.admin.supabase")
    def test_update_discount_unauthorized(self, mock_supabase):
        """Customer cannot set discount"""
        mock_user = make_user(role="customer")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        payload = {"discount_rate": 20}
        response = client.patch("/api/admin/events/1/discount", json=payload, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 403

    @patch("app.api.admin.supabase")
    def test_update_discount_invalid_rate(self, mock_supabase):
        """Should fail if discount rate is outside 0-90 range"""
        mock_user = make_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        payload = {"discount_rate": 95}
        response = client.patch("/api/admin/events/1/discount", json=payload, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 400


class TestReturns:

    @patch("app.api.orders.supabase")
    def test_request_return_success(self, mock_supabase):
        """Customer can request a bilet return successfully within 30 days"""
        mock_user = make_user(role="customer", user_id="user-123")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        orders_table = MagicMock()
        items_table = MagicMock()
        returns_table = MagicMock()

        def table_side_effect(table_name):
            if table_name == "orders":
                return orders_table
            elif table_name == "order_items":
                return items_table
            elif table_name == "returns":
                return returns_table
            return MagicMock()

        mock_supabase.table.side_effect = table_side_effect

        # Mock order lookup (created_at matches 30-day window)
        order_mock = MagicMock()
        order_mock.data = {"id": 1, "user_id": "user-123", "created_at": "2026-05-20T12:00:00Z", "total": 200.0}
        orders_table.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = order_mock

        # Mock order item lookup
        item_mock = MagicMock()
        item_mock.data = {"id": 10, "order_id": 1, "price": 100.0, "quantity": 2}
        items_table.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = item_mock

        # Mock existing returns lookup (none)
        existing_mock = MagicMock()
        existing_mock.data = []
        returns_table.select.return_value.eq.return_value.neq.return_value.execute.return_value = existing_mock

        # Mock insert return request
        insert_mock = MagicMock()
        insert_mock.data = [{"id": 5, "status": "pending", "quantity": 1}]
        returns_table.insert.return_value.execute.return_value = insert_mock

        payload = {"order_item_id": 10, "quantity": 1, "reason": "Tarih uymuyor"}
        response = client.post("/api/orders/1/return", json=payload, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json()["id"] == 5

    @patch("app.api.orders.supabase")
    def test_request_return_expired_30_days(self, mock_supabase):
        """Return should fail if order is older than 30 days"""
        mock_user = make_user(role="customer", user_id="user-123")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        orders_table = MagicMock()
        order_mock = MagicMock()
        order_mock.data = {"id": 1, "user_id": "user-123", "created_at": "2026-04-01T12:00:00Z", "total": 200.0}
        orders_table.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = order_mock
        mock_supabase.table.return_value = orders_table

        payload = {"order_item_id": 10, "quantity": 1, "reason": "Tarih uymuyor"}
        response = client.post("/api/orders/1/return", json=payload, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 400
        assert "dolmuştur" in response.json()["detail"]

    @patch("app.api.orders.supabase")
    def test_request_return_excessive_quantity(self, mock_supabase):
        """Return should fail if quantity requested is greater than purchased quantity"""
        mock_user = make_user(role="customer", user_id="user-123")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        orders_table = MagicMock()
        items_table = MagicMock()
        returns_table = MagicMock()

        def table_side_effect(table_name):
            if table_name == "orders":
                return orders_table
            elif table_name == "order_items":
                return items_table
            elif table_name == "returns":
                return returns_table
            return MagicMock()

        mock_supabase.table.side_effect = table_side_effect

        # Mock order lookup
        order_mock = MagicMock()
        order_mock.data = {"id": 1, "user_id": "user-123", "created_at": "2026-05-20T12:00:00Z", "total": 200.0}
        orders_table.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = order_mock

        # Mock order item lookup (only purchased 2)
        item_mock = MagicMock()
        item_mock.data = {"id": 10, "order_id": 1, "price": 100.0, "quantity": 2}
        items_table.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = item_mock

        # Mock existing returns lookup
        existing_mock = MagicMock()
        existing_mock.data = []
        returns_table.select.return_value.eq.return_value.neq.return_value.execute.return_value = existing_mock

        payload = {"order_item_id": 10, "quantity": 3, "reason": "İptal"}
        response = client.post("/api/orders/1/return", json=payload, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 400
        assert "Maksimum iade" in response.json()["detail"]


class TestSalesManagerReturns:

    @patch("app.api.orders.supabase")
    def test_get_admin_returns_success(self, mock_supabase):
        """Sales Manager tüm iade taleplerini listeleyebilmeli"""
        mock_user = make_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        returns_mock = MagicMock()
        returns_mock.data = [{"id": "ret-1", "order_id": 1, "order_item_id": 10, "user_id": "user-123", "quantity": 1, "price": 100.0, "status": "pending"}]
        
        # We need mock for returns select, orders in select, order_items in select
        mock_supabase.table.return_value.select.return_value.order.return_value.execute.return_value = returns_mock
        
        orders_mock = MagicMock()
        orders_mock.data = [{"id": 1, "user_name": "Test User", "user_email": "test@example.com"}]
        
        items_mock = MagicMock()
        items_mock.data = [{"id": 10, "event_name": "Konser X", "category": "Konser"}]
        
        mock_supabase.table.return_value.select.return_value.in_.return_value.execute.side_effect = [
            orders_mock,
            items_mock
        ]

        response = client.get("/api/admin/returns", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["event_name"] == "Konser X"

    @patch("app.api.orders.supabase")
    def test_get_admin_returns_unauthorized(self, mock_supabase):
        """Customer rolü iade taleplerini çekememeli (403)"""
        mock_user = make_user(role="customer")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        response = client.get("/api/admin/returns", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 403

    @patch("app.api.orders.supabase")
    def test_approve_return_success(self, mock_supabase):
        """Sales Manager iade talebini onaylayabilmeli ve stok geri yüklenmeli"""
        mock_user = make_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        # Mock return request check
        return_mock = MagicMock()
        return_mock.data = {"id": "ret-1", "order_item_id": 10, "quantity": 1, "status": "pending"}
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = return_mock

        # Mock order item check (to get event_id and category)
        item_mock = MagicMock()
        item_mock.data = {"event_id": 100, "category": "Konser"}
        
        # Mock event check (to get remaining capacity)
        event_mock = MagicMock()
        event_mock.data = [{"remaining_capacity": 50, "ticket_categories": []}]

        # Mock database selects
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = [
            return_mock,
            item_mock
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = event_mock

        # Mock return update and event capacity update
        update_mock = MagicMock()
        update_mock.data = [{"id": "ret-1", "status": "approved"}]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_mock

        response = client.patch("/api/admin/returns/ret-1/approve", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "approved"

    @patch("app.api.orders.supabase")
    def test_approve_return_unauthorized_for_product_manager(self, mock_supabase):
        """Product Manager iade onaylayamamalı, sadece Sales Manager onaylayabilir (Gereksinim 15)"""
        mock_user = make_user(role="product_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        response = client.patch("/api/admin/returns/ret-1/approve", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 403
        assert "Sadece Sales Manager" in response.json()["detail"]

    @patch("app.api.orders.supabase")
    def test_reject_return_success(self, mock_supabase):
        """Sales Manager iade talebini reddedebilmeli"""
        mock_user = make_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        # Mock return request check
        return_mock = MagicMock()
        return_mock.data = {"status": "pending"}
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = return_mock

        # Mock return update
        update_mock = MagicMock()
        update_mock.data = [{"id": "ret-1", "status": "rejected"}]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_mock

        response = client.patch("/api/admin/returns/ret-1/reject", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json()["data"]["status"] == "rejected"

