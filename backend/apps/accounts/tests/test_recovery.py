"""Tests for account recovery endpoints."""

import uuid
from unittest.mock import patch, MagicMock

from django.core.signing import BadSignature
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.utils.token import (
    generate_recovery_token,
    verify_recovery_token,
    generate_recovery_session_token,
)


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


class ConfirmRecoveryTests(APITestCase):
    """Test suite for POST /api/auth/confirm-recovery endpoint."""

    def setUp(self):
        """Set up test fixtures."""
        self.user_id = str(uuid.uuid4())
        self.user_email = "testuser@example.com"
        self.confirm_recovery_url = reverse("confirm_recovery")
        self.valid_password = "SecurePass123"

    def _generate_valid_session_token(self):
        """Helper to generate a valid recovery session token."""
        return generate_recovery_session_token(uuid.UUID(self.user_id))

    def test_confirm_recovery_with_valid_token_and_password(self):
        """Test successful password reset and account recovery."""
        # Setup
        session_token = self._generate_valid_session_token()

        with patch("apps.accounts.views.supabase_client.client.auth.admin.update_user_by_id") as mock_update_password, \
             patch("apps.accounts.views.http_requests.put") as mock_put, \
             patch("apps.accounts.views.supabase_client.get_user_by_id") as mock_get_user:

            mock_update_password.return_value = None
            mock_put.return_value.raise_for_status = MagicMock()
            mock_get_user.return_value = {
                "id": self.user_id,
                "email": self.user_email,
                "user_metadata": {},
            }

            # Execute
            response = self.client.post(
                self.confirm_recovery_url,
                {
                    "recovery_session_token": session_token,
                    "new_password": self.valid_password,
                },
                format="json",
            )

            # Assert
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn("message", response.data)
            self.assertEqual(response.data["user_id"], self.user_id)
            self.assertEqual(response.data["email"], self.user_email)
            self.assertTrue(response.data["recovery_completed"])
            self.assertIn("log in with your new password", response.data["next_step"])

            # Verify password was updated
            mock_update_password.assert_called_once()
            call_args = mock_update_password.call_args
            self.assertEqual(call_args[0][0], self.user_id)
            self.assertEqual(call_args[0][1]["password"], self.valid_password)

            # Verify metadata was cleared
            mock_put.assert_called_once()

    def test_confirm_recovery_missing_recovery_token(self):
        """Test confirm recovery without recovery_session_token returns 400."""
        response = self.client.post(
            self.confirm_recovery_url,
            {
                "new_password": self.valid_password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertIn("recovery_session_token", response.data["error"])

    def test_confirm_recovery_missing_password(self):
        """Test confirm recovery without new_password returns 400."""
        session_token = self._generate_valid_session_token()

        response = self.client.post(
            self.confirm_recovery_url,
            {
                "recovery_session_token": session_token,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertIn("new_password", response.data["error"])

    def test_confirm_recovery_invalid_token(self):
        """Test confirm recovery with invalid token returns 401."""
        response = self.client.post(
            self.confirm_recovery_url,
            {
                "recovery_session_token": "invalid.token.here",
                "new_password": self.valid_password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("error", response.data)
        self.assertIn("Invalid or expired", response.data["error"])

    def test_confirm_recovery_expired_token(self):
        """Test confirm recovery with expired token returns 401."""
        with patch("apps.accounts.views.verify_recovery_session_token") as mock_verify:
            mock_verify.side_effect = BadSignature("Token expired")

            response = self.client.post(
                self.confirm_recovery_url,
                {
                    "recovery_session_token": "expired.token.here",
                    "new_password": self.valid_password,
                },
                format="json",
            )

            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertIn("Invalid or expired", response.data["error"])

    def test_confirm_recovery_weak_password_short(self):
        """Test confirm recovery with short password returns 422."""
        session_token = self._generate_valid_session_token()

        response = self.client.post(
            self.confirm_recovery_url,
            {
                "recovery_session_token": session_token,
                "new_password": "short1A",  # Only 7 chars
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertIn("error", response.data)
        self.assertIn("8 characters", response.data["error"])

    def test_confirm_recovery_weak_password_no_uppercase(self):
        """Test confirm recovery with password lacking uppercase returns 422."""
        session_token = self._generate_valid_session_token()

        response = self.client.post(
            self.confirm_recovery_url,
            {
                "recovery_session_token": session_token,
                "new_password": "lowercase123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertIn("error", response.data)
        self.assertIn("uppercase", response.data["error"])

    def test_confirm_recovery_weak_password_no_digit(self):
        """Test confirm recovery with password lacking digit returns 422."""
        session_token = self._generate_valid_session_token()

        response = self.client.post(
            self.confirm_recovery_url,
            {
                "recovery_session_token": session_token,
                "new_password": "NoDigitHere",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertIn("error", response.data)
        self.assertIn("digit", response.data["error"])

    def test_confirm_recovery_empty_password(self):
        """Test confirm recovery with empty password returns 400/422."""
        session_token = self._generate_valid_session_token()

        response = self.client.post(
            self.confirm_recovery_url,
            {
                "recovery_session_token": session_token,
                "new_password": "",
            },
            format="json",
        )

        # Either 400 or 422 is acceptable
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_422_UNPROCESSABLE_ENTITY])
        self.assertIn("error", response.data)

    @patch("apps.accounts.views.supabase_client.client.auth.admin.update_user_by_id")
    def test_confirm_recovery_password_update_failure(self, mock_update_password):
        """Test confirm recovery when password update fails returns 500."""
        session_token = self._generate_valid_session_token()
        mock_update_password.side_effect = Exception("Supabase error")

        response = self.client.post(
            self.confirm_recovery_url,
            {
                "recovery_session_token": session_token,
                "new_password": self.valid_password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("error", response.data)
        self.assertIn("Failed to update password", response.data["error"])

    def test_confirm_recovery_token_reuse_prevention(self):
        """Test that recovery token cannot be reused (one-time use)."""
        session_token = self._generate_valid_session_token()

        with patch("apps.accounts.views.supabase_client.client.auth.admin.update_user_by_id") as mock_update_password, \
             patch("apps.accounts.views.http_requests.put") as mock_put, \
             patch("apps.accounts.views.supabase_client.get_user_by_id") as mock_get_user:

            mock_update_password.return_value = None
            mock_put.return_value.raise_for_status = MagicMock()
            mock_get_user.return_value = {
                "id": self.user_id,
                "email": self.user_email,
                "user_metadata": {},
            }

            # First use should succeed
            response1 = self.client.post(
                self.confirm_recovery_url,
                {
                    "recovery_session_token": session_token,
                    "new_password": self.valid_password,
                },
                format="json",
            )
            self.assertEqual(response1.status_code, status.HTTP_200_OK)

            # Second use should fail (token marked as used)
            response2 = self.client.post(
                self.confirm_recovery_url,
                {
                    "recovery_session_token": session_token,
                    "new_password": self.valid_password,
                },
                format="json",
            )
            self.assertEqual(response2.status_code, status.HTTP_401_UNAUTHORIZED)
            self.assertIn("already been used", response2.data["error"])

    @patch("apps.accounts.views.http_requests.put")
    @patch("apps.accounts.views.supabase_client.client.auth.admin.update_user_by_id")
    def test_confirm_recovery_metadata_clear_failure(self, mock_update_password, mock_put):
        """Test confirm recovery when clearing metadata fails returns 500."""
        session_token = self._generate_valid_session_token()
        mock_update_password.return_value = None
        mock_put.side_effect = Exception("HTTP error")

        response = self.client.post(
            self.confirm_recovery_url,
            {
                "recovery_session_token": session_token,
                "new_password": self.valid_password,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("error", response.data)
        self.assertIn("Failed to unlock account", response.data["error"])

    def test_confirm_recovery_response_structure(self):
        """Test that confirm recovery response has correct structure."""
        session_token = self._generate_valid_session_token()

        with patch("apps.accounts.views.supabase_client.client.auth.admin.update_user_by_id") as mock_update_password, \
             patch("apps.accounts.views.http_requests.put") as mock_put, \
             patch("apps.accounts.views.supabase_client.get_user_by_id") as mock_get_user:

            mock_update_password.return_value = None
            mock_put.return_value.raise_for_status = MagicMock()
            mock_get_user.return_value = {
                "id": self.user_id,
                "email": self.user_email,
                "user_metadata": {},
            }

            response = self.client.post(
                self.confirm_recovery_url,
                {
                    "recovery_session_token": session_token,
                    "new_password": self.valid_password,
                },
                format="json",
            )

            # Assert response structure
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            required_fields = [
                "message",
                "user_id",
                "email",
                "recovery_completed",
                "next_step",
            ]
            for field in required_fields:
                self.assertIn(field, response.data, f"Missing field: {field}")
