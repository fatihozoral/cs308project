"""
Unit Tests - Tickets API
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

# ─── Mock Helpers ───────────────────────────────────────────

def make_user(user_id="user-123"):
    user = MagicMock()
    user.id = user_id
    user.user_metadata = {"role": "customer", "name": "Test User"}
    return user

# ─── GET /tickets/{token}/verify ─────────────────────────────

class TestVerifyTicket:

    @patch("app.api.orders.supabase")
    def test_verify_valid_ticket(self, mock_supabase):
        """Valid unused ticket should return valid=True, is_used=False, and event name"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        ticket_mock = MagicMock()
        ticket_mock.data = {
            "id": 1,
            "token": "valid-token-abc",
            "is_used": False,
            "used_at": None,
            "events": {"name": "Test Konser", "event_date": "2026-05-01", "venue": "Zorlu PSM"}
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = ticket_mock

        response = client.get("/api/tickets/valid-token-abc/verify", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["is_used"] is False
        assert data["event"] == "Test Konser"

    @patch("app.api.orders.supabase")
    def test_verify_nonexistent_ticket_returns_404(self, mock_supabase):
        """Token not found in database should return 404"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        ticket_mock = MagicMock()
        ticket_mock.data = None
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = ticket_mock

        response = client.get("/api/tickets/nonexistent-token/verify", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 404

# ─── POST /tickets/{token}/redeem ────────────────────────────

class TestRedeemTicket:

    @patch("app.api.orders.supabase")
    def test_redeem_already_used_ticket_returns_409(self, mock_supabase):
        """Attempting to redeem an already-used ticket should return 409"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        ticket_mock = MagicMock()
        ticket_mock.data = {
            "id": 1,
            "token": "used-token-xyz",
            "is_used": True,
            "used_at": "2026-04-01T10:00:00Z"
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = ticket_mock

        response = client.post("/api/tickets/used-token-xyz/redeem", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 409

    @patch("app.api.orders.supabase")
    def test_redeem_valid_ticket_success(self, mock_supabase):
        """Kullanılmamış geçerli bir bilet başarıyla okutulabilmeli (redeem edilmeli)"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        # 1. Select mock: ticket is unused
        select_mock = MagicMock()
        select_mock.data = {
            "id": 1,
            "token": "valid-token-123",
            "is_used": False,
            "used_at": None
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = select_mock

        # 2. Update mock: successful execute
        update_mock = MagicMock()
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_mock

        response = client.post("/api/tickets/valid-token-123/redeem", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json()["success"] is True

