from django.contrib import admin
from .models import Centre


@admin.register(Centre)
class CentreAdmin(admin.ModelAdmin):
    """Admin interface for Centre model."""

    list_display = ['name', 'code', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def has_delete_permission(self, request, obj=None):
        """Prevent deletion if it's the last active centre."""
        if obj and obj.is_active:
            active_count = Centre.objects.filter(is_active=True).count()
            if active_count <= 1:
                return False
        return super().has_delete_permission(request, obj)
