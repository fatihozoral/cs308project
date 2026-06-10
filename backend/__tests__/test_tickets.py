"""
Unit Tests - Tickets API
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
    def test_verify_already_used_ticket(self, mock_supabase):
        """Already-used ticket should return is_used=True and the used_at timestamp"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        ticket_mock = MagicMock()
        ticket_mock.data = {
            "id": 1,
            "token": "used-token-abc",
            "is_used": True,
            "used_at": "2026-04-01T10:00:00Z",
            "events": {"name": "Test Konser", "event_date": "2026-05-01", "venue": "Zorlu PSM"}
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = ticket_mock

        response = client.get("/api/tickets/used-token-abc/verify", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["is_used"] is True
        assert data["used_at"] == "2026-04-01T10:00:00Z"

    def test_verify_ticket_invalid_bearer_format_returns_401(self):
        """Authorization header 'Bearer ' ile başlamıyorsa 401 dönmeli"""
        response = client.get("/api/tickets/some-token/verify", headers={"Authorization": "fake-token"})
        assert response.status_code == 401

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
    def test_redeem_nonexistent_ticket_returns_404(self, mock_supabase):
        """Token not found in database should return 404 on redeem"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        ticket_mock = MagicMock()
        ticket_mock.data = None
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = ticket_mock

        response = client.post("/api/tickets/nonexistent-token/redeem", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 404

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

    @patch("app.api.orders.supabase")
    def test_redeem_ticket_marks_used_with_timestamp(self, mock_supabase):
        """Redeem işlemi update'e is_used=True ve dolu bir used_at göndermeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        select_mock = MagicMock()
        select_mock.data = {
            "id": 1,
            "token": "valid-token-456",
            "is_used": False,
            "used_at": None
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = select_mock

        update_mock = MagicMock()
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_mock

        response = client.post("/api/tickets/valid-token-456/redeem", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200

        update_call_args = mock_supabase.table.return_value.update.call_args[0][0]
        assert update_call_args["is_used"] is True
        assert update_call_args["used_at"]

