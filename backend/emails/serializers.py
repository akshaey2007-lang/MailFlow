from rest_framework import serializers
from .models import EmailMessage, EmailAttachment, Draft, Label


class LabelSerializer(serializers.ModelSerializer):
    email_count = serializers.SerializerMethodField()

    class Meta:
        model = Label
        fields = ['id', 'name', 'color', 'created_at', 'email_count']
        read_only_fields = ['id', 'created_at']

    def get_email_count(self, obj):
        return obj.emails.filter(owner=obj.owner, is_deleted=False).count()

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class EmailAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = EmailAttachment
        fields = ['id', 'filename', 'content_type', 'file_size', 'file_url', 'created_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file:
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class EmailListSerializer(serializers.ModelSerializer):
    snippet = serializers.ReadOnlyField()
    has_attachment = serializers.SerializerMethodField()
    labels = LabelSerializer(many=True, read_only=True)

    class Meta:
        model = EmailMessage
        fields = [
            'id',
            'sender_name',
            'sender_email',
            'recipient_emails',
            'subject',
            'snippet',
            'folder',
            'is_read',
            'is_starred',
            'is_important',
            'is_spam',
            'is_deleted',
            'labels',
            'has_attachment',
            'received_at',
            'sent_at',
            'created_at',
            'thread_id',
        ]

    def get_has_attachment(self, obj):
        return obj.attachments.exists()


class EmailDetailSerializer(serializers.ModelSerializer):
    snippet = serializers.ReadOnlyField()
    attachments = EmailAttachmentSerializer(many=True, read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    thread_messages = serializers.SerializerMethodField()

    class Meta:
        model = EmailMessage
        fields = [
            'id',
            'sender_name',
            'sender_email',
            'recipient_emails',
            'cc_emails',
            'bcc_emails',
            'subject',
            'body_text',
            'body_html',
            'snippet',
            'folder',
            'is_read',
            'is_starred',
            'is_important',
            'is_spam',
            'is_deleted',
            'message_id',
            'thread_id',
            'in_reply_to',
            'labels',
            'attachments',
            'thread_messages',
            'received_at',
            'sent_at',
            'created_at',
            'updated_at',
        ]

    def get_thread_messages(self, obj):
        """
        Retrieves other messages belonging to the same thread for the same user.
        """
        if not obj.thread_id:
            return []
        request = self.context.get('request')
        threads = EmailMessage.objects.filter(
            owner=obj.owner,
            thread_id=obj.thread_id
        ).exclude(id=obj.id).order_by('received_at', 'created_at')

        # Simple list of thread messages
        return EmailListSerializer(threads, many=True, context=self.context).data


class EmailSendSerializer(serializers.Serializer):
    to = serializers.CharField(required=True)
    cc = serializers.CharField(required=False, allow_blank=True, default='')
    bcc = serializers.CharField(required=False, allow_blank=True, default='')
    subject = serializers.CharField(required=True, max_length=500)
    body_text = serializers.CharField(required=False, allow_blank=True, default='')
    body_html = serializers.CharField(required=False, allow_blank=True, default='')
    thread_id = serializers.CharField(required=False, allow_blank=True, default='')
    in_reply_to = serializers.CharField(required=False, allow_blank=True, default='')
    draft_id = serializers.IntegerField(required=False, allow_null=True)


class DraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Draft
        fields = [
            'id',
            'to',
            'cc',
            'bcc',
            'subject',
            'body',
            'thread_id',
            'in_reply_to',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class BulkActionSerializer(serializers.Serializer):
    email_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )
    action = serializers.ChoiceField(choices=[
        'read',
        'unread',
        'star',
        'unstar',
        'important',
        'unimportant',
        'trash',
        'restore',
        'spam',
        'unspam',
        'archive',
        'delete_permanent',
        'add_label',
        'remove_label',
    ])
    label_id = serializers.IntegerField(required=False, allow_null=True)
