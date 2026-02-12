"""
Faculty management models.
Schema-only definitions for faculty profiles and availability.
"""
from django.db import models
from django.conf import settings


class FacultyProfile(models.Model):
    """
    Faculty profile model.

    Represents a faculty member in the system.
    Links to User model via OneToOne relationship.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='faculty_profile',
        help_text="User account for this faculty member"
    )

    employee_code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique employee identification code"
    )

    designation = models.CharField(
        max_length=100,
        help_text="Faculty designation/title (e.g., 'Assistant Professor')"
    )

    joining_date = models.DateField(
        help_text="Date when faculty joined the institution"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this faculty member is currently active"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'faculty_profiles'
        verbose_name = 'Faculty Profile'
        verbose_name_plural = 'Faculty Profiles'
        ordering = ['employee_code']

    def __str__(self):
        return f"{self.employee_code} - {self.user.full_name}"


class FacultyAvailability(models.Model):
    """
    Faculty availability model.

    Tracks weekly recurring availability windows for faculty members.
    Used by timetable and batch assignment modules.
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

    faculty = models.ForeignKey(
        'FacultyProfile',
        on_delete=models.CASCADE,
        related_name='availabilities',
        help_text="Faculty member this availability belongs to"
    )

    day_of_week = models.IntegerField(
        choices=WEEKDAY_CHOICES,
        help_text="Day of the week (1=Monday, 7=Sunday)"
    )

    start_time = models.TimeField(
        help_text="Availability start time"
    )

    end_time = models.TimeField(
        help_text="Availability end time"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this availability slot is currently active"
    )

    class Meta:
        db_table = 'faculty_availabilities'
        verbose_name = 'Faculty Availability'
        verbose_name_plural = 'Faculty Availabilities'
        ordering = ['faculty', 'day_of_week', 'start_time']
        unique_together = [
            ['faculty', 'day_of_week', 'start_time', 'end_time']]

    def __str__(self):
        day_name = dict(self.WEEKDAY_CHOICES).get(self.day_of_week, '')
        return f"{self.faculty.employee_code} - {day_name} {self.start_time}-{self.end_time}"


class FacultyModuleAssignment(models.Model):
    """
    Faculty assignment to module.

    Tracks which faculty members are assigned to teach which modules.
    Maintains academic integrity with PROTECT constraints.
    """
    faculty = models.ForeignKey(
        'FacultyProfile',
        on_delete=models.PROTECT,
        related_name='module_assignments',
        help_text="Faculty member assigned to teach this module"
    )

    module = models.ForeignKey(
        'academics.Module',
        on_delete=models.PROTECT,
        related_name='faculty_assignments',
        help_text="Module assigned to the faculty"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this assignment is currently active"
    )

    assigned_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this assignment was created"
    )

    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='faculty_module_assignments_made',
        help_text="Admin who created this assignment"
    )

    class Meta:
        db_table = 'faculty_module_assignments'
        verbose_name = 'Faculty Module Assignment'
        verbose_name_plural = 'Faculty Module Assignments'
        unique_together = [['faculty', 'module']]
        ordering = ['-assigned_at']

    def __str__(self):
        return f"{self.faculty.employee_code} → {self.module.code}"


class FacultyBatchAssignment(models.Model):
    """
    Faculty assignment to batch.

    Tracks which faculty members are assigned to which batches.
    Maintains academic integrity with PROTECT constraints.
    """
    faculty = models.ForeignKey(
        'FacultyProfile',
        on_delete=models.PROTECT,
        related_name='batch_assignments',
        help_text="Faculty member assigned to this batch"
    )

    batch = models.ForeignKey(
        'batch_management.Batch',
        on_delete=models.PROTECT,
        related_name='faculty_assignments',
        help_text="Batch assigned to the faculty"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this assignment is currently active"
    )

    assigned_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this assignment was created"
    )

    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='faculty_batch_assignments_made',
        help_text="Admin who created this assignment"
    )

    class Meta:
        db_table = 'faculty_batch_assignments'
        verbose_name = 'Faculty Batch Assignment'
        verbose_name_plural = 'Faculty Batch Assignments'
        unique_together = [['faculty', 'batch']]
        ordering = ['-assigned_at']

    def __str__(self):
        return f"{self.faculty.employee_code} → Batch {self.batch.code}"
