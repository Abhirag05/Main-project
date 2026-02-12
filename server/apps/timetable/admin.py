"""
Django admin configuration for Timetable module.
"""
from django.contrib import admin
from .models import TimeSlot, ClassSession, CoursePlan


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    """Admin for TimeSlot model."""
    list_display = ['batch', 'module', 'faculty',
                    'day_of_week', 'start_time', 'end_time', 'is_active']
    list_filter = ['day_of_week', 'is_active', 'batch__centre']
    search_fields = ['batch__code', 'module__name', 'faculty__employee_code']
    ordering = ['day_of_week', 'start_time']


@admin.register(ClassSession)
class ClassSessionAdmin(admin.ModelAdmin):
    """Admin for ClassSession model."""
    list_display = ['time_slot', 'session_date', 'status', 'meeting_link']
    list_filter = ['status', 'session_date']
    search_fields = ['time_slot__batch__code', 'topic']
    ordering = ['-session_date', 'time_slot__start_time']


@admin.register(CoursePlan)
class CoursePlanAdmin(admin.ModelAdmin):
    """Admin for CoursePlan model."""
    list_display = ['batch', 'module', 'topic_title',
                    'sequence_order', 'planned_date', 'is_completed']
    list_filter = ['is_completed', 'batch__centre']
    search_fields = ['batch__code', 'module__name', 'topic_title']
    ordering = ['batch', 'sequence_order']
