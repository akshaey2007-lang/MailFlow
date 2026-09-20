from rest_framework import views, viewsets, generics, status, permissions
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import EmailMessage, EmailAttachment, Draft, Label
from .serializers import (
    EmailListSerializer,
    EmailDetailSerializer,
    EmailSendSerializer,
    DraftSerializer,
    LabelSerializer,
    BulkActionSerializer,
)
from .services.email_sender import EmailSenderService
from .services.email_sync import EmailSyncService


class BaseUserScopedMixin:
    """Ensures all queries are strictly isolated to the requesting user."""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(owner=self.request.user)


class FolderCountsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        inbox_unread = EmailMessage.objects.filter(owner=user, folder='inbox', is_read=False, is_deleted=False).count()
        starred_count = EmailMessage.objects.filter(owner=user, is_starred=True, is_deleted=False).count()
        sent_count = EmailMessage.objects.filter(owner=user, folder='sent', is_deleted=False).count()
        drafts_count = Draft.objects.filter(owner=user).count()
        important_count = EmailMessage.objects.filter(owner=user, is_important=True, is_deleted=False).count()
        spam_count = EmailMessage.objects.filter(owner=user, folder='spam', is_deleted=False).count()
        trash_count = EmailMessage.objects.filter(owner=user, folder='trash').count()

        return Response({
            "inbox": inbox_unread,
            "starred": starred_count,
            "sent": sent_count,
            "drafts": drafts_count,
            "important": important_count,
            "spam": spam_count,
            "trash": trash_count,
        })


class EmailListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EmailListSerializer

    def get_queryset(self):
        user = self.request.user
        folder = self.kwargs.get('folder') or self.request.query_params.get('folder', 'inbox')
        label_id = self.request.query_params.get('label')

        qs = EmailMessage.objects.filter(owner=user)

        if label_id:
            qs = qs.filter(labels__id=label_id, is_deleted=False)
        elif folder == 'starred':
            qs = qs.filter(is_starred=True, is_deleted=False)
        elif folder == 'important':
            qs = qs.filter(is_important=True, is_deleted=False)
        elif folder == 'trash':
            qs = qs.filter(folder='trash')
        elif folder == 'spam':
            qs = qs.filter(folder='spam', is_deleted=False)
        elif folder == 'sent':
            qs = qs.filter(folder='sent', is_deleted=False)
        elif folder == 'archive':
            qs = qs.filter(folder='archive', is_deleted=False)
        else:  # default 'inbox'
            qs = qs.filter(folder='inbox', is_deleted=False)

        return qs.prefetch_related('attachments', 'labels').order_by('-received_at', '-created_at')


class EmailDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EmailDetailSerializer

    def get_queryset(self):
        return EmailMessage.objects.filter(owner=self.request.user).prefetch_related('attachments', 'labels')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Automatically mark as read when retrieved if requested
        if not instance.is_read:
            instance.is_read = True
            instance.save(update_fields=['is_read', 'updated_at'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # If already in trash, permanent delete
        if instance.folder == 'trash' or instance.is_deleted:
            instance.delete()
            return Response({"message": "Email permanently deleted."}, status=status.HTTP_204_NO_CONTENT)

        # Otherwise, move to trash (soft delete)
        instance.previous_folder = instance.folder
        instance.folder = 'trash'
        instance.is_deleted = True
        instance.save(update_fields=['folder', 'previous_folder', 'is_deleted', 'updated_at'])
        return Response({"message": "Email moved to trash."}, status=status.HTTP_200_OK)


class EmailActionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, action):
        email_msg = get_object_or_404(EmailMessage, id=pk, owner=request.user)

        if action == 'read':
            email_msg.is_read = True
            email_msg.save(update_fields=['is_read', 'updated_at'])
            return Response({"message": "Marked as read", "is_read": True})

        elif action == 'unread':
            email_msg.is_read = False
            email_msg.save(update_fields=['is_read', 'updated_at'])
            return Response({"message": "Marked as unread", "is_read": False})

        elif action == 'star':
            email_msg.is_starred = not email_msg.is_starred
            email_msg.save(update_fields=['is_starred', 'updated_at'])
            return Response({"message": "Star toggled", "is_starred": email_msg.is_starred})

        elif action == 'important':
            email_msg.is_important = not email_msg.is_important
            email_msg.save(update_fields=['is_important', 'updated_at'])
            return Response({"message": "Importance toggled", "is_important": email_msg.is_important})

        elif action == 'archive':
            email_msg.folder = 'archive'
            email_msg.is_deleted = False
            email_msg.save(update_fields=['folder', 'is_deleted', 'updated_at'])
            return Response({"message": "Email archived", "folder": "archive"})

        elif action == 'spam':
            email_msg.previous_folder = email_msg.folder
            email_msg.folder = 'spam'
            email_msg.is_spam = True
            email_msg.is_deleted = False
            email_msg.save(update_fields=['folder', 'previous_folder', 'is_spam', 'is_deleted', 'updated_at'])
            return Response({"message": "Marked as spam", "folder": "spam"})

        elif action == 'unspam':
            email_msg.folder = email_msg.previous_folder or 'inbox'
            email_msg.is_spam = False
            email_msg.save(update_fields=['folder', 'is_spam', 'updated_at'])
            return Response({"message": "Removed from spam", "folder": email_msg.folder})

        elif action == 'trash':
            email_msg.previous_folder = email_msg.folder
            email_msg.folder = 'trash'
            email_msg.is_deleted = True
            email_msg.save(update_fields=['folder', 'previous_folder', 'is_deleted', 'updated_at'])
            return Response({"message": "Moved to trash", "folder": "trash"})

        elif action == 'restore':
            email_msg.folder = email_msg.previous_folder or 'inbox'
            email_msg.is_deleted = False
            email_msg.save(update_fields=['folder', 'is_deleted', 'updated_at'])
            return Response({"message": "Email restored to inbox", "folder": email_msg.folder})

        return Response({"error": f"Unknown action '{action}'"}, status=status.HTTP_400_BAD_REQUEST)


class BulkActionsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email_ids = serializer.validated_data['email_ids']
        action = serializer.validated_data['action']
        label_id = serializer.validated_data.get('label_id')

        qs = EmailMessage.objects.filter(id__in=email_ids, owner=request.user)
        count = qs.count()

        if action == 'read':
            qs.update(is_read=True, updated_at=timezone.now())
        elif action == 'unread':
            qs.update(is_read=False, updated_at=timezone.now())
        elif action == 'star':
            qs.update(is_starred=True, updated_at=timezone.now())
        elif action == 'unstar':
            qs.update(is_starred=False, updated_at=timezone.now())
        elif action == 'important':
            qs.update(is_important=True, updated_at=timezone.now())
        elif action == 'unimportant':
            qs.update(is_important=False, updated_at=timezone.now())
        elif action == 'trash':
            for email_obj in qs:
                email_obj.previous_folder = email_obj.folder
                email_obj.folder = 'trash'
                email_obj.is_deleted = True
                email_obj.save(update_fields=['folder', 'previous_folder', 'is_deleted', 'updated_at'])
        elif action == 'restore':
            for email_obj in qs:
                email_obj.folder = email_obj.previous_folder or 'inbox'
                email_obj.is_deleted = False
                email_obj.save(update_fields=['folder', 'is_deleted', 'updated_at'])
        elif action == 'spam':
            qs.update(folder='spam', is_spam=True, is_deleted=False, updated_at=timezone.now())
        elif action == 'unspam':
            qs.update(folder='inbox', is_spam=False, updated_at=timezone.now())
        elif action == 'archive':
            qs.update(folder='archive', is_deleted=False, updated_at=timezone.now())
        elif action == 'delete_permanent':
            qs.delete()
        elif action == 'add_label' and label_id:
            label = get_object_or_404(Label, id=label_id, owner=request.user)
            for email_obj in qs:
                email_obj.labels.add(label)
        elif action == 'remove_label' and label_id:
            label = get_object_or_404(Label, id=label_id, owner=request.user)
            for email_obj in qs:
                email_obj.labels.remove(label)

        return Response({
            "message": f"Successfully performed '{action}' on {count} emails.",
            "count": count
        })


class EmptyTrashView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        deleted_count, _ = EmailMessage.objects.filter(owner=request.user, folder='trash').delete()
        return Response({"message": f"Emptied trash. {deleted_count} emails permanently deleted."})


class SendEmailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        serializer = EmailSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        files = request.FILES.getlist('attachments') or request.FILES.getlist('files')

        try:
            result = EmailSenderService.send_email(
                user=request.user,
                to=data['to'],
                subject=data['subject'],
                body_text=data.get('body_text', ''),
                body_html=data.get('body_html', ''),
                cc=data.get('cc', ''),
                bcc=data.get('bcc', ''),
                files=files,
                thread_id=data.get('thread_id', ''),
                in_reply_to=data.get('in_reply_to', '')
            )

            # If sending a draft, delete the draft upon successful dispatch
            draft_id = data.get('draft_id')
            if draft_id:
                Draft.objects.filter(id=draft_id, owner=request.user).delete()

            return Response(result, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SyncEmailsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        result = EmailSyncService.sync_inbox(request.user)
        return Response(result)


class PopulateInboxView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .services.demo_seeder import seed_user_data
        reset = request.data.get('reset', False)
        stats = seed_user_data(request.user, reset=reset)
        return Response({
            "success": True,
            "message": f"Successfully loaded sample emails for {request.user.email}!",
            "stats": stats
        })


class SearchView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EmailListSerializer

    def get_queryset(self):
        user = self.request.user
        q = self.request.query_params.get('q', '').strip()
        folder = self.request.query_params.get('folder', '')
        has_attachment = self.request.query_params.get('has_attachment')
        is_starred = self.request.query_params.get('is_starred')
        is_important = self.request.query_params.get('is_important')
        is_read = self.request.query_params.get('is_read')
        label_id = self.request.query_params.get('label')

        qs = EmailMessage.objects.filter(owner=user)

        if folder:
            qs = qs.filter(folder=folder)
        else:
            # Exclude trash and spam by default unless requested
            qs = qs.exclude(folder__in=['trash', 'spam'])

        if q:
            qs = qs.filter(
                Q(subject__icontains=q) |
                Q(body_text__icontains=q) |
                Q(body_html__icontains=q) |
                Q(sender_name__icontains=q) |
                Q(sender_email__icontains=q) |
                Q(recipient_emails__icontains=q)
            )

        if has_attachment is not None and has_attachment != '':
            val = has_attachment.lower() in ('true', '1')
            if val:
                qs = qs.filter(attachments__isnull=False).distinct()

        if is_starred is not None and is_starred != '':
            qs = qs.filter(is_starred=(is_starred.lower() in ('true', '1')))

        if is_important is not None and is_important != '':
            qs = qs.filter(is_important=(is_important.lower() in ('true', '1')))

        if is_read is not None and is_read != '':
            qs = qs.filter(is_read=(is_read.lower() in ('true', '1')))

        if label_id:
            qs = qs.filter(labels__id=label_id)

        return qs.prefetch_related('attachments', 'labels').order_by('-received_at', '-created_at')


class DraftViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DraftSerializer

    def get_queryset(self):
        return Draft.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class SendDraftView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        draft = get_object_or_404(Draft, id=pk, owner=request.user)
        files = request.FILES.getlist('attachments') or request.FILES.getlist('files')

        to_addr = request.data.get('to') or draft.to
        if not to_addr:
            return Response({"error": "Recipient 'to' is required to send draft."}, status=status.HTTP_400_BAD_REQUEST)

        subject = request.data.get('subject') or draft.subject
        body = request.data.get('body') or draft.body

        try:
            result = EmailSenderService.send_email(
                user=request.user,
                to=to_addr,
                subject=subject,
                body_text=body,
                cc=request.data.get('cc') or draft.cc,
                bcc=request.data.get('bcc') or draft.bcc,
                files=files,
                thread_id=draft.thread_id,
                in_reply_to=draft.in_reply_to,
            )
            draft.delete()
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class LabelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LabelSerializer
    pagination_class = None

    def get_queryset(self):
        return Label.objects.filter(owner=self.request.user).annotate(
            annotated_count=Count('emails')
        ).order_by('name')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class EmailLabelToggleView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, email_id, label_id):
        email_msg = get_object_or_404(EmailMessage, id=email_id, owner=request.user)
        label = get_object_or_404(Label, id=label_id, owner=request.user)

        if label in email_msg.labels.all():
            email_msg.labels.remove(label)
            assigned = False
        else:
            email_msg.labels.add(label)
            assigned = True

        return Response({
            "message": "Label updated",
            "assigned": assigned,
            "label_id": label.id,
            "label_name": label.name
        })
