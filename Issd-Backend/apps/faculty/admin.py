"""
Django admin configuration for faculty management.
"""
from django.contrib import admin
from apps.faculty.models import FacultyProfile, FacultyAvailability, FacultyModuleAssignment, FacultyBatchAssignment


@admin.register(FacultyProfile)
class FacultyProfileAdmin(admin.ModelAdmin):
    """
    Admin interface for FacultyProfile model.
    """
    list_display = [
        'employee_code',
        'user',
        'designation',
        'joining_date',
        'is_active',
        'created_at',
    ]

    list_filter = [
        'is_active',
        'designation',
        'joining_date',
    ]

    search_fields = [
        'employee_code',
        'user__email',
        'user__full_name',
        'designation',
    ]

    ordering = ['employee_code']

    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Faculty Information', {
            'fields': ('user', 'employee_code', 'designation', 'joining_date')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(FacultyAvailability)
class FacultyAvailabilityAdmin(admin.ModelAdmin):
    """
    Admin interface for FacultyAvailability model.
    """
    list_display = [
        'faculty',
        'day_of_week_display',
        'start_time',
        'end_time',
        'is_active',
    ]

    list_filter = [
        'day_of_week',
        'is_active',
    ]

    search_fields = [
        'faculty__employee_code',
        'faculty__user__email',
        'faculty__user__full_name',
    ]

    ordering = ['faculty', 'day_of_week', 'start_time']

    fieldsets = (
        ('Availability Details', {
            'fields': ('faculty', 'day_of_week', 'start_time', 'end_time')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )

    def day_of_week_display(self, obj):
        """Display day of week as readable name."""
        return dict(FacultyAvailability.WEEKDAY_CHOICES).get(obj.day_of_week, '')
    day_of_week_display.short_description = 'Day of Week'


@admin.register(FacultyModuleAssignment)
class FacultyModuleAssignmentAdmin(admin.ModelAdmin):
    """
    Admin interface for FacultyModuleAssignment model.
    """
    list_display = [
        'faculty',
        'module',
        'is_active',
        'assigned_at',
    ]

    list_filter = [
        'is_active',
        'module',
        'assigned_at',
    ]

    search_fields = [
        'faculty__user__email',
        'faculty__employee_code',
        'module__name',
        'module__code',
    ]

    ordering = ['-assigned_at']

    readonly_fields = ['assigned_at', 'assigned_by']

    fieldsets = (
        ('Assignment Details', {
            'fields': ('faculty', 'module')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('assigned_at', 'assigned_by'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        """Automatically set assigned_by to current user on creation."""
        if not change:  # Only on creation
            obj.assigned_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(FacultyBatchAssignment)
class FacultyBatchAssignmentAdmin(admin.ModelAdmin):
    """
    Admin interface for FacultyBatchAssignment model.
    """
    list_display = [
        'faculty',
        'batch',
        'is_active',
        'assigned_at',
    ]

    list_filter = [
        'is_active',
        'batch',
        'assigned_at',
    ]

    search_fields = [
        'faculty__user__email',
        'faculty__employee_code',
        'batch__code',
    ]

    ordering = ['-assigned_at']

    readonly_fields = ['assigned_at', 'assigned_by']

    fieldsets = (
        ('Assignment Details', {
            'fields': ('faculty', 'batch')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('assigned_at', 'assigned_by'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        """Automatically set assigned_by to current user on creation."""
        if not change:  # Only on creation
            obj.assigned_by = request.user
        super().save_model(request, obj, form, change)
