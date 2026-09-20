from django.utils import timezone
from django.core.files.base import ContentFile
from datetime import timedelta
import uuid
from emails.models import EmailMessage, EmailAttachment, Draft, Label


def seed_user_data(user, reset=False):
    """
    Seeds rich, realistic demo emails, threads, labels, and attachments
    tailored specifically to the provided user's email address and name.
    """
    if reset:
        EmailMessage.objects.filter(owner=user).delete()
        Draft.objects.filter(owner=user).delete()
        Label.objects.filter(owner=user).delete()

    user_email = user.email
    user_name = user.display_name or user_email.split('@')[0].capitalize()

    # 1. Labels
    labels_data = [
        ("Projects", "#4F46E5"),
        ("Placement", "#059669"),
        ("College", "#D97706"),
        ("Recruiting", "#DB2777"),
        ("Urgent", "#DC2626"),
        ("Personal", "#7C3AED"),
    ]
    created_labels = {}
    for name, color in labels_data:
        lbl, _ = Label.objects.get_or_create(owner=user, name=name, defaults={'color': color})
        created_labels[name] = lbl

    now = timezone.now()

    sample_pdf_bytes = b"%PDF-1.4 ... MailFlow Demo Document Content ...\nEvaluation details and candidate scoring sheet.\n"
    sample_txt_bytes = b"MailFlow System Architecture:\n- Python/Django REST Framework backend\n- Multi-tenant isolated queries\n- SMTP dispatch & IMAP sync engine\n"
    sample_png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"

    # 2. Threaded Conversation (Capstone Review)
    thread_id = str(uuid.uuid4())
    msg1_id = f"<{uuid.uuid4()}@cs.university.edu>"
    msg2_id = f"<{uuid.uuid4()}@mailflow.dev>"
    msg3_id = f"<{uuid.uuid4()}@cs.university.edu>"

    # Msg 1 in thread (Inbox)
    t_msg1 = EmailMessage.objects.create(
        owner=user,
        sender_name="Dr. Aris Thorne",
        sender_email="a.thorne@cs.university.edu",
        recipient_emails=user_email,
        subject="Capstone Project Architecture Review & Milestone Feedback",
        body_text=f"Hi {user_name},\n\nI reviewed your architectural proposal for the MailFlow distributed email engine. The decoupled services for SMTP dispatch and IMAP background synchronization are well thought out.\n\nPlease check the attached architecture evaluation document. When can we schedule a 15-minute sync?\n\nRegards,\nDr. Thorne\nDepartment of Computer Science",
        body_html=f"<p>Hi {user_name},</p><p>I reviewed your architectural proposal for the <strong>MailFlow</strong> distributed email engine. The decoupled services for SMTP dispatch and IMAP background synchronization are well thought out.</p><p>Please check the attached architecture evaluation document. When can we schedule a 15-minute sync?</p><p>Regards,<br><strong>Dr. Thorne</strong><br>Department of Computer Science</p>",
        folder='inbox',
        is_read=True,
        is_starred=True,
        is_important=True,
        received_at=now - timedelta(days=2, hours=3),
        message_id=msg1_id,
        thread_id=thread_id,
    )
    t_msg1.labels.add(created_labels["College"], created_labels["Projects"])

    att1 = EmailAttachment(
        email=t_msg1,
        filename="Architecture_Evaluation_v1.2.pdf",
        content_type="application/pdf",
        file_size=len(sample_pdf_bytes)
    )
    att1.file.save("Architecture_Evaluation_v1.2.pdf", ContentFile(sample_pdf_bytes))
    att1.save()

    # Msg 2 in thread (Sent by user)
    EmailMessage.objects.create(
        owner=user,
        sender_name=user_name,
        sender_email=user_email,
        recipient_emails="a.thorne@cs.university.edu",
        subject="Re: Capstone Project Architecture Review & Milestone Feedback",
        body_text=f"Dear Dr. Thorne,\n\nThank you for the constructive feedback! I have incorporated the database connection pooling recommendations and added the tenant isolation tests.\n\nI am available tomorrow at 2:00 PM or Thursday morning.\n\nBest,\n{user_name}",
        body_html=f"<p>Dear Dr. Thorne,</p><p>Thank you for the constructive feedback! I have incorporated the database connection pooling recommendations and added the tenant isolation tests.</p><p>I am available tomorrow at 2:00 PM or Thursday morning.</p><p>Best,<br>{user_name}</p>",
        folder='sent',
        is_read=True,
        received_at=now - timedelta(days=1, hours=20),
        sent_at=now - timedelta(days=1, hours=20),
        message_id=msg2_id,
        thread_id=thread_id,
        in_reply_to=msg1_id,
    )

    # Msg 3 in thread (Reply from Dr. Thorne)
    t_msg3 = EmailMessage.objects.create(
        owner=user,
        sender_name="Dr. Aris Thorne",
        sender_email="a.thorne@cs.university.edu",
        recipient_emails=user_email,
        subject="Re: Capstone Project Architecture Review & Milestone Feedback",
        body_text="Tomorrow at 2:00 PM works perfectly. Let us meet in Lab 402.\n\nBest,\nDr. Thorne",
        body_html="<p>Tomorrow at 2:00 PM works perfectly. Let us meet in Lab 402.</p><p>Best,<br>Dr. Thorne</p>",
        folder='inbox',
        is_read=False,
        is_starred=True,
        received_at=now - timedelta(hours=4),
        message_id=msg3_id,
        thread_id=thread_id,
        in_reply_to=msg2_id,
    )
    t_msg3.labels.add(created_labels["College"], created_labels["Urgent"])

    # 3. Realistic Inbox Emails
    inbox_items = [
        {
            "sender_name": "University Career Center",
            "sender_email": "placements@university.edu",
            "subject": "Interview Invitation: Google Cloud SWE Campus Drive",
            "body_text": f"Dear {user_name},\n\nCongratulations! You have been shortlisted for the final round interviews for the Google Cloud Software Engineer role.\n\nDate: Thursday, Oct 24th\nFormat: 2x 45 min Systems & Coding rounds\nLocation: Virtual (Google Meet link enclosed in calendar invite)\n\nPlease confirm your availability by replying to this email.\n\nWarm regards,\nPlacement Directorate",
            "body_html": f"<p>Dear {user_name},</p><p>Congratulations! You have been shortlisted for the final round interviews for the <strong>Google Cloud Software Engineer</strong> role.</p><p><strong>Date:</strong> Thursday, Oct 24th<br><strong>Format:</strong> 2x 45 min Systems & Coding rounds<br><strong>Location:</strong> Virtual</p><p>Please confirm your availability by replying to this email.</p><p>Warm regards,<br>Placement Directorate</p>",
            "is_starred": True,
            "is_important": True,
            "is_read": False,
            "time_delta": timedelta(hours=1, minutes=15),
            "labels": ["Placement", "Urgent"],
            "attachment": ("Google_Campus_Prep_Kit.pdf", "application/pdf", sample_pdf_bytes),
        },
        {
            "sender_name": "Elena Rostova",
            "sender_email": "elena.tech@github.com",
            "subject": "PR #108: Fast IMAP batch synchronization with zero duplicate overhead",
            "body_text": f"Hi {user_name},\n\nI reviewed your latest pull request. The deduplication logic using Message-ID and UID ranges is blazingly fast.\n\nApproved! Feel free to merge when ready.\n\nElena",
            "body_html": f"<p>Hi {user_name},</p><p>I reviewed your latest pull request. The deduplication logic using <code>Message-ID</code> and UID ranges is blazingly fast.</p><p><strong>Approved!</strong> Feel free to merge when ready.</p><p>Elena</p>",
            "is_starred": False,
            "is_important": True,
            "is_read": True,
            "time_delta": timedelta(hours=8),
            "labels": ["Projects"],
        },
        {
            "sender_name": "Marcus Vance",
            "sender_email": "marcus.v@innovatetech.co",
            "subject": "Exciting Lead Full-Stack Opportunity - InnovateTech",
            "body_text": f"{user_name},\n\nI came across your GitHub repositories and was thoroughly impressed by your MailFlow email management project.\n\nWe are building next-generation communications infrastructure and would love to chat with you about an open role.\n\nBest,\nMarcus Vance\nTalent Partner",
            "body_html": f"<p>{user_name},</p><p>I came across your GitHub repositories and was thoroughly impressed by your <strong>MailFlow</strong> email management project.</p><p>We are building next-generation communications infrastructure and would love to chat with you about an open role.</p><p>Best,<br><strong>Marcus Vance</strong><br>Talent Partner</p>",
            "is_starred": True,
            "is_important": False,
            "is_read": False,
            "time_delta": timedelta(days=1, hours=4),
            "labels": ["Recruiting"],
        },
        {
            "sender_name": "LeetCode Weekly",
            "sender_email": "contest@leetcode.com",
            "subject": "Weekly Contest 412 Rankings & Editorial Discussion",
            "body_text": "Your contest rating has updated! You ranked in the top 3% among 24,000 participants in Weekly Contest 412. Check out the problem analysis and discussion thread.",
            "body_html": "<p>Your contest rating has updated! You ranked in the <strong>top 3%</strong> among 24,000 participants in Weekly Contest 412. Check out the problem analysis and discussion thread.</p>",
            "is_starred": False,
            "is_important": False,
            "is_read": True,
            "time_delta": timedelta(days=3),
            "labels": ["Personal"],
        },
        {
            "sender_name": "AWS Billing Alerts",
            "sender_email": "no-reply@amazon.com",
            "subject": "AWS Budget Alert: Actual Spend Notification ($4.20 / $10.00)",
            "body_text": "You are receiving this alert because your current actual spend for AWS Cloud Services has reached 42% of your monthly forecasted limit.",
            "body_html": "<p>You are receiving this alert because your current actual spend for AWS Cloud Services has reached <strong>42%</strong> of your monthly forecasted limit.</p>",
            "is_starred": False,
            "is_important": True,
            "is_read": False,
            "time_delta": timedelta(days=4),
            "labels": ["Projects"],
        },
    ]

    for item in inbox_items:
        e = EmailMessage.objects.create(
            owner=user,
            sender_name=item['sender_name'],
            sender_email=item['sender_email'],
            recipient_emails=user_email,
            subject=item['subject'],
            body_text=item['body_text'],
            body_html=item['body_html'],
            folder='inbox',
            is_read=item['is_read'],
            is_starred=item['is_starred'],
            is_important=item['is_important'],
            received_at=now - item['time_delta'],
            message_id=f"<{uuid.uuid4()}@mailflow.dev>",
            thread_id=str(uuid.uuid4()),
        )
        for lbl_name in item.get('labels', []):
            if lbl_name in created_labels:
                e.labels.add(created_labels[lbl_name])

        if 'attachment' in item:
            fname, ctype, content = item['attachment']
            att = EmailAttachment(
                email=e,
                filename=fname,
                content_type=ctype,
                file_size=len(content)
            )
            att.file.save(fname, ContentFile(content))
            att.save()

    # 4. Sent Items
    sent_items = [
        {
            "to": "hiring.manager@cloudtech.com",
            "subject": f"{user_name} — Application for Senior Systems Engineer",
            "body": f"Dear Hiring Team,\n\nPlease find attached my resume and portfolio for the Senior Systems Engineer position. I look forward to hearing from you.\n\nBest regards,\n{user_name}",
            "time_delta": timedelta(days=1, hours=10),
            "attachment": (f"{user_name.replace(' ', '_')}_Resume_2025.pdf", "application/pdf", sample_pdf_bytes),
        },
        {
            "to": "team@startuphub.io",
            "subject": "MailFlow API Documentation & Architecture Overview",
            "body": f"Hey folks,\n\nSharing the complete OpenAPI spec and documentation for MailFlow. Let me know if you encounter any edge cases during integration testing.\n\nBest,\n{user_name}",
            "time_delta": timedelta(days=3, hours=6),
            "attachment": ("MailFlow_Tech_Spec.txt", "text/plain", sample_txt_bytes),
        },
    ]
    for s in sent_items:
        e = EmailMessage.objects.create(
            owner=user,
            sender_name=user_name,
            sender_email=user_email,
            recipient_emails=s['to'],
            subject=s['subject'],
            body_text=s['body'],
            body_html=f"<p>{s['body'].replace(chr(10), '<br>')}</p>",
            folder='sent',
            is_read=True,
            received_at=now - s['time_delta'],
            sent_at=now - s['time_delta'],
            message_id=f"<{uuid.uuid4()}@mailflow.dev>",
            thread_id=str(uuid.uuid4()),
        )
        if 'attachment' in s:
            fname, ctype, content = s['attachment']
            att = EmailAttachment(
                email=e,
                filename=fname,
                content_type=ctype,
                file_size=len(content)
            )
            att.file.save(fname, ContentFile(content))
            att.save()

    # 5. Drafts
    Draft.objects.create(
        owner=user,
        to="fellow.engineer@opensource.org",
        subject="Refactoring connection pooling in MailFlow SMTP worker",
        body=f"Hey David,\n\nI was looking into our connection pool saturation under heavy load. I have an idea for caching active worker connections using a localized LRU cache.\n\nLet me know your thoughts.\n\nRegards,\n{user_name}",
    )
    Draft.objects.create(
        owner=user,
        to="alumni.network@university.edu",
        subject="Guest Speaker Session on Building High-Scale Email Systems",
        body=f"Dear Alumni Committee,\n\nI would be glad to participate in the upcoming tech talk on building reliable distributed email systems with Python and React.\n\nBest,\n{user_name}",
    )

    # 6. Spam
    EmailMessage.objects.create(
        owner=user,
        sender_name="Prize Notification Bot",
        sender_email="rewards@unverified-deals-direct.xyz",
        recipient_emails=user_email,
        subject=f"CLAIM IMMEDIATELY: $1,500 Gift Voucher Reserved for {user_name}",
        body_text="You have been randomly chosen in the quarterly internet sweepstakes! Click this unverified link immediately to claim your rewards before they expire in 24 hours.",
        body_html="<p>You have been randomly chosen in the quarterly internet sweepstakes! Click this unverified link immediately to claim your rewards before they expire in 24 hours.</p>",
        folder='spam',
        is_spam=True,
        is_read=False,
        received_at=now - timedelta(days=2),
        message_id=f"<{uuid.uuid4()}@spam-center.com>",
        thread_id=str(uuid.uuid4()),
    )

    # 7. Trash
    EmailMessage.objects.create(
        owner=user,
        sender_name="Daily Promo Mart",
        sender_email="promos@weeklymart-deals.net",
        recipient_emails=user_email,
        subject="Weekend Flash Deals: 70% Off Computer Accessories",
        body_text="Don't miss our weekend discounts on mechanical keyboards, ultrawide monitors, and USB-C docks.",
        body_html="<p>Don't miss our weekend discounts on mechanical keyboards, ultrawide monitors, and USB-C docks.</p>",
        folder='trash',
        is_deleted=True,
        previous_folder='inbox',
        is_read=True,
        received_at=now - timedelta(days=5),
        message_id=f"<{uuid.uuid4()}@deals.net>",
        thread_id=str(uuid.uuid4()),
    )

    return {
        "emails": EmailMessage.objects.filter(owner=user).count(),
        "drafts": Draft.objects.filter(owner=user).count(),
        "labels": Label.objects.filter(owner=user).count(),
    }
