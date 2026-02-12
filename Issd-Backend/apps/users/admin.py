from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin interface for custom User model."""

    list_display = ['email', 'full_name', 'role',
                    'centre', 'is_active', 'is_staff', 'created_at']
    list_filter = ['is_active', 'is_staff', 'role', 'centre', 'created_at']
    search_fields = ['email', 'full_name', 'phone']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'last_login']

    # Remove filter_horizontal - we don't use Django Groups for business authorization

    fieldsets = (
        (None, {
            'fields': ('email', 'password')
        }),
        (_('Personal Info'), {
            'fields': ('full_name', 'phone')
        }),
        (_('Organization'), {
            'fields': ('role', 'centre')
        }),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser'),
            'description': 'is_staff: Django admin access only. Business authorization uses Role + Permissions (NOT Groups).'
        }),
        (_('Important dates'), {
            'fields': ('last_login', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'full_name', 'password1', 'password2', 'role', 'centre', 'is_staff', 'is_active'),
        }),
    )
