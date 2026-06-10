"""
Unit Tests - Notifications API
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

# ─── GET /notifications ───────────────────────────────────────

class TestGetNotifications:

    @patch("app.api.notifications.supabase")
    def test_get_notifications_returns_list(self, mock_supabase):
        """Kullanıcı bildirimlerini getirebilmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        notifications_mock = MagicMock()
        notifications_mock.data = [
            {"id": "notif-1", "user_id": "user-123", "title": "İndirim", "message": "Kampanya başladı!", "is_read": False}
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = notifications_mock

        response = client.get("/api/notifications", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) == 1
        assert response.json()[0]["title"] == "İndirim"

    @patch("app.api.notifications.supabase")
    def test_get_notifications_empty(self, mock_supabase):
        """Bildirimi olmayan kullanıcı için boş liste dönmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        notifications_mock = MagicMock()
        notifications_mock.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = notifications_mock

        response = client.get("/api/notifications", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json() == []

    def test_get_notifications_without_auth(self):
        """Auth olmadan bildirimlere erişim 422 dönmeli"""
        response = client.get("/api/notifications")
        assert response.status_code == 422

# ─── PATCH /notifications/{notification_id}/read ─────────────

class TestMarkNotificationRead:

    @patch("app.api.notifications.supabase")
    def test_mark_notification_read_success(self, mock_supabase):
        """Tek bir bildirim okundu olarak işaretlenebilmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        update_mock = MagicMock()
        update_mock.data = [{"id": "notif-1", "user_id": "user-123", "is_read": True}]
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = update_mock

        response = client.patch("/api/notifications/notif-1/read", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json()["is_read"] is True

    @patch("app.api.notifications.supabase")
    def test_mark_notification_read_not_found(self, mock_supabase):
        """Olmayan veya yetkisiz bildirim okundu yapılmak istendiğinde 404 dönmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        update_mock = MagicMock()
        update_mock.data = []
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = update_mock

        response = client.patch("/api/notifications/notif-invalid/read", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 404
        assert response.json()["detail"] == "Bildirim bulunamadı"

# ─── PATCH /notifications/read-all ───────────────────────────

class TestMarkAllNotificationsRead:

    @patch("app.api.notifications.supabase")
    def test_mark_all_notifications_read_success(self, mock_supabase):
        """Kullanıcının tüm bildirimleri okundu yapılabilmeli"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        update_mock = MagicMock()
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_mock

        response = client.patch("/api/notifications/read-all", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json()["success"] is True
