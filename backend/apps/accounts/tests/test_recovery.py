"""Tests for account recovery endpoints."""

import uuid
from unittest.mock import patch, MagicMock

from django.core.signing import BadSignature
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.utils.token import generate_recovery_token, verify_recovery_token


class RecoverAccountTests(APITestCase):
    """Test suite for POST /api/auth/recover endpoint."""

    def setUp(self):
        """Set up test fixtures."""
        self.user_id = str(uuid.uuid4())
        self.user_email = "testuser@example.com"
        self.recover_url = reverse("recover_account")

    @patch("apps.accounts.views.supabase_client.get_user_by_id")
    def test_recover_with_valid_token(self, mock_get_user):
        """Test recovery with valid recovery token returns recovery session token."""
        # Setup
        mock_get_user.return_value = {
            "id": self.user_id,
            "email": self.user_email,
            "user_metadata": {},
        }

        # Generate a valid recovery token
        recovery_token = generate_recovery_token(uuid.UUID(self.user_id))

        # Execute
        response = self.client.post(
            self.recover_url,
            {"token": recovery_token},
            format="json",
            QUERY_STRING=f"token={recovery_token}",
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("recovery_session_token", response.data)
        self.assertEqual(response.data["user_id"], self.user_id)
        self.assertEqual(response.data["email"], self.user_email)
        self.assertEqual(response.data["recovery_expires_in_seconds"], 3600)
        self.assertIn("Recovery verified", response.data["message"])

    def test_recover_without_token(self):
        """Test recovery without token returns 400 Bad Request."""
        # Execute
        response = self.client.post(self.recover_url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertIn("token", response.data["error"].lower())

    def test_recover_with_invalid_token(self):
        """Test recovery with invalid token returns 401 Unauthorized."""
        # Execute
        response = self.client.post(
            self.recover_url,
            QUERY_STRING="token=invalid.token.here",
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("error", response.data)

    def test_recover_with_expired_token(self):
        """Test recovery with expired token returns 401 Unauthorized."""
        # Generate token and manually expire it by creating a very old one
        # This is difficult to test directly, so we'll mock the verification
        with patch("apps.accounts.views.verify_recovery_token") as mock_verify:
            mock_verify.side_effect = BadSignature("Token expired")

            response = self.client.post(
                self.recover_url,
                QUERY_STRING="token=expired.token.here",
            )

            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertIn("Invalid or expired", response.data["error"])

    @patch("apps.accounts.views.supabase_client.get_user_by_id")
    def test_recover_with_user_not_found(self, mock_get_user):
        """Test recovery when user doesn't exist returns 401 Unauthorized."""
        # Setup
        mock_get_user.side_effect = Exception("User not found")

        recovery_token = generate_recovery_token(uuid.UUID(self.user_id))

        # Execute
        response = self.client.post(
            self.recover_url,
            QUERY_STRING=f"token={recovery_token}",
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    @patch("apps.accounts.views.supabase_client.get_user_by_id")
    def test_recover_returns_correct_response_structure(self, mock_get_user):
        """Test that recovery response has the correct structure."""
        # Setup
        mock_get_user.return_value = {
            "id": self.user_id,
            "email": self.user_email,
            "user_metadata": {},
        }

        recovery_token = generate_recovery_token(uuid.UUID(self.user_id))

        # Execute
        response = self.client.post(
            self.recover_url,
            QUERY_STRING=f"token={recovery_token}",
        )

        # Assert response structure
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        required_fields = [
            "recovery_session_token",
            "user_id",
            "email",
            "message",
            "recovery_expires_in_seconds",
        ]
        for field in required_fields:
            self.assertIn(field, response.data, f"Missing field: {field}")

    @patch("apps.accounts.views.supabase_client.get_user_by_id")
    def test_recover_session_token_is_valid(self, mock_get_user):
        """Test that returned recovery session token can be verified."""
        from apps.core.utils.token import verify_recovery_session_token

        # Setup
        mock_get_user.return_value = {
            "id": self.user_id,
            "email": self.user_email,
            "user_metadata": {},
        }

        recovery_token = generate_recovery_token(uuid.UUID(self.user_id))

        # Execute
        response = self.client.post(
            self.recover_url,
            QUERY_STRING=f"token={recovery_token}",
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify the returned recovery session token is valid
        session_token = response.data["recovery_session_token"]
        session_payload = verify_recovery_session_token(session_token)

        self.assertEqual(session_payload["user_id"], self.user_id)
        self.assertTrue(session_payload.get("recovery_session"))
