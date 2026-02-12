"""
Batch management models.
Handles batch templates, batches, student enrollment, mentor assignments, and transfers.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone


class BatchTemplate(models.Model):
    """
    Batch template model.

    Created by superadmin to define reusable batch configurations.
    Centre admins use these templates to create actual batches.
    """

    class Mode(models.TextChoices):
        """Delivery mode choices for batch."""
        LIVE = "LIVE", "Live"
        RECORDED = "RECORDED", "Recorded"

    course = models.ForeignKey(
        "academics.Course",
        on_delete=models.PROTECT,
        related_name="batch_templates",
        help_text="Course this template is for"
    )

    name = models.CharField(
        max_length=100,
        help_text="Template name (e.g., FSWD Live Template)"
    )

    mode = models.CharField(
        max_length=20,
        choices=Mode.choices,
        help_text="Delivery mode (Live or Recorded)"
    )

    max_students = models.PositiveIntegerField(
        help_text="Maximum number of students allowed"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this template is available for use"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "batch_templates"
        verbose_name = "Batch Template"
        verbose_name_plural = "Batch Templates"
        unique_together = [["course", "mode"]]
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.mode})"


class Batch(models.Model):
    """
    Batch model.

    Actual batches created from templates by centre admin.
    Represents a specific cohort of students for a course.
    """

    class Status(models.TextChoices):
        """Batch lifecycle status."""
        ACTIVE = "ACTIVE", "Active"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    template = models.ForeignKey(
        BatchTemplate,
        on_delete=models.PROTECT,
        related_name="batches",
        help_text="Template this batch was created from"
    )

    centre = models.ForeignKey(
        "centres.Centre",
        on_delete=models.PROTECT,
        related_name="batches",
        help_text="Centre this batch belongs to"
    )

    mentor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mentored_batches",
        help_text="Batch mentor assigned to this batch"
    )

    code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Auto-generated unique batch code"
    )

    start_date = models.DateField(
        help_text="Batch start date"
    )

    end_date = models.DateField(
        help_text="Batch end date"
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        help_text="Current batch status"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this batch is currently active"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "batches"
        verbose_name = "Batch"
        verbose_name_plural = "Batches"
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.code} ({self.status})"


class BatchMentorAssignment(models.Model):
    """
    BatchMentorAssignment model.

    Tracks mentor assignments to batches with full history.
    A mentor can have ONLY ONE active assignment at a time.
    A batch can have ONLY ONE active mentor at a time.
    Historical assignments are preserved (soft deactivate).
    """

    mentor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="mentor_assignments",
        help_text="The mentor assigned to the batch"
    )

    batch = models.ForeignKey(
        'Batch',
        on_delete=models.PROTECT,
        related_name="mentor_assignments",
        help_text="The batch the mentor is assigned to"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this assignment is currently active"
    )

    assigned_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the mentor was assigned to this batch"
    )

    unassigned_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the mentor was unassigned from this batch"
    )

    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mentor_assignments_made",
        help_text="Admin who made this assignment"
    )

    class Meta:
        db_table = "batch_mentor_assignments"
        verbose_name = "Batch Mentor Assignment"
        verbose_name_plural = "Batch Mentor Assignments"
        ordering = ["-assigned_at"]
        # Ensure only one active assignment per batch
        constraints = [
            models.UniqueConstraint(
                fields=['batch'],
                condition=models.Q(is_active=True),
                name='unique_active_mentor_per_batch'
            ),
            models.UniqueConstraint(
                fields=['mentor'],
                condition=models.Q(is_active=True),
                name='unique_active_batch_per_mentor'
            ),
        ]

    def __str__(self):
        status = "Active" if self.is_active else "Inactive"
        return f"{self.mentor.full_name} → {self.batch.code} ({status})"

    def deactivate(self):
        """Deactivate this assignment."""
        self.is_active = False
        self.unassigned_at = timezone.now()
        self.save(update_fields=['is_active', 'unassigned_at'])


class BatchStudent(models.Model):
    """
    BatchStudent model.

    Links students to batches (enrollment).
    Managed by centre admin.
    """

    batch = models.ForeignKey(
        Batch,
        on_delete=models.PROTECT,
        related_name="students",
        help_text="Batch the student is enrolled in"
    )

    student = models.ForeignKey(
        "students.StudentProfile",
        on_delete=models.PROTECT,
        related_name="batch_memberships",
        help_text="Student enrolled in this batch"
    )

    joined_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When student joined this batch"
    )

    left_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When student left this batch (if applicable)"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this enrollment is currently active"
    )

    class Meta:
        db_table = "batch_students"
        verbose_name = "Batch Student"
        verbose_name_plural = "Batch Students"
        unique_together = [["batch", "student"]]
        ordering = ["batch", "joined_at"]

    def __str__(self):
        return f"{self.student.user.full_name} in {self.batch.code}"


class BatchRecordedSession(models.Model):
    """
    Recorded session entry for recorded batches.
    Stores meeting date, topic and recording link uploaded by mentor.
    """

    batch = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
        related_name="recorded_sessions",
        help_text="Batch this session belongs to"
    )

    session_date = models.DateField(
        help_text="Date of the recorded session"
    )

    meeting_topic = models.CharField(
        max_length=200,
        help_text="Topic/title of the meeting"
    )

    recording_link = models.URLField(
        max_length=500,
        help_text="URL to the recorded meeting (YouTube, Zoom, etc.)"
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_sessions",
        help_text="Mentor who uploaded this session"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "batch_recorded_sessions"
        verbose_name = "Batch Recorded Session"
        verbose_name_plural = "Batch Recorded Sessions"
        ordering = ["-session_date", "-created_at"]
        indexes = [
            models.Index(fields=["batch", "-session_date"],
                         name="batch_recor_batch_i_e38e43_idx")
        ]

    def __str__(self):
        return f"{self.batch.code} - {self.session_date}"


class BatchTransferLog(models.Model):
    """
    BatchTransferLog model.

    Audit log for tracking student transfers between batches.
    Maintains complete transfer history.
    """

    student = models.ForeignKey(
        "students.StudentProfile",
        on_delete=models.PROTECT,
        related_name="batch_transfers",
        help_text="Student being transferred"
    )

    from_batch = models.ForeignKey(
        Batch,
        on_delete=models.PROTECT,
        related_name="transfers_out",
        help_text="Source batch"
    )

    to_batch = models.ForeignKey(
        Batch,
        on_delete=models.PROTECT,
        related_name="transfers_in",
        help_text="Destination batch"
    )

    transferred_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="batch_transfers_performed",
        help_text="Admin who performed the transfer"
    )

    reason = models.TextField(
        blank=True,
        help_text="Reason for transfer"
    )

    transferred_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the transfer occurred"
    )

    audit_log = models.ForeignKey(
        "audit.AuditLog",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="batch_transfers",
        help_text="Linked audit log entry"
    )

    class Meta:
        db_table = "batch_transfer_logs"
        verbose_name = "Batch Transfer Log"
        verbose_name_plural = "Batch Transfer Logs"
        ordering = ["-transferred_at"]

    def __str__(self):
        return f"{self.student.user.full_name}: {self.from_batch.code} → {self.to_batch.code}"
