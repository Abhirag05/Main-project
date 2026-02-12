from django.contrib import admin
from .models import Assignment, AssignmentSubmission


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'title', 'batch', 'module', 'faculty',
        'max_marks', 'due_date', 'is_active', 'created_at'
    ]
    list_filter = ['is_active', 'batch', 'module', 'created_at', 'due_date']
    search_fields = ['title', 'description', 'faculty__first_name', 'faculty__last_name']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Assignment Details', {
            'fields': ('title', 'description', 'assignment_file', 'max_marks')
        }),
        ('Assignment Settings', {
            'fields': ('batch', 'module', 'faculty', 'due_date', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('batch', 'module', 'faculty')


@admin.register(AssignmentSubmission)
class AssignmentSubmissionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'assignment', 'student', 'submitted_at',
        'marks_obtained', 'is_evaluated', 'is_late_submission'
    ]
    list_filter = [
        'submitted_at', 'evaluated_at',
        'assignment__batch', 'assignment__module'
    ]
    search_fields = [
        'assignment__title',
        'student__user__first_name',
        'student__user__last_name',
        'student__roll_number'
    ]
    readonly_fields = ['submitted_at', 'updated_at', 'evaluated_at', 'is_late_submission']
    date_hierarchy = 'submitted_at'
    
    fieldsets = (
        ('Submission Details', {
            'fields': ('assignment', 'student', 'submission_file')
        }),
        ('Evaluation', {
            'fields': ('marks_obtained', 'feedback', 'evaluated_by', 'evaluated_at')
        }),
        ('Timestamps', {
            'fields': ('submitted_at', 'updated_at', 'is_late_submission'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('assignment', 'student', 'student__user', 'evaluated_by')
    
    def is_evaluated(self, obj):
        return obj.is_evaluated
    is_evaluated.boolean = True
    is_evaluated.short_description = 'Evaluated'
    
    def is_late_submission(self, obj):
        return obj.is_late_submission
    is_late_submission.boolean = True
    is_late_submission.short_description = 'Late'
