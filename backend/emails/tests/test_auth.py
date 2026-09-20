from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
        self.me_url = '/api/auth/me/'
        self.settings_url = '/api/auth/settings/'

    def test_user_registration_success(self):
        data = {
            "email": "testuser@mailflow.dev",
            "full_name": "Test User",
            "password": "StrongPassword123!",
            "confirm_password": "StrongPassword123!"
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertEqual(response.data['user']['email'], "testuser@mailflow.dev")

    def test_registration_password_mismatch(self):
        data = {
            "email": "mismatch@mailflow.dev",
            "full_name": "Mismatch User",
            "password": "Password123!",
            "confirm_password": "DifferentPassword123!"
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('confirm_password', response.data)

    def test_user_login_and_jwt_token(self):
        user = User.objects.create_user(
            email="login@mailflow.dev",
            password="ValidPassword123!",
            full_name="Login Tester"
        )
        data = {
            "email": "login@mailflow.dev",
            "password": "ValidPassword123!"
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], "login@mailflow.dev")

    def test_protected_profile_route(self):
        # Unauthenticated access should be rejected
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated access succeeds
        user = User.objects.create_user(
            email="profile@mailflow.dev",
            password="ValidPassword123!",
            full_name="Profile User"
        )
        self.client.force_authenticate(user=user)
        auth_response = self.client.get(self.me_url)
        self.assertEqual(auth_response.status_code, status.HTTP_200_OK)
        self.assertEqual(auth_response.data['email'], "profile@mailflow.dev")

    def test_user_settings_update(self):
        user = User.objects.create_user(
            email="settings@mailflow.dev",
            password="ValidPassword123!",
            full_name="Settings User"
        )
        self.client.force_authenticate(user=user)

        update_data = {
            "theme_preference": "dark",
            "emails_per_page": 50,
            "default_signature": "-- Custom Signature --",
            "smtp_host": "smtp.custom.io",
            "smtp_port": 465,
            "smtp_username": "user@custom.io",
            "smtp_password": "supersecretpassword",
        }
        response = self.client.put(self.settings_url, update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['theme_preference'], "dark")
        self.assertEqual(response.data['emails_per_page'], 50)
        self.assertTrue(response.data['has_smtp_password'])
        # Ensure raw password is NOT returned in response
        self.assertNotIn('smtp_password', response.data)
