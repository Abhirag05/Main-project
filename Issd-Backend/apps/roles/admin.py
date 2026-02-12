from django.contrib import admin
from .models import Role, Permission, RolePermission


class RolePermissionInline(admin.TabularInline):
    """Inline admin for role-permission mappings."""
    model = RolePermission
    extra = 1
    autocomplete_fields = ['permission']
    readonly_fields = ['granted_at']
    fields = ['permission', 'granted_by', 'granted_at']


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """Admin interface for Role model."""

    list_display = ['name', 'code', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code', 'description']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [RolePermissionInline]

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'description', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    """Admin interface for Permission model."""

    list_display = ['code', 'module', 'is_active', 'created_at']
    list_filter = ['is_active', 'module', 'created_at']
    search_fields = ['code', 'description', 'module']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'description', 'module', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(RolePermission)
class RolePermissionAdmin(admin.ModelAdmin):
    """Admin interface for RolePermission mapping."""

    list_display = ['role', 'permission', 'granted_by', 'granted_at']
    list_filter = ['granted_at', 'role']
    search_fields = ['role__name', 'role__code', 'permission__code']
    readonly_fields = ['granted_at']
    autocomplete_fields = ['role', 'permission', 'granted_by']

    fieldsets = (
        ('Mapping', {
            'fields': ('role', 'permission')
        }),
        ('Audit', {
            'fields': ('granted_by', 'granted_at')
        }),
    )
