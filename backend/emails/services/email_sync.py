import imaplib
import email
from email.header import decode_header
import re
import uuid
import logging
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from django.core.files.base import ContentFile
from emails.models import EmailMessage, EmailAttachment

logger = logging.getLogger(__name__)


class EmailSyncService:
    """
    IMAP Email Synchronization service with deduplication,
    threading detection, and realistic demo sync fallback.
    """

    @classmethod
    def sync_inbox(cls, user):
        """
        Synchronizes inbox emails for the given user.
        If user or system has valid IMAP credentials, it connects to IMAP.
        Otherwise, it runs in demo sync mode.
        """
        has_imap = cls._has_imap_credentials(user)

        if has_imap:
            try:
                return cls._sync_via_imap(user)
            except Exception as e:
                logger.warning(f"IMAP connection failed for {user.email}: {e}. Falling back to demo sync.")
                return cls._sync_demo_fallback(user, warning=f"IMAP Server Error: {str(e)}")

        return cls._sync_demo_fallback(user)

    @classmethod
    def _get_imap_config(cls, user):
        """
        Auto-detects IMAP host, port, and security based on user's email domain
        if user-specific host is not explicitly specified.
        """
        email_addr = (user.email or '').lower().strip()
        password = user.imap_password or settings.IMAP_PASSWORD

        if 'gmail.com' in email_addr:
            default_host = 'imap.gmail.com'
            default_port = 993
            default_ssl = True
        elif any(domain in email_addr for domain in ['outlook.com', 'hotmail.com', 'live.com', 'office365.com']):
            default_host = 'outlook.office365.com'
            default_port = 993
            default_ssl = True
        elif 'yahoo.com' in email_addr:
            default_host = 'imap.mail.yahoo.com'
            default_port = 993
            default_ssl = True
        elif 'icloud.com' in email_addr or 'me.com' in email_addr:
            default_host = 'imap.mail.me.com'
            default_port = 993
            default_ssl = True
        else:
            default_host = settings.IMAP_HOST or ''
            default_port = settings.IMAP_PORT or 993
            default_ssl = settings.IMAP_USE_SSL

        host = user.imap_host or default_host
        port = user.imap_port or default_port
        username = user.imap_username or user.email or settings.IMAP_USER
        use_ssl = user.imap_use_ssl if user.imap_host else default_ssl

        is_configured = bool(host and username and password)
        return host, port, username, password, use_ssl, is_configured

    @classmethod
    def _has_imap_credentials(cls, user):
        _, _, _, _, _, is_configured = cls._get_imap_config(user)
        return is_configured

    @classmethod
    def _sync_via_imap(cls, user):
        host, port, username, password, use_ssl, _ = cls._get_imap_config(user)

        if use_ssl:
            mail = imaplib.IMAP4_SSL(host, int(port))
        else:
            mail = imaplib.IMAP4(host, int(port))

        mail.login(username, password)
        mail.select('INBOX', readonly=True)

        # Search for all messages or recent messages
        status, messages = mail.search(None, 'ALL')
        if status != 'OK':
            mail.logout()
            return {"success": True, "count": 0, "message": "Inbox is empty."}

        email_ids = messages[0].split()
        synced_count = 0

        # Process the most recent 50 emails to maintain fast sync
        for eid in email_ids[-50:]:
            uid_str = eid.decode() if isinstance(eid, bytes) else str(eid)

            # Check if we already have this UID for this user
            if EmailMessage.objects.filter(owner=user, provider_uid=uid_str).exists():
                continue

            res, msg_data = mail.fetch(eid, '(RFC822)')
            if res != 'OK':
                continue

            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)

            msg_id = cls._clean_header(msg.get('Message-ID', ''))
            if msg_id and EmailMessage.objects.filter(owner=user, message_id=msg_id).exists():
                continue

            parsed = cls._parse_email_message(msg)

            # Deduce threading
            in_reply_to = parsed.get('in_reply_to', '')
            thread_id = in_reply_to
            if not thread_id and msg.get('References'):
                refs = msg.get('References').split()
                if refs:
                    thread_id = refs[0].strip('<>')

            if not thread_id:
                thread_id = str(uuid.uuid4())

            email_obj = EmailMessage.objects.create(
                owner=user,
                provider_uid=uid_str,
                message_id=msg_id or f"<{uuid.uuid4()}@{host}>",
                thread_id=thread_id,
                in_reply_to=in_reply_to,
                sender_name=parsed['from_name'],
                sender_email=parsed['from_email'],
                recipient_emails=parsed['to'],
                cc_emails=parsed['cc'],
                bcc_emails=parsed['bcc'],
                subject=parsed['subject'],
                body_text=parsed['body_text'],
                body_html=parsed['body_html'],
                folder='inbox',
                is_read=False,
                received_at=parsed['date'] or timezone.now(),
            )

            # Save attachments
            for att in parsed['attachments']:
                attachment = EmailAttachment(
                    email=email_obj,
                    filename=att['filename'],
                    content_type=att['content_type'],
                    file_size=len(att['content']),
                )
                attachment.file.save(att['filename'], ContentFile(att['content']))
                attachment.save()

            synced_count += 1

        mail.close()
        mail.logout()

        return {
            "success": True,
            "count": synced_count,
            "mode": "imap",
            "message": f"Successfully synchronized {synced_count} new messages from IMAP."
        }

    @classmethod
    def _parse_email_message(cls, msg):
        subject = cls._decode_mime_header(msg.get('Subject', ''))
        from_header = msg.get('From', '')
        from_name, from_email = cls._parse_address(from_header)

        to_header = msg.get('To', '')
        cc_header = msg.get('Cc', '')
        bcc_header = msg.get('Bcc', '')

        date_tuple = email.utils.parsedate_tz(msg.get('Date'))
        date_obj = None
        if date_tuple:
            timestamp = email.utils.mktime_tz(date_tuple)
            date_obj = datetime.fromtimestamp(timestamp, tz=timezone.utc)

        body_text = ""
        body_html = ""
        attachments = []

        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))

                if "attachment" in content_disposition:
                    filename = part.get_filename()
                    if filename:
                        filename = cls._decode_mime_header(filename)
                        payload = part.get_payload(decode=True)
                        if payload:
                            attachments.append({
                                'filename': filename,
                                'content': payload,
                                'content_type': content_type,
                            })
                elif content_type == "text/plain" and "attachment" not in content_disposition:
                    charset = part.get_content_charset() or 'utf-8'
                    try:
                        body_text = part.get_payload(decode=True).decode(charset, errors='replace')
                    except Exception:
                        pass
                elif content_type == "text/html" and "attachment" not in content_disposition:
                    charset = part.get_content_charset() or 'utf-8'
                    try:
                        body_html = part.get_payload(decode=True).decode(charset, errors='replace')
                    except Exception:
                        pass
        else:
            charset = msg.get_content_charset() or 'utf-8'
            content_type = msg.get_content_type()
            payload = msg.get_payload(decode=True)
            if payload:
                text = payload.decode(charset, errors='replace')
                if content_type == 'text/html':
                    body_html = text
                else:
                    body_text = text

        return {
            'subject': subject or '(No Subject)',
            'from_name': from_name,
            'from_email': from_email,
            'to': to_header,
            'cc': cc_header,
            'bcc': bcc_header,
            'body_text': body_text,
            'body_html': body_html,
            'date': date_obj,
            'attachments': attachments,
            'in_reply_to': cls._clean_header(msg.get('In-Reply-To', ''))
        }

    @staticmethod
    def _decode_mime_header(header_value):
        if not header_value:
            return ""
        decoded_parts = decode_header(header_value)
        result = []
        for part, encoding in decoded_parts:
            if isinstance(part, bytes):
                result.append(part.decode(encoding or 'utf-8', errors='replace'))
            else:
                result.append(str(part))
        return "".join(result)

    @classmethod
    def _parse_address(cls, header_val):
        realname, email_addr = email.utils.parseaddr(header_val)
        return cls._decode_mime_header(realname), email_addr

    @staticmethod
    def _clean_header(val):
        return val.strip().strip('<>') if val else ''

    @classmethod
    def _sync_demo_fallback(cls, user, warning=None):
        """
        Demo mode synchronization: checks if simulated incoming updates can be added,
        giving the user an immediate, realistic sync experience.
        If the user has no emails at all, it seeds rich initial emails.
        """
        from emails.services.demo_seeder import seed_user_data

        existing_count = EmailMessage.objects.filter(owner=user, folder='inbox').count()

        # If user has 0 emails, auto-seed rich demo data personalized to their email
        if existing_count == 0:
            stats = seed_user_data(user, reset=False)
            new_inbox_count = EmailMessage.objects.filter(owner=user, folder='inbox').count()
            return {
                "success": True,
                "count": new_inbox_count,
                "mode": "demo_sync",
                "message": f"Inbox initialized with {new_inbox_count} messages addressed to {user.email}.",
                "warning": warning or "Tip: Enter your Google App Password in Settings > Outgoing & Incoming Mail to sync live external emails."
            }

        user_name = user.display_name or user.email.split('@')[0].capitalize()

        # Rich pool of incoming messages to simulate realistic incoming traffic
        sample_senders = [
            ("DevOps Team", "devops@mailflow.dev", "Deployment Pipeline: All tests passed on main", "The latest CI/CD workflow run has completed successfully. All automated security scans and unit tests are green."),
            ("Product Management", "sarah.pm@techcorp.io", "Sprint Review & MailFlow Q3 Roadmap", "Hi team,\n\nPlease find attached the sprint review notes. MailFlow 2.0 release is slated for next month.\n\nBest,\nSarah"),
            ("Campus Placement Office", "placements@university.edu", "Campus Interview Schedule Confirmation", f"Dear {user_name},\n\nYour interview slot with Google Engineering has been scheduled for this Thursday at 10:00 AM IST.\n\nPlease arrive 10 minutes early."),
            ("GitHub Security", "security@github.com", "Security Advisory: Dependabot alert resolved", f"Hi {user_name},\n\nDependabot alert #42 for your repository has been successfully closed after updating dependencies."),
            ("Engineering Lead", "marcus.lead@techcorp.io", "Architecture Discussion Follow-up", f"Hi {user_name},\n\nGreat job on optimizing the email synchronization throughput. Let's review the memory benchmarks tomorrow morning."),
            ("University Alumni Network", "alumni@university.edu", "Invitation: Annual Tech Leadership Summit", f"Dear {user_name},\n\nYou are cordially invited to attend the Annual Tech Leadership Summit next Saturday."),
        ]

        synced_count = 0
        for name, from_addr, subj, body in sample_senders:
            if not EmailMessage.objects.filter(owner=user, subject=subj).exists():
                EmailMessage.objects.create(
                    owner=user,
                    sender_name=name,
                    sender_email=from_addr,
                    recipient_emails=user.email,
                    subject=subj,
                    body_text=body,
                    body_html=f"<p>{body.replace(chr(10), '<br>')}</p>",
                    folder='inbox',
                    is_read=False,
                    received_at=timezone.now(),
                    message_id=f"<{uuid.uuid4()}@mailflow.dev>",
                    thread_id=str(uuid.uuid4()),
                )
                synced_count += 1
                break

        # If all predefined samples exist, generate a dynamic fresh incoming message
        if synced_count == 0:
            dynamic_id = uuid.uuid4().hex[:6]
            subj = f"Automated Health & Status Check #{dynamic_id}"
            body = f"Hello {user_name},\n\nAll services operating at 100% efficiency. Database queries responsive and background workers healthy.\n\nTimestamp: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}"
            EmailMessage.objects.create(
                owner=user,
                sender_name="MailFlow System Monitor",
                sender_email="monitor@mailflow.dev",
                recipient_emails=user.email,
                subject=subj,
                body_text=body,
                body_html=f"<p>{body.replace(chr(10), '<br>')}</p>",
                folder='inbox',
                is_read=False,
                received_at=timezone.now(),
                message_id=f"<{uuid.uuid4()}@mailflow.dev>",
                thread_id=str(uuid.uuid4()),
            )
            synced_count = 1

        msg_text = f"Synchronized {synced_count} new incoming message to {user.email}."
        return {
            "success": True,
            "count": synced_count,
            "mode": "demo_sync",
            "message": msg_text,
            "warning": warning or "Tip: Enter your Google App Password in Settings to sync live emails from Gmail."
        }
