from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from emails.models import EmailMessage, Draft, Label

User = get_user_model()


class TenantIsolationTests(TestCase):
    """
    Rigorously verifies that multi-tenant security isolation is strictly enforced.
    User A can NEVER access, read, update, delete, or search User B's data.
    """

    def setUp(self):
        # Create User A
        self.user_a = User.objects.create_user(
            email="usera@mailflow.dev",
            password="PasswordA123!",
            full_name="User Alpha"
        )
        # Create User B
        self.user_b = User.objects.create_user(
            email="userb@mailflow.dev",
            password="PasswordB123!",
            full_name="User Beta"
        )

        # Create emails for User B
        self.user_b_email = EmailMessage.objects.create(
            owner=self.user_b,
            sender_name="Confidential Sender",
            sender_email="topsecret@partner.com",
            recipient_emails=self.user_b.email,
            subject="CONFIDENTIAL: Q4 Financial Ledger",
            body_text="User B's secret revenue data: $5,000,000.",
            folder='inbox',
            is_read=False,
            is_starred=True,
        )

        # Create draft for User B
        self.user_b_draft = Draft.objects.create(
            owner=self.user_b,
            to="ceo@partner.com",
            subject="Private Draft from User B",
            body="User B confidential notes.",
        )

        # Create label for User B
        self.user_b_label = Label.objects.create(
            owner=self.user_b,
            name="Confidential Label",
            color="#FF0000"
        )

        # Client authenticated as User A
        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.user_a)

    def test_user_a_cannot_read_user_b_email_detail(self):
        """User A attempting to GET User B's email must receive 404 Not Found."""
        response = self.client_a.get(f'/api/emails/{self.user_b_email.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_a_cannot_list_user_b_emails_in_inbox(self):
        """User A's inbox listing must NOT include User B's emails."""
        response = self.client_a.get('/api/emails/inbox/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

    def test_user_a_cannot_modify_user_b_email_actions(self):
        """User A attempting action on User B's email must receive 404."""
        # Star action
        res = self.client_a.post(f'/api/emails/{self.user_b_email.id}/star/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Trash action
        res = self.client_a.post(f'/api/emails/{self.user_b_email.id}/trash/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Read action
        res = self.client_a.post(f'/api/emails/{self.user_b_email.id}/read/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # Verify User B's email was not altered
        self.user_b_email.refresh_from_db()
        self.assertFalse(self.user_b_email.is_read)
        self.assertTrue(self.user_b_email.is_starred)
        self.assertEqual(self.user_b_email.folder, 'inbox')

    def test_user_a_cannot_delete_user_b_email(self):
        """User A attempting DELETE on User B's email must receive 404."""
        response = self.client_a.delete(f'/api/emails/{self.user_b_email.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(EmailMessage.objects.filter(id=self.user_b_email.id).exists())

    def test_user_a_cannot_view_or_edit_user_b_drafts(self):
        """User A cannot list, view, update, delete or send User B's drafts."""
        # List drafts
        list_res = self.client_a.get('/api/drafts/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        results = list_res.data.get('results', list_res.data)
        self.assertEqual(len(results), 0)

        # Retrieve draft
        get_res = self.client_a.get(f'/api/drafts/{self.user_b_draft.id}/')
        self.assertEqual(get_res.status_code, status.HTTP_404_NOT_FOUND)

        # Update draft
        put_res = self.client_a.put(f'/api/drafts/{self.user_b_draft.id}/', {"subject": "Hacked"})
        self.assertEqual(put_res.status_code, status.HTTP_404_NOT_FOUND)

        # Send draft
        send_res = self.client_a.post(f'/api/drafts/{self.user_b_draft.id}/send/')
        self.assertEqual(send_res.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_a_cannot_view_or_use_user_b_labels(self):
        """User A cannot view or attach User B's labels."""
        # List labels
        list_res = self.client_a.get('/api/labels/')
        results = list_res.data.get('results', list_res.data) if isinstance(list_res.data, dict) else list_res.data
        self.assertEqual(len(results), 0)

        # Get label
        get_res = self.client_a.get(f'/api/labels/{self.user_b_label.id}/')
        self.assertEqual(get_res.status_code, status.HTTP_404_NOT_FOUND)

    def test_search_never_leaks_user_b_emails(self):
        """User A searching for confidential keywords in User B's email gets zero results."""
        res = self.client_a.get('/api/emails/search/?q=revenue')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 0)

        res2 = self.client_a.get('/api/emails/search/?q=Financial')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        results2 = res2.data.get('results', res2.data)
        self.assertEqual(len(results2), 0)

    def test_bulk_actions_never_affect_user_b_emails(self):
        """User A specifying User B's email IDs in bulk action must not affect them."""
        data = {
            "email_ids": [self.user_b_email.id],
            "action": "trash"
        }
        res = self.client_a.post('/api/emails/bulk/', data)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 0)  # zero modified

        self.user_b_email.refresh_from_db()
        self.assertEqual(self.user_b_email.folder, 'inbox')
        self.assertFalse(self.user_b_email.is_deleted)
