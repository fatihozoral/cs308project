"""
Unit Tests - Wishlist API
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

def make_user(user_id="user-123"):
    user = MagicMock()
    user.id = user_id
    user.user_metadata = {"role": "customer", "name": "Test User"}
    return user

# ─── GET /wishlist ────────────────────────────────────────────

class TestGetWishlist:

    @patch("app.api.wishlist.supabase")
    def test_get_wishlist_returns_list(self, mock_supabase):
        """Kullanıcı wishlist'ini getirebilmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        wishlist_mock = MagicMock()
        wishlist_mock.data = [{"id": 1, "user_id": "user-123", "event_id": 5}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = wishlist_mock

        response = client.get("/api/wishlist", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @patch("app.api.wishlist.supabase")
    def test_get_wishlist_empty(self, mock_supabase):
        """Wishlist'i boş kullanıcı için boş liste dönmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        wishlist_mock = MagicMock()
        wishlist_mock.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = wishlist_mock

        response = client.get("/api/wishlist", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json() == []

    def test_get_wishlist_without_auth(self):
        """Auth olmadan wishlist'e erişim 422 dönmeli"""
        response = client.get("/api/wishlist")
        assert response.status_code == 422

    @patch("app.api.wishlist.supabase")
    def test_get_wishlist_invalid_token(self, mock_supabase):
        """Geçersiz token 401 dönmeli"""
        mock_supabase.auth.get_user.return_value = MagicMock(user=None)
        response = client.get("/api/wishlist", headers={"Authorization": "Bearer invalid"})
        assert response.status_code == 401

# ─── POST /wishlist/{event_id} ────────────────────────────────

class TestAddToWishlist:

    @patch("app.api.wishlist.supabase")
    def test_add_event_to_wishlist(self, mock_supabase):
        """Etkinlik wishlist'e eklenebilmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        existing_mock = MagicMock()
        existing_mock.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = existing_mock

        insert_mock = MagicMock()
        insert_mock.data = [{"id": 1, "user_id": "user-123", "event_id": 5}]
        mock_supabase.table.return_value.insert.return_value.execute.return_value = insert_mock

        response = client.post("/api/wishlist/5", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200

    @patch("app.api.wishlist.supabase")
    def test_add_duplicate_returns_existing(self, mock_supabase):
        """Zaten eklenmiş etkinlik tekrar eklenmemeli, mevcut kayıt dönmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        existing_mock = MagicMock()
        existing_mock.data = [{"id": 1, "user_id": "user-123", "event_id": 5}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = existing_mock

        response = client.post("/api/wishlist/5", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200

# ─── DELETE /wishlist/{event_id} ─────────────────────────────

class TestRemoveFromWishlist:

    @patch("app.api.wishlist.supabase")
    def test_remove_event_from_wishlist(self, mock_supabase):
        """Etkinlik wishlist'ten çıkarılabilmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        delete_mock = MagicMock()
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = delete_mock

        response = client.delete("/api/wishlist/5", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json()["success"] is True

    def test_remove_without_auth(self):
        """Auth olmadan silme 422 dönmeli"""
        response = client.delete("/api/wishlist/5")
        assert response.status_code == 422
