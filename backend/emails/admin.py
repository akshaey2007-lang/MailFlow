from django.contrib import admin
from .models import EmailMessage, EmailAttachment, Draft, Label


class EmailAttachmentInline(admin.TabularInline):
    model = EmailAttachment
    extra = 0


@admin.register(EmailMessage)
class EmailMessageAdmin(admin.ModelAdmin):
    list_display = ('subject', 'owner', 'sender_email', 'folder', 'is_read', 'is_starred', 'is_important', 'received_at')
    list_filter = ('folder', 'is_read', 'is_starred', 'is_important', 'is_spam', 'is_deleted')
    search_fields = ('subject', 'sender_email', 'sender_name', 'body_text')
    inlines = [EmailAttachmentInline]


@admin.register(Draft)
class DraftAdmin(admin.ModelAdmin):
    list_display = ('subject', 'owner', 'to', 'updated_at')
    search_fields = ('subject', 'to', 'body')


@admin.register(Label)
class LabelAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'color', 'created_at')
    search_fields = ('name',)


@admin.register(EmailAttachment)
class EmailAttachmentAdmin(admin.ModelAdmin):
    list_display = ('filename', 'email', 'content_type', 'file_size', 'created_at')
