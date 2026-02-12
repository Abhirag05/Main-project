"""
Django admin configuration for student profiles.
"""
from django.contrib import admin
from apps.students.models import StudentProfile


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    """
    Read-only admin view for StudentProfile.
    Admins can view student registrations and their admission status.
    Approval workflow will be implemented in a future phase.
    """
    list_display = [
        'id',
        'user_full_name',
        'user_email',
        'admission_status',
        'created_at',
    ]

    list_filter = [
        'admission_status',
        'created_at',
    ]

    search_fields = [
        'user__email',
        'user__full_name',
    ]

    readonly_fields = [
        'user',
        'admission_status',
        'created_at',
        'updated_at',
    ]

    ordering = ['-created_at']

    def user_full_name(self, obj):
        """Display user's full name."""
        return obj.user.full_name
    user_full_name.short_description = 'Full Name'

    def user_email(self, obj):
        """Display user's email."""
        return obj.user.email
    user_email.short_description = 'Email'

    def has_add_permission(self, request):
        """Disable adding StudentProfile through admin."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Disable deleting StudentProfile through admin."""
        return False
