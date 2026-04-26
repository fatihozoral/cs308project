"""
Unit Tests - Events API
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

def make_event(id=1, name="Test Konser", category="Konser", city="Istanbul",
               event_date="2026-05-01", event_time="20:00", venue="Zorlu PSM",
               price=250.0, emoji="🎵"):
    return {
        "id": id,
        "name": name,
        "category": category,
        "event_date": event_date,
        "event_time": event_time,
        "venue": venue,
        "city": city,
        "price": price,
        "emoji": emoji,
        "is_active": True
    }

# ─── GET /events ─────────────────────────────────────────────

class TestGetEvents:

    @patch("app.api.events.supabase")
    def test_get_events_returns_list(self, mock_supabase):
        """Authenticated request with no filters should return list of events with Turkish-formatted dates"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        events_mock = MagicMock()
        events_mock.data = [make_event(1), make_event(2, name="Rock Festivali", city="Ankara")]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = events_mock

        response = client.get("/api/events", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        event = data[0]
        assert "id" in event
        assert "name" in event
        assert "category" in event
        assert "date" in event
        assert "time" in event
        assert "venue" in event
        assert "city" in event
        assert "price" in event
        assert "emoji" in event
        # Date should be Turkish-formatted (e.g. "1 May 2026")
        assert "2026" in event["date"]

    @patch("app.api.events.supabase")
    def test_search_filter_returns_matching_events(self, mock_supabase):
        """Search param should filter events in-memory by name or city"""
        mock_user = make_user()
        mock_supabase.auth.get_user.return_value = MagicMock(user=mock_user)

        events_mock = MagicMock()
        events_mock.data = [
            make_event(1, name="Konser A", city="Istanbul"),
            make_event(2, name="Tiyatro B", city="Istanbul"),
            make_event(3, name="Festival C", city="Ankara"),
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = events_mock

        response = client.get("/api/events?search=istanbul", headers={"Authorization": "Bearer fake-token"})
        assert response.status_code == 200
        data = response.json()
        # Only the 2 Istanbul events should be returned; Ankara event filtered out
        assert len(data) == 2
        cities = [e["city"] for e in data]
        assert all(c == "Istanbul" for c in cities)

    def test_no_auth_returns_422(self):
        """Request without Authorization header should return 422 (required header missing)"""
        response = client.get("/api/events")
        assert response.status_code == 422
