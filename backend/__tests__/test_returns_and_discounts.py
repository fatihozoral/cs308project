"""
Unit Tests - Returns & Discounts API
CS 308 Online Ticketing Project
"""

import pytest
from unittest.mock import MagicMock, patch
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
