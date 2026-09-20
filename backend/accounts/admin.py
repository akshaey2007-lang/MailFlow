from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'full_name', 'is_staff', 'is_active', 'created_at')
    search_fields = ('email', 'full_name')
    ordering = ('email',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Preferences & Email Settings', {
            'fields': (
                'full_name',
                'avatar',
                'theme_preference',
                'emails_per_page',
                'default_signature',
                'smtp_host',
                'smtp_port',
                'smtp_username',
                'smtp_password',
                'smtp_use_tls',
                'imap_host',
                'imap_port',
                'imap_username',
                'imap_password',
                'imap_use_ssl',
            ),
        }),
    )
