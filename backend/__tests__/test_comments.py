"""
Unit Tests - Comments API
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

def make_comment(id=1, event_id=1, content="Harika konserdi!", rating=5, status="approved"):
    return {
        "id": id,
        "event_id": event_id,
        "user_id": "user-123",
        "user_name": "Test User",
        "content": content,
        "rating": rating,
        "status": status,
        "created_at": "2026-04-10T12:00:00Z"
    }

# ─── POST /comments ───────────────────────────────────────────

class TestCreateComment:

    @patch("app.api.comments.supabase")
    def test_create_comment_success(self, mock_supabase):
        """Authenticated customer posting a comment should return 200 with status=pending"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        insert_mock = MagicMock()
        insert_mock.data = [make_comment(status="pending")]
        mock_supabase.table.return_value.insert.return_value.execute.return_value = insert_mock

        payload = {"event_id": 1, "content": "Harika konserdi!", "rating": 5}
        response = client.post("/api/comments", json=payload, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        assert data["rating"] == 5
        assert data["event_id"] == 1

    def test_create_comment_without_auth_returns_422(self):
        """Request without Authorization header should return 422"""
        payload = {"event_id": 1, "content": "Great!", "rating": 4}
        response = client.post("/api/comments", json=payload)
        assert response.status_code == 422

# ─── GET /comments/event/{event_id} ──────────────────────────

class TestGetEventComments:

    @patch("app.api.comments.supabase")
    def test_get_approved_comments_for_event(self, mock_supabase):
        """Should return list of approved comments for the given event"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        comments_mock = MagicMock()
        comments_mock.data = [
            make_comment(id=1, content="Mükemmeldi!", rating=5),
            make_comment(id=2, content="Çok güzeldi.", rating=4)
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = comments_mock

        response = client.get("/api/comments/event/1", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2

    @patch("app.api.comments.supabase")
    def test_get_comments_returns_empty_list_when_none(self, mock_supabase):
        """Event with no approved comments should return empty list"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        comments_mock = MagicMock()
        comments_mock.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = comments_mock

        response = client.get("/api/comments/event/99", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json() == []


# ─── GET /comments/pending ────────────────────────────────────

class TestGetPendingComments:

    @patch("app.api.comments.supabase")
    def test_get_pending_comments_success(self, mock_supabase):
        """Product Manager bekleyen yorumları çekebilmeli"""
        mock_user = make_user()
        mock_user.user_metadata = {"role": "product_manager", "name": "PM User"}
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        comments_mock = MagicMock()
        comments_mock.data = [make_comment(status="pending")]
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = comments_mock

        response = client.get("/api/comments/pending", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert len(response.json()) == 1

    @patch("app.api.comments.supabase")
    def test_get_pending_comments_unauthorized(self, mock_supabase):
        """Müşteri rolü bekleyen yorumları çekmeye çalışırsa 403 almalı"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        response = client.get("/api/comments/pending", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 403


# ─── PATCH /comments/{comment_id} ─────────────────────────────

class TestUpdateCommentStatus:

    @patch("app.api.comments.supabase")
    def test_approve_comment_success(self, mock_supabase):
        """Product Manager yorumu onaylayabilmeli"""
        mock_user = make_user()
        mock_user.user_metadata = {"role": "product_manager", "name": "PM User"}
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        update_mock = MagicMock()
        update_mock.data = [make_comment(status="approved")]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_mock

        payload = {"status": "approved"}
        response = client.patch("/api/comments/1", json=payload, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json()["status"] == "approved"

    @patch("app.api.comments.supabase")
    def test_reject_comment_success(self, mock_supabase):
        """Product Manager yorumu reddedebilmeli"""
        mock_user = make_user()
        mock_user.user_metadata = {"role": "product_manager", "name": "PM User"}
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        update_mock = MagicMock()
        update_mock.data = [make_comment(status="rejected")]
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = update_mock

        payload = {"status": "rejected"}
        response = client.patch("/api/comments/1", json=payload, headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        assert response.json()["status"] == "rejected"

