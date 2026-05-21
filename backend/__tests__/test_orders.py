"""
Unit Tests - Orders API
CS 308 Online Ticketing Project
Maya Sezgin - Sales Manager Dashboard
"""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from main import app

client = TestClient(app)

# ─── Mock Helpers ───────────────────────────────────────────

def make_user(role="customer", user_id="user-123"):
    user = MagicMock()
    user.id = user_id
    user.user_metadata = {"role": role, "name": "Test User"}
    return user

def make_order(order_id=1, user_id="user-123", status="Tamamlandı", total=250.0):
    return {
        "id": order_id,
        "user_id": user_id,
        "total": total,
        "status": status,
        "created_at": "2026-04-08T10:00:00Z"
    }

def make_order_item(order_id=1):
    return {
        "id": 1,
        "order_id": order_id,
        "event_id": 10,
        "event_name": "Test Konser",
        "event_date": "2026-05-01",
        "venue": "Zorlu PSM",
        "quantity": 2,
        "price": 125.0
    }

# ─── GET /orders/all ─────────────────────────────────────────

class TestGetAllOrders:

    @patch("app.api.orders.supabase")
    def test_sales_manager_can_access_all_orders(self, mock_supabase):
        """Sales manager should get all orders"""
        mock_user = make_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        orders_mock = MagicMock()
        orders_mock.data = [make_order(1), make_order(2, user_id="user-456")]
        mock_supabase.table.return_value.select.return_value.order.return_value.execute.return_value = orders_mock

        items_mock = MagicMock()
        items_mock.data = [make_order_item(1)]
        mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value = items_mock

        response = client.get("/api/orders/all", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2

    @patch("app.api.orders.supabase")
    def test_customer_cannot_access_all_orders(self, mock_supabase):
        """Customer should get 403 when accessing /orders/all"""
        mock_user = make_user(role="customer")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        response = client.get("/api/orders/all", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 403

    @patch("app.api.orders.supabase")
    def test_product_manager_can_access_all_orders(self, mock_supabase):
        """Product manager should be able to access /orders/all for Delivery Management"""
        mock_user = make_user(role="product_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        orders_mock = MagicMock()
        orders_mock.data = [make_order(1)]
        mock_supabase.table.return_value.select.return_value.order.return_value.execute.return_value = orders_mock

        items_mock = MagicMock()
        items_mock.data = []
        mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value = items_mock

        response = client.get("/api/orders/all", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200

    def test_missing_auth_header_returns_422(self):
        """Missing authorization header should return error"""
        response = client.get("/api/orders/all")
        assert response.status_code == 422

    @patch("app.api.orders.supabase")
    def test_invalid_token_returns_401(self, mock_supabase):
        """Invalid token should return 401"""
        mock_supabase.auth.get_user.return_value = MagicMock(user=None)

        response = client.get("/api/orders/all", headers={"Authorization": "Bearer invalid-token"})
        assert response.status_code == 401

    @patch("app.api.orders.supabase")
    def test_returns_empty_list_when_no_orders(self, mock_supabase):
        """Should return empty list when no orders exist"""
        mock_user = make_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        orders_mock = MagicMock()
        orders_mock.data = []
        mock_supabase.table.return_value.select.return_value.order.return_value.execute.return_value = orders_mock

        response = client.get("/api/orders/all", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json() == []

    @patch("app.api.orders.supabase")
    def test_response_contains_required_fields(self, mock_supabase):
        """Each order should have id, date, total, status, items"""
        mock_user = make_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        orders_mock = MagicMock()
        orders_mock.data = [make_order(1)]
        mock_supabase.table.return_value.select.return_value.order.return_value.execute.return_value = orders_mock

        items_mock = MagicMock()
        items_mock.data = []
        mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value = items_mock

        response = client.get("/api/orders/all", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        order = response.json()[0]
        assert "id" in order
        assert "date" in order
        assert "total" in order
        assert "status" in order
        assert "items" in order

    @patch("app.api.orders.supabase")
    def test_order_id_format(self, mock_supabase):
        """Order ID should follow TH-171210XXXX format"""
        mock_user = make_user(role="sales_manager")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        orders_mock = MagicMock()
        orders_mock.data = [make_order(1)]
        mock_supabase.table.return_value.select.return_value.order.return_value.execute.return_value = orders_mock

        items_mock = MagicMock()
        items_mock.data = []
        mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value = items_mock

        response = client.get("/api/orders/all", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        order_id = response.json()[0]["id"]
        assert order_id.startswith("TH-171210")

# ─── GET /orders ─────────────────────────────────────────────

class TestGetUserOrders:

    @patch("app.api.orders.supabase")
    def test_customer_can_get_own_orders(self, mock_supabase):
        """Customer should get their own orders"""
        mock_user = make_user(role="customer", user_id="user-123")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        orders_mock = MagicMock()
        orders_mock.data = [make_order(1, user_id="user-123")]
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = orders_mock

        items_mock = MagicMock()
        items_mock.data = [make_order_item(1)]
        mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value = items_mock

        response = client.get("/api/orders", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @patch("app.api.orders.supabase")
    def test_returns_empty_list_for_new_user(self, mock_supabase):
        """New user with no orders should get empty list"""
        mock_user = make_user(role="customer")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        orders_mock = MagicMock()
        orders_mock.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = orders_mock

        response = client.get("/api/orders", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json() == []

# ─── POST /orders ─────────────────────────────────────────────

class TestCreateOrder:

    @patch("app.api.orders.supabase")
    def test_create_order_success(self, mock_supabase):
        """Should create order and return order ID"""
        mock_user = make_user(role="customer")
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        order_mock = MagicMock()
        order_mock.data = [make_order(1)]
        mock_supabase.table.return_value.insert.return_value.execute.return_value = order_mock

        items_mock = MagicMock()
        items_mock.data = [make_order_item(1)]
        mock_supabase.table.return_value.insert.return_value.execute.return_value = items_mock

        payload = {
            "items": [{
                "event_id": 10,
                "event_name": "Test Konser",
                "event_date": "2026-05-01",
                "venue": "Zorlu PSM",
                "quantity": 2,
                "price": 125.0
            }],
            "total": 250.0
        }

        response = client.post("/api/orders", json=payload, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200

    @patch("app.api.orders.supabase")
    def test_create_order_without_auth_fails(self, mock_supabase):
        """Order creation without auth should fail"""
        payload = {"items": [], "total": 0}
        response = client.post("/api/orders", json=payload)
        assert response.status_code == 422

    @patch("app.api.orders.supabase")
    def test_create_order_invalid_token(self, mock_supabase):
        """Order creation with invalid token should return 401"""
        mock_supabase.auth.get_user.return_value = MagicMock(user=None)
        payload = {"items": [], "total": 0}
        response = client.post("/api/orders", json=payload, headers={"Authorization": "Bearer invalid"})
        assert response.status_code == 401
