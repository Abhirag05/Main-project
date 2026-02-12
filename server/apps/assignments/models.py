from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

User = get_user_model()


def faculty_assignment_upload_path(instance, filename):
    """
    Generate file path for faculty assignment uploads.
    Path structure: assignments/faculty_{faculty_id}/assignment_{assignment_id}/{filename}
    
    This ensures:
    - Organized storage by faculty
    - Easy identification of assignment files
    - Logical separation of files by assignment
    """
    if not instance.id:
        # Fallback if instance not yet saved - use faculty id as temporary identifier
        return f'assignments/faculty_{instance.faculty.id}/temp/{filename}'
    return f'assignments/faculty_{instance.faculty.id}/assignment_{instance.id}/{filename}'


def submission_file_path(instance, filename):
    """Generate file path for student submission files"""
    return f'submissions/{instance.assignment.batch.id}/{instance.assignment.id}/{instance.student.id}/{filename}'


class Assignment(models.Model):
    """
    Assignment model for faculty to create assignments for their batches.
    Each assignment is linked to a specific batch and subject.
    """
    batch = models.ForeignKey(
        'batch_management.Batch',
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    module = models.ForeignKey(
        'academics.Module',
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    faculty = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_assignments',
        limit_choices_to={'role__name': 'Faculty'}
    )
    title = models.CharField(max_length=255)
    description = models.TextField(help_text="Assignment instructions and requirements")
    assignment_file = models.FileField(
        upload_to=faculty_assignment_upload_path,
        null=True,
        blank=True,
        help_text="Optional reference material or assignment document (PDF, DOC, DOCX, ZIP max 10MB)"
    )
    max_marks = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Maximum marks for this assignment"
    )
    start_date = models.DateTimeField(
        default=timezone.now,
        help_text="When the assignment becomes visible to students"
    )
    due_date = models.DateTimeField(help_text="Submission deadline")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive assignments are hidden from students"
    )

    class Meta:
        app_label = 'assignments'
        db_table = 'assignments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['batch', 'module']),
            models.Index(fields=['faculty']),
            models.Index(fields=['due_date']),
            models.Index(fields=['start_date']),
        ]

    def __str__(self):
        return f"{self.title} - {self.batch.code} ({self.module.name})"

    @property
    def is_overdue(self):
        """Check if assignment deadline has passed"""
        return timezone.now() > self.due_date

    @property
    def total_submissions(self):
        """Count of submissions received"""
        return self.submissions.count()

    @property
    def evaluated_submissions(self):
        """Count of evaluated submissions"""
        return self.submissions.filter(marks_obtained__isnull=False).count()


class AssignmentSubmission(models.Model):
    """
    Student submission for an assignment.
    Each student can have only one submission per assignment (can be updated before due date).
    """
    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name='submissions'
    )
    student = models.ForeignKey(
        'students.StudentProfile',
        on_delete=models.CASCADE,
        related_name='assignment_submissions'
    )
    submission_file = models.FileField(
        upload_to=submission_file_path,
        help_text="Student's submitted work"
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Evaluation fields
    marks_obtained = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Marks awarded by faculty"
    )
    feedback = models.TextField(
        blank=True,
        help_text="Faculty feedback on submission"
    )
    evaluated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when faculty evaluated the submission"
    )
    evaluated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evaluated_submissions',
        limit_choices_to={'role__name': 'Faculty'}
    )

    class Meta:
        app_label = 'assignments'
        db_table = 'assignment_submissions'
        ordering = ['-submitted_at']
        unique_together = [['assignment', 'student']]
        indexes = [
            models.Index(fields=['assignment', 'student']),
            models.Index(fields=['student']),
        ]

    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.assignment.title}"

    @property
    def is_evaluated(self):
        """Check if submission has been graded"""
        return self.marks_obtained is not None

    @property
    def is_late_submission(self):
        """Check if submission was made after due date"""
        return self.submitted_at > self.assignment.due_date

    def clean(self):
        """Validate submission"""
        from django.core.exceptions import ValidationError
        
        # Validate marks_obtained does not exceed max_marks
        if self.marks_obtained is not None:
            if self.marks_obtained > self.assignment.max_marks:
                raise ValidationError({
                    'marks_obtained': f'Marks obtained cannot exceed maximum marks ({self.assignment.max_marks})'
                })
            if self.marks_obtained < 0:
                raise ValidationError({
                    'marks_obtained': 'Marks cannot be negative'
                })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class AssignmentSkillMapping(models.Model):
    """
    AssignmentSkillMapping model.

    Maps skills to assignments with weight percentages.
    Allows faculty to specify which skills are being evaluated through an assignment.
    """

    assignment = models.ForeignKey(
        Assignment,
        on_delete=models.CASCADE,
        related_name='skill_mappings',
        help_text="Assignment being mapped"
    )

    skill = models.ForeignKey(
        'assessments.Skill',
        on_delete=models.PROTECT,
        related_name='assignment_mappings',
        help_text="Skill being evaluated"
    )

    weight_percentage = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        default=100,
        help_text="Weight of this skill in the assignment (1-100)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'assignments'
        db_table = 'assignment_skill_mappings'
        verbose_name = 'Assignment Skill Mapping'
        verbose_name_plural = 'Assignment Skill Mappings'
        unique_together = [['assignment', 'skill']]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.assignment.title} → {self.skill.name} ({self.weight_percentage}%)"
