from django.contrib import admin
from .models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    """Admin configuration for Attendance model."""
    
    list_display = [
        'id',
        'get_session_info',
        'get_student_name',
        'status',
        'get_marked_by',
        'marked_at'
    ]
    
    list_filter = [
        'status',
        'marked_at',
        'session__session_date',
        'session__time_slot__batch'
    ]
    
    search_fields = [
        'student__user__full_name',
        'student__user__email',
        'session__time_slot__batch__code'
    ]
    
    readonly_fields = ['marked_at', 'created_at']
    
    raw_id_fields = ['session', 'student', 'marked_by']
    
    ordering = ['-marked_at']
    
    def get_session_info(self, obj):
        """Display session information."""
        session = obj.session
        return f"{session.time_slot.batch.code} - {session.session_date}"
    get_session_info.short_description = 'Session'
    get_session_info.admin_order_field = 'session__session_date'
    
    def get_student_name(self, obj):
        """Display student name."""
        return obj.student.user.full_name
    get_student_name.short_description = 'Student'
    get_student_name.admin_order_field = 'student__user__full_name'
    
    def get_marked_by(self, obj):
        """Display who marked the attendance."""
        return obj.marked_by.full_name
    get_marked_by.short_description = 'Marked By'
    get_marked_by.admin_order_field = 'marked_by__full_name'
