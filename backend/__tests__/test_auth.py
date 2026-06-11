"""
Unit Tests - Auth API
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

def make_supabase_user(user_id="user-123", email="test@example.com"):
    user = MagicMock()
    user.id = user_id
    user.email = email
    user.user_metadata = {"role": "customer", "name": "Test User"}
    return user

# ─── POST /auth/register ─────────────────────────────────────

class TestRegisterUser:

    @patch("app.api.auth.supabase")
    def test_register_success(self, mock_supabase):
        """Valid registration payload should return 201 with user info and role=customer"""
        mock_user = make_supabase_user()
        mock_supabase.auth.sign_up.return_value = MagicMock(user=mock_user)

        payload = {
            "name": "Test User",
            "email": "test@example.com",
            "password": "StrongPass123!",
            "tax_id": "12345678901",
            "home_address": "Istanbul, Turkey"
        }

        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert "message" in data
        assert "user" in data
        assert data["user"]["email"] == "test@example.com"
        assert data["user"]["role"] == "customer"

    @patch("app.api.auth.supabase")
    def test_register_duplicate_email_returns_409(self, mock_supabase):
        """Supabase exception on duplicate email should return 409"""
        mock_supabase.auth.sign_up.side_effect = Exception("Email already registered")

        payload = {
            "name": "Test User",
            "email": "duplicate@example.com",
            "password": "StrongPass123!",
            "tax_id": "12345678901",
            "home_address": "Istanbul, Turkey"
        }

        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 409

    def test_register_missing_email_returns_422(self):
        """Email alanı eksik olunca 422 dönmeli"""
        payload = {
            "name": "Test User",
            "password": "StrongPass123!",
            "tax_id": "12345678901",
            "home_address": "Istanbul, Turkey"
        }
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 422

    def test_register_invalid_email_format_returns_422(self):
        """Geçersiz email formatı 422 dönmeli"""
        payload = {
            "name": "Test User",
            "email": "bu-bir-email-degil",
            "password": "StrongPass123!",
            "tax_id": "12345678901",
            "home_address": "Istanbul, Turkey"
        }
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 422

    def test_register_missing_password_returns_422(self):
        """Şifre alanı eksik olunca 422 dönmeli"""
        payload = {
            "name": "Test User",
            "email": "test@example.com",
            "tax_id": "12345678901",
            "home_address": "Istanbul, Turkey"
        }
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 422

    def test_register_missing_tax_id_returns_422(self):
        """Tax ID alanı eksik olunca 422 dönmeli"""
        payload = {
            "name": "Test User",
            "email": "test@example.com",
            "password": "StrongPass123!",
            "home_address": "Istanbul, Turkey"
        }
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 422

    def test_register_missing_name_returns_422(self):
        """İsim alanı eksik olunca 422 dönmeli"""
        payload = {
            "email": "test@example.com",
            "password": "StrongPass123!",
            "tax_id": "12345678901",
            "home_address": "Istanbul, Turkey"
        }
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 422

    def test_register_missing_home_address_returns_422(self):
        """Adres alanı eksik olunca 422 dönmeli"""
        payload = {
            "name": "Test User",
            "email": "test@example.com",
            "password": "StrongPass123!",
            "tax_id": "12345678901"
        }
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == 422

    def test_register_empty_payload_returns_422(self):
        """Boş payload gönderilince 422 dönmeli"""
        response = client.post("/api/auth/register", json={})
        assert response.status_code == 422

# ─── POST /auth/login ─────────────────────────────────────────

class TestLoginUser:

    @patch("app.api.auth.supabase")
    def test_login_success(self, mock_supabase):
        """Valid credentials should return 200 with token and user info"""
        mock_user = make_supabase_user()
        mock_session = MagicMock()
        mock_session.access_token = "fake-jwt-token"

        mock_response = MagicMock()
        mock_response.session = mock_session
        mock_response.user = mock_user
        mock_supabase.auth.sign_in_with_password.return_value = mock_response

        payload = {"email": "test@example.com", "password": "StrongPass123!"}

        response = client.post("/api/auth/login", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert isinstance(data["token"], str)
        assert "user" in data
        assert data["user"]["email"] == "test@example.com"
        assert data["user"]["role"] == "customer"
        assert data["user"]["name"] == "Test User"

    @patch("app.api.auth.supabase")
    def test_login_invalid_credentials_returns_401(self, mock_supabase):
        """Wrong password should cause Supabase exception and return 401"""
        mock_supabase.auth.sign_in_with_password.side_effect = Exception("Invalid credentials")

        payload = {"email": "test@example.com", "password": "WrongPassword!"}

        response = client.post("/api/auth/login", json=payload)
        assert response.status_code == 401
