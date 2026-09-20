import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Label(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='labels'
    )
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=50, default='#4F46E5')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['owner', 'name'], name='unique_owner_label')
        ]

    def __str__(self):
        return f"{self.name} ({self.owner.email})"


class EmailMessage(models.Model):
    FOLDER_CHOICES = [
        ('inbox', 'Inbox'),
        ('sent', 'Sent'),
        ('drafts', 'Drafts'),
        ('trash', 'Trash'),
        ('spam', 'Spam'),
        ('archive', 'Archive'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='emails'
    )
    provider_uid = models.CharField(max_length=255, blank=True, default='', db_index=True)
    message_id = models.CharField(max_length=500, blank=True, default='', db_index=True)
    thread_id = models.CharField(max_length=255, blank=True, default='', db_index=True)
    in_reply_to = models.CharField(max_length=500, blank=True, default='')

    sender_name = models.CharField(max_length=255, blank=True, default='')
    sender_email = models.EmailField(max_length=255)
    recipient_emails = models.TextField(help_text="Comma-separated or JSON list of recipient emails")
    cc_emails = models.TextField(blank=True, default='')
    bcc_emails = models.TextField(blank=True, default='')

    subject = models.CharField(max_length=500, blank=True, default='')
    body_text = models.TextField(blank=True, default='')
    body_html = models.TextField(blank=True, default='')

    folder = models.CharField(max_length=20, choices=FOLDER_CHOICES, default='inbox', db_index=True)
    previous_folder = models.CharField(max_length=20, default='inbox', blank=True)

    is_read = models.BooleanField(default=False, db_index=True)
    is_starred = models.BooleanField(default=False, db_index=True)
    is_important = models.BooleanField(default=False, db_index=True)
    is_spam = models.BooleanField(default=False, db_index=True)
    is_deleted = models.BooleanField(default=False, db_index=True)

    labels = models.ManyToManyField(Label, related_name='emails', blank=True)

    received_at = models.DateTimeField(null=True, blank=True, db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-received_at', '-created_at']
        indexes = [
            models.Index(fields=['owner', 'folder']),
            models.Index(fields=['owner', 'is_starred']),
            models.Index(fields=['owner', 'is_important']),
            models.Index(fields=['owner', 'is_read']),
            models.Index(fields=['owner', 'thread_id']),
        ]

    def __str__(self):
        return f"{self.subject or '(No Subject)'} - {self.sender_email} to {self.owner.email}"

    def save(self, *args, **kwargs):
        if not self.received_at and self.folder == 'inbox':
            self.received_at = timezone.now()
        if not self.thread_id:
            # Generate deterministic thread id or fallback to UUID
            self.thread_id = self.in_reply_to or str(uuid.uuid4())
        super().save(*args, **kwargs)

    @property
    def snippet(self):
        """Returns a clean plain text preview of the message."""
        content = self.body_text
        if not content and self.body_html:
            import re
            content = re.sub(r'<[^>]*>', ' ', self.body_html)
        preview = ' '.join(content.split())[:160]
        return preview or '(No preview available)'


class EmailAttachment(models.Model):
    email = models.ForeignKey(
        EmailMessage,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(upload_to='attachments/%Y/%m/%d/')
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=150, blank=True, default='')
    file_size = models.PositiveIntegerField(default=0)  # in bytes
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.filename} ({self.file_size} bytes)"


class Draft(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='drafts'
    )
    to = models.TextField(blank=True, default='')
    cc = models.TextField(blank=True, default='')
    bcc = models.TextField(blank=True, default='')
    subject = models.CharField(max_length=500, blank=True, default='')
    body = models.TextField(blank=True, default='')
    thread_id = models.CharField(max_length=255, blank=True, default='')
    in_reply_to = models.CharField(max_length=500, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Draft: {self.subject or '(Untitled)'} by {self.owner.email}"
