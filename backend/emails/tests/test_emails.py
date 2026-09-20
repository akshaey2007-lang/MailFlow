from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from emails.models import EmailMessage, Draft, Label

User = get_user_model()


class EmailFunctionalityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="user1@mailflow.dev",
            password="Password123!",
            full_name="User One"
        )
        self.client.force_authenticate(user=self.user)

        # Create baseline emails
        self.email_inbox = EmailMessage.objects.create(
            owner=self.user,
            sender_name="Alice",
            sender_email="alice@example.com",
            recipient_emails=self.user.email,
            subject="Project Sync Meeting",
            body_text="Hey User One, let's sync up tomorrow.",
            folder='inbox',
            is_read=False,
            is_starred=False,
            is_important=False,
        )

        self.email_starred = EmailMessage.objects.create(
            owner=self.user,
            sender_name="Bob",
            sender_email="bob@example.com",
            recipient_emails=self.user.email,
            subject="Quarterly Bonus Announcement",
            body_text="Your performance was outstanding.",
            folder='inbox',
            is_read=True,
            is_starred=True,
            is_important=True,
        )

    def test_folder_counts(self):
        response = self.client.get('/api/emails/counts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['inbox'], 1)  # 1 unread inbox email
        self.assertEqual(response.data['starred'], 1)
        self.assertEqual(response.data['trash'], 0)

    def test_inbox_listing(self):
        response = self.client.get('/api/emails/inbox/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Results are paginated
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)

    def test_starred_listing(self):
        response = self.client.get('/api/emails/starred/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['subject'], "Quarterly Bonus Announcement")

    def test_send_email_development_mode(self):
        file_content = b"Simulated PDF receipt content"
        upload_file = SimpleUploadedFile("invoice.pdf", file_content, content_type="application/pdf")

        data = {
            "to": "client@business.com",
            "subject": "Invoice for Consulting Services",
            "body_text": "Please find attached the invoice.",
            "attachments": [upload_file]
        }
        response = self.client.post('/api/emails/send/', data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['mode'], 'development')

        # Verify sent email was persisted
        sent_email = EmailMessage.objects.filter(owner=self.user, folder='sent').first()
        self.assertIsNotNone(sent_email)
        self.assertEqual(sent_email.recipient_emails, "client@business.com")
        self.assertEqual(sent_email.attachments.count(), 1)
        self.assertEqual(sent_email.attachments.first().filename, "invoice.pdf")

    def test_email_actions(self):
        email_id = self.email_inbox.id

        # Mark read
        res = self.client.post(f'/api/emails/{email_id}/read/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.email_inbox.refresh_from_db()
        self.assertTrue(self.email_inbox.is_read)

        # Star
        res = self.client.post(f'/api/emails/{email_id}/star/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.email_inbox.refresh_from_db()
        self.assertTrue(self.email_inbox.is_starred)

        # Move to trash
        res = self.client.post(f'/api/emails/{email_id}/trash/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.email_inbox.refresh_from_db()
        self.assertEqual(self.email_inbox.folder, 'trash')
        self.assertTrue(self.email_inbox.is_deleted)

        # Restore from trash
        res = self.client.post(f'/api/emails/{email_id}/restore/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.email_inbox.refresh_from_db()
        self.assertEqual(self.email_inbox.folder, 'inbox')
        self.assertFalse(self.email_inbox.is_deleted)

    def test_empty_trash(self):
        # Create a trash email
        EmailMessage.objects.create(
            owner=self.user,
            sender_name="Spam Bot",
            sender_email="bot@trash.org",
            recipient_emails=self.user.email,
            subject="Spam to delete",
            folder='trash',
            is_deleted=True
        )
        res = self.client.post('/api/emails/empty-trash/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(EmailMessage.objects.filter(owner=self.user, folder='trash').count(), 0)

    def test_draft_lifecycle(self):
        # 1. Create Draft
        draft_data = {
            "to": "boss@company.com",
            "subject": "Vacation Request",
            "body": "I would like to request leave next Monday."
        }
        res = self.client.post('/api/drafts/', draft_data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        draft_id = res.data['id']

        # 2. Update Draft (Autosave simulation)
        update_data = {
            "to": "boss@company.com",
            "subject": "Vacation Request (Updated)",
            "body": "I would like to request leave next Monday and Tuesday."
        }
        res = self.client.put(f'/api/drafts/{draft_id}/', update_data)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['subject'], "Vacation Request (Updated)")

        # 3. Send Draft
        send_res = self.client.post(f'/api/drafts/{draft_id}/send/')
        self.assertEqual(send_res.status_code, status.HTTP_200_OK)
        # Draft should be deleted after sending
        self.assertFalse(Draft.objects.filter(id=draft_id).exists())
        # Sent email exists
        self.assertTrue(EmailMessage.objects.filter(owner=self.user, subject="Vacation Request (Updated)", folder='sent').exists())

    def test_label_creation_and_assignment(self):
        # Create Label
        res = self.client.post('/api/labels/', {"name": "Urgent Tasks", "color": "#EF4444"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        label_id = res.data['id']

        # Toggle label on email
        toggle_res = self.client.post(f'/api/emails/{self.email_inbox.id}/labels/{label_id}/')
        self.assertEqual(toggle_res.status_code, status.HTTP_200_OK)
        self.assertTrue(toggle_res.data['assigned'])
        self.assertTrue(self.email_inbox.labels.filter(id=label_id).exists())

        # Toggle again removes label
        toggle_res2 = self.client.post(f'/api/emails/{self.email_inbox.id}/labels/{label_id}/')
        self.assertEqual(toggle_res2.status_code, status.HTTP_200_OK)
        self.assertFalse(toggle_res2.data['assigned'])

    def test_search_and_filtering(self):
        # Search for 'Bonus'
        res = self.client.get('/api/emails/search/?q=Bonus')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], self.email_starred.id)

        # Filter by starred
        res = self.client.get('/api/emails/search/?is_starred=true')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 1)

    def test_bulk_actions(self):
        email_ids = [self.email_inbox.id, self.email_starred.id]
        data = {
            "email_ids": email_ids,
            "action": "trash"
        }
        res = self.client.post('/api/emails/bulk/', data)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(EmailMessage.objects.filter(owner=self.user, folder='trash').count(), 2)

    def test_internal_email_delivery_to_recipient_inbox(self):
        recipient = User.objects.create_user(
            email='incoming.recipient@mailflow.dev',
            password='Password123!',
            username='incoming.recipient@mailflow.dev'
        )
        data = {
            "to": "incoming.recipient@mailflow.dev",
            "subject": "Delivery Check",
            "body_text": "This should appear in recipient inbox."
        }
        res = self.client.post('/api/emails/send/', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(EmailMessage.objects.filter(owner=recipient, folder='inbox', subject='Delivery Check').count(), 1)

    def test_populate_inbox_endpoint(self):
        new_user = User.objects.create_user(
            email='newuser@example.com',
            password='Password123!',
            username='newuser@example.com'
        )
        self.client.force_authenticate(user=new_user)
        self.assertEqual(EmailMessage.objects.filter(owner=new_user).count(), 0)
        res = self.client.post('/api/emails/populate-inbox/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreater(EmailMessage.objects.filter(owner=new_user, folder='inbox').count(), 0)

