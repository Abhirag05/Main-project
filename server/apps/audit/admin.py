from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'entity',
                    'entity_id', 'performed_by', 'timestamp']
    list_filter = ['action', 'entity', 'timestamp']
    search_fields = ['entity_id', 'performed_by__email']
    readonly_fields = ['action', 'entity', 'entity_id',
                       'performed_by', 'details', 'timestamp']

    def has_add_permission(self, request):
        # Audit logs should only be created programmatically
        return False

    def has_delete_permission(self, request, obj=None):
        # Audit logs should never be deleted
        return False
