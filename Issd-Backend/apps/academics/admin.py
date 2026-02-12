"""
Django admin configuration for academic programs.
"""
from django.contrib import admin
from apps.academics.models import Course, Module, CourseModule


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    """
    Admin interface for Course model.
    """
    list_display = [
        'code',
        'name',
        'duration_months',
        'skills_display',
        'is_active',
        'created_at',
    ]

    list_filter = [
        'is_active',
    ]

    search_fields = [
        'code',
        'name',
        'description',
    ]

    ordering = ['code']

    readonly_fields = ['created_at', 'updated_at', 'skills_display']

    fieldsets = (
        ('Course Information', {
            'fields': ('code', 'name', 'description', 'duration_months', 'skills')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def skills_display(self, obj):
        """Display skills as comma-separated string."""
        if obj.skills:
            return ', '.join(obj.skills)
        return '-'
    skills_display.short_description = 'Skills'


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    """
    Admin interface for Module model.
    """
    list_display = [
        'code',
        'name',
        'is_active',
        'created_at',
    ]

    list_filter = [
        'is_active',
    ]

    search_fields = [
        'code',
        'name',
        'description',
    ]

    ordering = ['name']

    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Module Information', {
            'fields': ('code', 'name', 'description')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CourseModule)
class CourseModuleAdmin(admin.ModelAdmin):
    """
    Admin interface for CourseModule model.
    """
    list_display = [
        'course',
        'module',
        'sequence_order',
        'is_active',
    ]

    list_filter = [
        'course',
        'is_active',
    ]

    search_fields = [
        'course__code',
        'course__name',
        'module__code',
        'module__name',
    ]

    ordering = ['course', 'sequence_order']

    raw_id_fields = ['course', 'module']

    fieldsets = (
        ('Curriculum Mapping', {
            'fields': ('course', 'module', 'sequence_order', 'is_active')
        }),
    )
