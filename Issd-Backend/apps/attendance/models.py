"""
Attendance Model for ISSD Campus ERP.

This module implements the attendance tracking system for batch sessions.

Business Rules:
- Attendance can only be marked by the faculty assigned to the session
- Attendance is per-session, per-student (unique together)
- Only LIVE batches require attendance marking
- Attendance can be updated within the allowed time window
- Soft delete not required (updates with audit trail instead)
"""
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime, timedelta


class Attendance(models.Model):
    """
    Attendance record for a student in a batch session.

    Records whether a student was present or absent in a specific class session.
    Faculty marks attendance manually per session.
    """

    class Status(models.TextChoices):
        """Attendance status choices."""
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"

    session = models.ForeignKey(
        'timetable.ClassSession',
        on_delete=models.PROTECT,
        related_name='attendance_records',
        help_text="The class session this attendance is for"
    )

    student = models.ForeignKey(
        'students.StudentProfile',
        on_delete=models.PROTECT,
        related_name='attendance_records',
        help_text="The student this attendance record is for"
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        help_text="Attendance status (Present/Absent)"
    )

    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='attendance_marked',
        help_text="Faculty who marked this attendance"
    )

    marked_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when attendance was last marked/updated"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when attendance was first created"
    )

    class Meta:
        app_label = 'attendance'
        db_table = 'attendance_records'
        verbose_name = 'Attendance Record'
        verbose_name_plural = 'Attendance Records'
        ordering = ['session', 'student']
        # Ensure unique attendance per session per student
        constraints = [
            models.UniqueConstraint(
                fields=['session', 'student'],
                name='unique_session_student_attendance'
            )
        ]
        indexes = [
            models.Index(fields=['session', 'status']),
            models.Index(fields=['student', 'status']),
            models.Index(fields=['marked_by', 'marked_at']),
        ]

    def __str__(self):
        return f"{self.student.user.full_name} - {self.session} - {self.status}"

    def clean(self):
        """
        Validate the attendance record.
        
        Business Rules:
        1. Student must belong to the session's batch
        2. Batch must be LIVE mode (not RECORDED)
        """
        super().clean()

        if self.session and self.student:
            # Check if student belongs to the batch
            batch = self.session.time_slot.batch
            from apps.batch_management.models import BatchStudent
            if not BatchStudent.objects.filter(
                batch=batch,
                student=self.student,
                is_active=True
            ).exists():
                raise ValidationError({
                    'student': f"Student is not enrolled in batch {batch.code}"
                })

            # Check if batch is LIVE mode
            if batch.template.mode != 'LIVE':
                raise ValidationError({
                    'session': f"Attendance can only be marked for LIVE batches. This batch is {batch.template.mode}."
                })

    @classmethod
    def is_marking_allowed(cls, session):
        """
        Check if attendance marking is allowed for a session.
        
        Rules:
        - Allowed from session.start_time on session_date
        - Until 24 hours after session.end_time on session_date
        
        Args:
            session: ClassSession instance
            
        Returns:
            tuple: (is_allowed: bool, reason: str)
        """
        now = timezone.now()
        
        # Get session datetime boundaries
        session_date = session.session_date
        start_time = session.get_start_time()
        end_time = session.get_end_time()
        
        # Combine date and time to create datetime objects
        session_start = timezone.make_aware(
            datetime.combine(session_date, start_time)
        )
        session_end = timezone.make_aware(
            datetime.combine(session_date, end_time)
        )
        
        # Marking deadline is 24 hours after session end
        marking_deadline = session_end + timedelta(hours=24)
        
        if now < session_start:
            return False, f"Attendance marking opens at {session_start.strftime('%Y-%m-%d %H:%M')}"
        
        if now > marking_deadline:
            return False, f"Attendance marking closed. Deadline was {marking_deadline.strftime('%Y-%m-%d %H:%M')}"
        
        return True, "Attendance marking is allowed"

    @classmethod
    def get_session_attendance_stats(cls, session):
        """
        Get attendance statistics for a session.
        
        Args:
            session: ClassSession instance
            
        Returns:
            dict with present_count, absent_count, total_enrolled
        """
        from apps.batch_management.models import BatchStudent
        
        batch = session.time_slot.batch
        total_enrolled = BatchStudent.objects.filter(
            batch=batch,
            is_active=True
        ).count()
        
        attendance = cls.objects.filter(session=session)
        present_count = attendance.filter(status=cls.Status.PRESENT).count()
        absent_count = attendance.filter(status=cls.Status.ABSENT).count()
        
        return {
            'total_enrolled': total_enrolled,
            'present_count': present_count,
            'absent_count': absent_count,
            'not_marked': total_enrolled - (present_count + absent_count)
        }

