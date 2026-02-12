"""
Placement admin configuration.
"""
from django.contrib import admin
from apps.placement.models import PlacementList, PlacementListStudent, StudentPlacementLink


@admin.register(PlacementList)
class PlacementListAdmin(admin.ModelAdmin):
    """
    Admin interface for PlacementList model.
    """
    list_display = [
        'name',
        'student_count',
        'created_by',
        'created_at',
        'is_active'
    ]
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description', 'created_by__full_name']
    readonly_fields = ['created_at', 'updated_at', 'student_count']

    fieldsets = [
        ('Basic Information', {
            'fields': ('name', 'description', 'placement_link', 'created_by')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'student_count'),
            'classes': ('collapse',)
        })
    ]

    def student_count(self, obj):
        """Display the number of active students in the list."""
        return obj.student_count
    student_count.short_description = 'Student Count'


@admin.register(PlacementListStudent)
class PlacementListStudentAdmin(admin.ModelAdmin):
    """
    Admin interface for PlacementListStudent model.
    """
    list_display = [
        'student',
        'placement_list',
        'added_by',
        'added_at',
        'is_active'
    ]
    list_filter = ['is_active', 'added_at', 'placement_list']
    search_fields = [
        'student__user__full_name',
        'student__user__email',
        'placement_list__name',
        'notes'
    ]
    readonly_fields = ['added_at']

    fieldsets = [
        ('Placement Information', {
            'fields': ('placement_list', 'student')
        }),
        ('Details', {
            'fields': ('notes', 'added_by')
        }),
        ('Status', {
            'fields': ('is_active', 'added_at')
        })
    ]


@admin.register(StudentPlacementLink)
class StudentPlacementLinkAdmin(admin.ModelAdmin):
    """
    Admin interface for StudentPlacementLink model.
    """
    list_display = [
        'student',
        'placement_list',
        'sent_at'
    ]
    list_filter = ['sent_at', 'placement_list']
    search_fields = [
        'student__user__full_name',
        'student__user__email',
        'placement_list__name'
    ]
    readonly_fields = ['sent_at']

    fieldsets = [
        ('Placement Information', {
            'fields': ('student', 'placement_list')
        }),
        ('Link Details', {
            'fields': ('sent_at',)
        })
    ]
