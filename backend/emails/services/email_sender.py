import os
import uuid
import logging
from django.conf import settings
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives, get_connection
from django.core.files.base import ContentFile
from emails.models import EmailMessage, EmailAttachment

logger = logging.getLogger(__name__)


class EmailSenderService:
    """
    Modular email sending service supporting both live SMTP dispatch
    and local simulated Development Mode.
    """

    @classmethod
    def send_email(cls, user, to, subject, body_text='', body_html='', cc='', bcc='', files=None, thread_id='', in_reply_to=''):
        """
        Sends an email on behalf of user.
        to, cc, bcc can be strings (comma-separated) or lists.
        files is a list of UploadedFile objects or dicts with {filename, content, content_type}.
        """
        to_list = cls._normalize_recipients(to)
        cc_list = cls._normalize_recipients(cc)
        bcc_list = cls._normalize_recipients(bcc)

        if not to_list:
            raise ValueError("At least one recipient ('to') is required.")

        to_str = ', '.join(to_list)
        cc_str = ', '.join(cc_list)
        bcc_str = ', '.join(bcc_list)

        sender_email = user.email
        sender_name = user.display_name
        msg_id = f"<{uuid.uuid4()}@{cls._get_domain(sender_email)}>"
        resolved_thread_id = thread_id or in_reply_to or str(uuid.uuid4())

        # Determine if we should dispatch via real SMTP or Dev Mode
        has_smtp = cls._has_smtp_credentials(user)
        # Per-user live credentials always enable real SMTP dispatch
        use_live_smtp = has_smtp and (not settings.EMAIL_DEV_MODE or bool(user.smtp_password))

        dispatch_status = "sent"
        dispatch_error = None

        if use_live_smtp:
            try:
                connection = cls._get_smtp_connection(user)
                from_email = f'"{sender_name}" <{sender_email}>'

                mail = EmailMultiAlternatives(
                    subject=subject,
                    body=body_text or (body_html if not body_text else ''),
                    from_email=from_email,
                    to=to_list,
                    cc=cc_list if cc_list else None,
                    bcc=bcc_list if bcc_list else None,
                    connection=connection,
                    headers={
                        'Message-ID': msg_id,
                        'In-Reply-To': in_reply_to or '',
                        'References': in_reply_to or '',
                    }
                )

                if body_html:
                    mail.attach_alternative(body_html, "text/html")

                if files:
                    for f in files:
                        if hasattr(f, 'read'):
                            f.seek(0)
                            mail.attach(f.name, f.read(), getattr(f, 'content_type', 'application/octet-stream'))
                        elif isinstance(f, dict):
                            mail.attach(f.get('filename', 'attachment'), f.get('content', b''), f.get('content_type', 'application/octet-stream'))

                mail.send(fail_silently=False)
                logger.info(f"Email successfully sent via SMTP to {to_str} by {sender_email}")
            except Exception as e:
                logger.error(f"Failed to send email via SMTP: {e}")
                dispatch_error = str(e)
                # In development or demo, if live SMTP connection fails, fallback gracefully
                if not settings.DEBUG:
                    raise RuntimeError(f"SMTP Dispatch Error: {e}")

        # Always persist sent email into user's Sent folder
        sent_email = EmailMessage.objects.create(
            owner=user,
            sender_name=sender_name,
            sender_email=sender_email,
            recipient_emails=to_str,
            cc_emails=cc_str,
            bcc_emails=bcc_str,
            subject=subject,
            body_text=body_text,
            body_html=body_html or f"<p>{body_text.replace(chr(10), '<br>')}</p>",
            folder='sent',
            is_read=True,
            message_id=msg_id,
            thread_id=resolved_thread_id,
            in_reply_to=in_reply_to,
            sent_at=timezone.now(),
            received_at=timezone.now(),
        )

        # Attach uploaded files to the EmailAttachment model
        if files:
            for f in files:
                if hasattr(f, 'read'):
                    f.seek(0)
                    EmailAttachment.objects.create(
                        email=sent_email,
                        file=f,
                        filename=getattr(f, 'name', 'attachment'),
                        content_type=getattr(f, 'content_type', 'application/octet-stream'),
                        file_size=getattr(f, 'size', 0),
                    )
                elif isinstance(f, dict):
                    content = f.get('content', b'')
                    attachment = EmailAttachment(
                        email=sent_email,
                        filename=f.get('filename', 'attachment'),
                        content_type=f.get('content_type', 'application/octet-stream'),
                        file_size=len(content),
                    )
                    attachment.file.save(f.get('filename', 'attachment'), ContentFile(content))
                    attachment.save()

        # Internal Delivery: Deliver incoming copy to any registered recipient in MailFlow
        from django.contrib.auth import get_user_model
        UserModel = get_user_model()
        all_recipients = set(to_list + cc_list + bcc_list)
        delivered_count = 0

        for r_addr in all_recipients:
            r_user = UserModel.objects.filter(email__iexact=r_addr).first()
            if r_user:
                r_inbox = EmailMessage.objects.create(
                    owner=r_user,
                    sender_name=sender_name,
                    sender_email=sender_email,
                    recipient_emails=to_str,
                    cc_emails=cc_str,
                    bcc_emails=bcc_str,
                    subject=subject,
                    body_text=body_text,
                    body_html=body_html or f"<p>{body_text.replace(chr(10), '<br>')}</p>",
                    folder='inbox',
                    is_read=False,
                    message_id=msg_id,
                    thread_id=resolved_thread_id,
                    in_reply_to=in_reply_to,
                    sent_at=sent_email.sent_at,
                    received_at=timezone.now(),
                )
                # Copy attachments for recipient
                for att in sent_email.attachments.all():
                    if att.file:
                        EmailAttachment.objects.create(
                            email=r_inbox,
                            file=att.file,
                            filename=att.filename,
                            content_type=att.content_type,
                            file_size=att.file_size,
                        )
                delivered_count += 1

        has_external_recipients = delivered_count < len(all_recipients)
        dev_note = ""
        if not use_live_smtp and has_external_recipients:
            dev_note = " (Simulated: configure your Google App Password in Settings to deliver to real external email addresses)"

        mode_msg = "sent via live SMTP" if (use_live_smtp and not dispatch_error) else "recorded in Sent folder"
        extra_delivery = f" (delivered to {delivered_count} MailFlow inbox)" if delivered_count else ""
        return {
            "success": True,
            "message": f"Email {mode_msg}{extra_delivery}.{dev_note}",
            "mode": "live_smtp" if use_live_smtp else "development",
            "email_id": sent_email.id,
            "thread_id": sent_email.thread_id,
            "delivered_internal_count": delivered_count,
            "warning": dispatch_error or ("Enter your Google App Password in Settings to deliver to external inboxes." if (not use_live_smtp and has_external_recipients) else None)
        }

    @staticmethod
    def _normalize_recipients(recipients):
        if not recipients:
            return []
        if isinstance(recipients, list):
            res = []
            for r in recipients:
                if isinstance(r, str):
                    res.extend([email.strip() for email in r.split(',') if email.strip()])
            return res
        if isinstance(recipients, str):
            return [email.strip() for email in recipients.split(',') if email.strip()]
        return []

    @staticmethod
    def _get_domain(email):
        if '@' in email:
            return email.split('@')[-1]
        return 'mailflow.dev'

    @classmethod
    def _get_smtp_config(cls, user):
        """
        Auto-detects SMTP host, port, username, and password based on user's email domain
        and saved credentials.
        """
        email_addr = (user.email or '').lower().strip()
        if 'gmail.com' in email_addr:
            default_host = 'smtp.gmail.com'
            default_port = 587
            default_tls = True
        elif any(d in email_addr for d in ['outlook.com', 'hotmail.com', 'live.com', 'office365.com']):
            default_host = 'smtp.office365.com'
            default_port = 587
            default_tls = True
        elif 'yahoo.com' in email_addr:
            default_host = 'smtp.mail.yahoo.com'
            default_port = 587
            default_tls = True
        else:
            default_host = settings.EMAIL_HOST or ''
            default_port = settings.EMAIL_PORT or 587
            default_tls = settings.EMAIL_USE_TLS

        host = user.smtp_host or default_host
        port = user.smtp_port or default_port
        username = user.smtp_username or user.email or settings.EMAIL_HOST_USER
        password = user.smtp_password or settings.EMAIL_HOST_PASSWORD
        use_tls = user.smtp_use_tls if user.smtp_host else default_tls

        has_smtp = bool(host and username and password)
        return host, port, username, password, use_tls, has_smtp

    @classmethod
    def _has_smtp_credentials(cls, user):
        _, _, _, _, _, has_smtp = cls._get_smtp_config(user)
        return has_smtp

    @classmethod
    def _get_smtp_connection(cls, user):
        host, port, username, password, use_tls, _ = cls._get_smtp_config(user)
        return get_connection(
            backend='django.core.mail.backends.smtp.EmailBackend',
            host=host,
            port=int(port),
            username=username,
            password=password,
            use_tls=use_tls,
            fail_silently=False,
        )
