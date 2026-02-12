"""
Timetable & Course Plan Models.

This module implements the timetable and course planning system for ISSD Campus ERP.

SRS Requirements Covered:
- FR-TIM-01: Create batch timetables
- FR-TIM-02: Set recurring schedules
- FR-TIM-03: Notify faculty & students (via status changes)
- FR-TIM-04: Store structured course plans
- FR-TIM-05: Link classes to topics
- FR-TIM-06: Add meeting links
- FR-FAC-04: Detect timetable conflicts (via validation)

Models:
1. TimeSlot - Recurring weekly schedule (e.g., Monday 10:00-11:30)
2. ClassSession - Actual scheduled class instances
3. CoursePlan - Structured syllabus/topic planning
"""
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models import Q


class TimeSlot(models.Model):
    """
    Recurring weekly time slot for a batch.

    Represents when a subject is taught in a batch on a specific day/time.
    Used to generate ClassSession instances and detect faculty conflicts.

    Business Rules:
    - A faculty cannot have overlapping time slots on the same day
    - A batch can have multiple time slots for different subjects
    - Each time slot links a batch, subject, and faculty
    """

    WEEKDAY_CHOICES = [
        (1, 'Monday'),
        (2, 'Tuesday'),
        (3, 'Wednesday'),
        (4, 'Thursday'),
        (5, 'Friday'),
        (6, 'Saturday'),
        (7, 'Sunday'),
    ]

    batch = models.ForeignKey(
        'batch_management.Batch',
        on_delete=models.PROTECT,
        related_name='time_slots',
        help_text="Batch this time slot belongs to"
    )

    module = models.ForeignKey(
        'academics.Module',
        on_delete=models.PROTECT,
        related_name='time_slots',
        help_text="Module taught in this time slot",
        null=True,
        blank=True
    )

    faculty = models.ForeignKey(
        'faculty.FacultyProfile',
        on_delete=models.PROTECT,
        related_name='time_slots',
        help_text="Faculty assigned to teach this slot"
    )

    day_of_week = models.IntegerField(
        choices=WEEKDAY_CHOICES,
        help_text="Day of the week (1=Monday, 7=Sunday)"
    )

    start_time = models.TimeField(
        help_text="Class start time"
    )

    end_time = models.TimeField(
        help_text="Class end time"
    )

    room_number = models.CharField(
        max_length=50,
        blank=True,
        help_text="Physical room/classroom number (optional)"
    )

    default_meeting_link = models.URLField(
        blank=True,
        help_text="Default meeting link for online classes (Zoom/Meet/Teams)"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this time slot is currently active"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_time_slots',
        help_text="User who created this time slot"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'timetable_time_slots'
        verbose_name = 'Time Slot'
        verbose_name_plural = 'Time Slots'
        ordering = ['day_of_week', 'start_time']
        # Prevent duplicate slots for same batch/day/time
        unique_together = [['batch', 'day_of_week', 'start_time']]
        indexes = [
            models.Index(fields=['faculty', 'day_of_week']),
            models.Index(fields=['batch', 'is_active']),
        ]

    def __str__(self):
        day_name = dict(self.WEEKDAY_CHOICES).get(self.day_of_week, '')
        return f"{self.batch.code} - {day_name} {self.start_time}-{self.end_time} ({self.module.code})"

    def clean(self):
        """
        Validate the time slot:
        1. End time must be after start time
        2. Faculty must not have conflicting time slots (FR-FAC-04)
        """
        super().clean()

        # Validate time range
        if self.start_time and self.end_time:
            if self.start_time >= self.end_time:
                raise ValidationError({
                    'end_time': 'End time must be after start time.'
                })

        # Check for faculty conflicts (FR-FAC-04)
        if self.faculty and self.day_of_week and self.start_time and self.end_time:
            conflicts = TimeSlot.objects.filter(
                faculty=self.faculty,
                day_of_week=self.day_of_week,
                is_active=True
            ).filter(
                # Overlapping time check: NOT (new_end <= existing_start OR new_start >= existing_end)
                Q(start_time__lt=self.end_time) & Q(
                    end_time__gt=self.start_time)
            )

            # Exclude self when updating
            if self.pk:
                conflicts = conflicts.exclude(pk=self.pk)

            if conflicts.exists():
                conflict = conflicts.first()
                raise ValidationError({
                    'faculty': f"Faculty has a conflicting time slot: {conflict.batch.code} on {dict(self.WEEKDAY_CHOICES)[self.day_of_week]} {conflict.start_time}-{conflict.end_time}"
                })

    def save(self, *args, **kwargs):
        """Validate before saving."""
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def check_faculty_conflict(cls, faculty_id, day_of_week, start_time, end_time, exclude_id=None):
        """
        Check if a faculty has any conflicting time slots.

        Returns:
            tuple: (has_conflict: bool, conflicting_slots: QuerySet)
        """
        conflicts = cls.objects.filter(
            faculty_id=faculty_id,
            day_of_week=day_of_week,
            is_active=True
        ).filter(
            Q(start_time__lt=end_time) & Q(end_time__gt=start_time)
        )

        if exclude_id:
            conflicts = conflicts.exclude(pk=exclude_id)

        return conflicts.exists(), conflicts

    @classmethod
    def check_batch_conflict(cls, batch_id, day_of_week, start_time, end_time, exclude_id=None):
        """
        Check if a batch has any conflicting time slots.

        Returns:
            tuple: (has_conflict: bool, conflicting_slots: QuerySet)
        """
        conflicts = cls.objects.filter(
            batch_id=batch_id,
            day_of_week=day_of_week,
            is_active=True
        ).filter(
            Q(start_time__lt=end_time) & Q(end_time__gt=start_time)
        )

        if exclude_id:
            conflicts = conflicts.exclude(pk=exclude_id)

        return conflicts.exists(), conflicts


class ClassSession(models.Model):
    """
    Actual class session instance.

    Generated from TimeSlot for specific dates.
    Tracks actual class delivery, attendance, and meeting links.

    Business Rules:
    - Linked to a TimeSlot (inherits batch, subject, faculty)
    - Has a specific date
    - Can have custom meeting link (overrides TimeSlot default)
    - Tracks status (Scheduled, Completed, Cancelled, Rescheduled)
    """

    class Status(models.TextChoices):
        """Session status choices."""
        SCHEDULED = "SCHEDULED", "Scheduled"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"
        RESCHEDULED = "RESCHEDULED", "Rescheduled"

    time_slot = models.ForeignKey(
        TimeSlot,
        on_delete=models.PROTECT,
        related_name='sessions',
        help_text="Time slot this session belongs to"
    )

    session_date = models.DateField(
        help_text="Date of this class session"
    )

    actual_start_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Actual class start time (if different from scheduled)"
    )

    actual_end_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Actual class end time (if different from scheduled)"
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
        help_text="Current session status"
    )

    topic = models.CharField(
        max_length=500,
        blank=True,
        help_text="Topic covered in this session"
    )

    course_plan = models.ForeignKey(
        'CoursePlan',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='class_sessions',
        help_text="Linked course plan topic (FR-TIM-05)"
    )

    meeting_link = models.URLField(
        blank=True,
        help_text="Meeting link for this specific session (overrides TimeSlot default)"
    )

    recording_link = models.URLField(
        blank=True,
        help_text="Recording link after session completion"
    )

    notes = models.TextField(
        blank=True,
        help_text="Session notes or remarks"
    )

    cancellation_reason = models.TextField(
        blank=True,
        help_text="Reason for cancellation (if cancelled)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'timetable_class_sessions'
        verbose_name = 'Class Session'
        verbose_name_plural = 'Class Sessions'
        ordering = ['-session_date', 'time_slot__start_time']
        # Prevent duplicate sessions for same time slot and date
        unique_together = [['time_slot', 'session_date']]
        indexes = [
            models.Index(fields=['session_date', 'status']),
            models.Index(fields=['time_slot', 'session_date']),
        ]

    def __str__(self):
        return f"{self.time_slot.batch.code} - {self.session_date} ({self.time_slot.module.code})"

    def get_meeting_link(self):
        """Return session-specific link or fall back to TimeSlot default."""
        return self.meeting_link or self.time_slot.default_meeting_link

    def get_start_time(self):
        """Return actual start time or scheduled start time."""
        return self.actual_start_time or self.time_slot.start_time

    def get_end_time(self):
        """Return actual end time or scheduled end time."""
        return self.actual_end_time or self.time_slot.end_time

    @property
    def batch(self):
        """Convenience accessor for batch."""
        return self.time_slot.batch

    @property
    def module(self):
        """Convenience accessor for module."""
        return self.time_slot.module

    @property
    def faculty(self):
        """Convenience accessor for faculty."""
        return self.time_slot.faculty


class CoursePlan(models.Model):
    """
    Structured course/syllabus plan for a batch.

    Defines the topics to be covered in sequence for a subject within a batch.
    Links to ClassSession when topics are delivered (FR-TIM-05).

    Business Rules:
    - Each batch-subject combination has a sequence of topics
    - Topics can be marked as completed
    - Topics can be linked to actual class sessions
    """

    batch = models.ForeignKey(
        'batch_management.Batch',
        on_delete=models.PROTECT,
        related_name='course_plans',
        help_text="Batch this course plan belongs to"
    )

    module = models.ForeignKey(
        'academics.Module',
        on_delete=models.PROTECT,
        related_name='course_plans',
        null=True,
        blank=True,
        help_text="Module this topic belongs to"
    )

    topic_title = models.CharField(
        max_length=300,
        help_text="Title of the topic/module"
    )

    topic_description = models.TextField(
        blank=True,
        help_text="Detailed description of the topic"
    )

    sequence_order = models.PositiveIntegerField(
        help_text="Order of this topic in the syllabus"
    )

    estimated_hours = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=1.0,
        help_text="Estimated hours to cover this topic"
    )

    planned_date = models.DateField(
        null=True,
        blank=True,
        help_text="Planned delivery date"
    )

    actual_date = models.DateField(
        null=True,
        blank=True,
        help_text="Actual delivery date"
    )

    is_completed = models.BooleanField(
        default=False,
        help_text="Whether this topic has been completed"
    )

    resources = models.JSONField(
        default=list,
        blank=True,
        help_text="List of resource links/materials for this topic"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_course_plans',
        help_text="User who created this plan entry"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'timetable_course_plans'
        verbose_name = 'Course Plan'
        verbose_name_plural = 'Course Plans'
        ordering = ['batch', 'module', 'sequence_order']
        # Prevent duplicate sequence numbers for same batch-module
        unique_together = [['batch', 'module', 'sequence_order']]
        indexes = [
            models.Index(fields=['batch', 'module']),
            models.Index(fields=['is_completed']),
        ]

    def __str__(self):
        return f"{self.batch.code} - {self.module.code} - {self.sequence_order}. {self.topic_title}"

    def mark_completed(self, actual_date=None):
        """Mark this topic as completed."""
        from django.utils import timezone
        self.is_completed = True
        self.actual_date = actual_date or timezone.now().date()
        self.save()
