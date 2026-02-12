"""
Assessment models for MCQ-based assessments.

This module contains all models for the Faculty Assessment feature:
- Assessment: Main assessment entity
- AssessmentQuestion: MCQ questions
- AssessmentOption: Options for each question
- AssessmentSkillMapping: Skills evaluated by assessment
- StudentAssessmentAttempt: Student's attempt at an assessment
- StudentAnswer: Individual answers submitted by students
- StudentSkill: Student's skill levels (computed from attempts)
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class Assessment(models.Model):
    """
    Assessment model.

    Represents an MCQ-based assessment created by faculty for a batch/subject.
    Tracks lifecycle from DRAFT to COMPLETED.
    """

    class Status(models.TextChoices):
        """Assessment lifecycle status."""
        DRAFT = "DRAFT", "Draft"
        SCHEDULED = "SCHEDULED", "Scheduled"
        ACTIVE = "ACTIVE", "Active"
        COMPLETED = "COMPLETED", "Completed"

    batch = models.ForeignKey(
        'batch_management.Batch',
        on_delete=models.PROTECT,
        related_name='assessments',
        help_text="Batch this assessment is for"
    )

    subject = models.ForeignKey(
        'academics.Module',
        on_delete=models.PROTECT,
        related_name='assessments',
        help_text="Subject/Module this assessment covers"
    )

    faculty = models.ForeignKey(
        'faculty.FacultyProfile',
        on_delete=models.PROTECT,
        related_name='assessments',
        help_text="Faculty who created this assessment"
    )

    title = models.CharField(
        max_length=255,
        help_text="Assessment title"
    )

    description = models.TextField(
        blank=True,
        help_text="Optional description or instructions"
    )

    total_marks = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Total marks for this assessment"
    )

    duration_minutes = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Duration in minutes"
    )

    passing_percentage = models.PositiveIntegerField(
        default=40,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Minimum percentage required to pass"
    )

    start_time = models.DateTimeField(
        help_text="When the assessment becomes available"
    )

    end_time = models.DateTimeField(
        help_text="When the assessment closes"
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        help_text="Current assessment status"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Soft delete flag"
    )

    skills = models.JSONField(
        default=list,
        blank=True,
        help_text="List of skill names evaluated by this assessment (from Course skills)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'assessments'
        db_table = 'assessments'
        verbose_name = 'Assessment'
        verbose_name_plural = 'Assessments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['batch', 'status']),
            models.Index(fields=['faculty', 'status']),
            models.Index(fields=['start_time', 'end_time']),
        ]

    def __str__(self):
        return f"{self.title} ({self.batch.code})"

    def clean(self):
        """Validate assessment data."""
        from django.core.exceptions import ValidationError
        if self.end_time and self.start_time and self.end_time <= self.start_time:
            raise ValidationError("End time must be after start time")

    @property
    def questions_count(self):
        """Return the number of questions in this assessment."""
        return self.questions.count()

    @property
    def is_available(self):
        """Check if assessment is currently available for students."""
        now = timezone.now()
        return (
            (self.status == self.Status.ACTIVE or self.status == self.Status.SCHEDULED) and
            self.start_time <= now <= self.end_time and
            self.is_active
        )

    def update_status_based_on_time(self):
        """Update assessment status based on current time."""
        now = timezone.now()

        if self.status == self.Status.SCHEDULED and now >= self.start_time:
            if now <= self.end_time:
                self.status = self.Status.ACTIVE
                self.save(update_fields=['status', 'updated_at'])
            else:
                self.status = self.Status.COMPLETED
                self.save(update_fields=['status', 'updated_at'])
        elif self.status == self.Status.ACTIVE and now > self.end_time:
            self.status = self.Status.COMPLETED
            self.save(update_fields=['status', 'updated_at'])


class AssessmentQuestion(models.Model):
    """
    AssessmentQuestion model.

    Represents an MCQ question in an assessment.
    """

    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name='questions',
        help_text="Assessment this question belongs to"
    )

    question_text = models.TextField(
        help_text="The question text"
    )

    marks = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Marks for this question"
    )

    order = models.PositiveIntegerField(
        default=0,
        help_text="Display order of the question"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Soft delete flag"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'assessments'
        db_table = 'assessment_questions'
        verbose_name = 'Assessment Question'
        verbose_name_plural = 'Assessment Questions'
        ordering = ['order', 'id']
        indexes = [
            models.Index(fields=['assessment', 'order']),
        ]

    def __str__(self):
        return f"Q{self.order}: {self.question_text[:50]}..."

    @property
    def correct_option(self):
        """Return the correct option for this question."""
        return self.options.filter(is_correct=True).first()


class AssessmentOption(models.Model):
    """
    AssessmentOption model.

    Represents an option for an MCQ question.
    Exactly one option should be marked as correct.
    """

    class OptionLabel(models.TextChoices):
        """Option labels."""
        A = "A", "A"
        B = "B", "B"
        C = "C", "C"
        D = "D", "D"

    question = models.ForeignKey(
        AssessmentQuestion,
        on_delete=models.CASCADE,
        related_name='options',
        help_text="Question this option belongs to"
    )

    option_label = models.CharField(
        max_length=1,
        choices=OptionLabel.choices,
        help_text="Option label (A, B, C, D)"
    )

    option_text = models.TextField(
        help_text="The option text"
    )

    is_correct = models.BooleanField(
        default=False,
        help_text="Whether this is the correct answer"
    )

    class Meta:
        app_label = 'assessments'
        db_table = 'assessment_options'
        verbose_name = 'Assessment Option'
        verbose_name_plural = 'Assessment Options'
        ordering = ['option_label']
        unique_together = [['question', 'option_label']]

    def __str__(self):
        correct = "✓" if self.is_correct else ""
        return f"{self.option_label}. {self.option_text[:30]}... {correct}"


class Skill(models.Model):
    """
    Skill model.

    Represents a skill that can be evaluated through assessments.
    Skills are typically defined at course level.
    """

    course = models.ForeignKey(
        'academics.Course',
        on_delete=models.PROTECT,
        related_name='assessment_skills',
        help_text="Course this skill belongs to"
    )

    name = models.CharField(
        max_length=100,
        help_text="Skill name (e.g., 'Python Basics', 'Data Structures')"
    )

    description = models.TextField(
        blank=True,
        help_text="Skill description"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this skill is active"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'assessments'
        db_table = 'skills'
        verbose_name = 'Skill'
        verbose_name_plural = 'Skills'
        ordering = ['name']
        unique_together = [['course', 'name']]

    def __str__(self):
        return f"{self.name} ({self.course.code})"


class AssessmentSkillMapping(models.Model):
    """
    AssessmentSkillMapping model.

    Maps skills to assessments with weight percentages.
    Total weight across all skills for an assessment should sum to 100%.
    """

    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name='skill_mappings',
        help_text="Assessment being mapped"
    )

    skill = models.ForeignKey(
        Skill,
        on_delete=models.PROTECT,
        related_name='assessment_mappings',
        help_text="Skill being evaluated"
    )

    weight_percentage = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Weight of this skill in the assessment (1-100)"
    )

    class Meta:
        app_label = 'assessments'
        db_table = 'assessment_skill_mappings'
        verbose_name = 'Assessment Skill Mapping'
        verbose_name_plural = 'Assessment Skill Mappings'
        unique_together = [['assessment', 'skill']]

    def __str__(self):
        return f"{self.assessment.title} → {self.skill.name} ({self.weight_percentage}%)"


class StudentAssessmentAttempt(models.Model):
    """
    StudentAssessmentAttempt model.

    Records a student's attempt at an assessment.
    One attempt per student per assessment (for now).
    """

    class AttemptStatus(models.TextChoices):
        """Attempt status."""
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        SUBMITTED = "SUBMITTED", "Submitted"
        EVALUATED = "EVALUATED", "Evaluated"

    student = models.ForeignKey(
        'students.StudentProfile',
        on_delete=models.PROTECT,
        related_name='assessment_attempts',
        help_text="Student who made this attempt"
    )

    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.PROTECT,
        related_name='attempts',
        help_text="Assessment being attempted"
    )

    started_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the attempt started"
    )

    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the attempt was submitted"
    )

    total_marks_obtained = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total marks obtained"
    )

    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Percentage score"
    )

    status = models.CharField(
        max_length=20,
        choices=AttemptStatus.choices,
        default=AttemptStatus.IN_PROGRESS,
        help_text="Current attempt status"
    )

    class Meta:
        app_label = 'assessments'
        db_table = 'student_assessment_attempts'
        verbose_name = 'Student Assessment Attempt'
        verbose_name_plural = 'Student Assessment Attempts'
        unique_together = [['student', 'assessment']]
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['assessment', 'status']),
        ]

    def __str__(self):
        return f"{self.student.user.full_name} - {self.assessment.title}"

    @property
    def is_passed(self):
        """Check if student passed the assessment."""
        if self.percentage is None:
            return None
        return self.percentage >= self.assessment.passing_percentage

    @property
    def is_expired(self):
        """Check if the assessment attempt has expired."""
        from django.utils import timezone
        now = timezone.now()
        # Consider expired if:
        # 1. Assessment has ended, OR
        # 2. More than assessment duration has passed since start
        assessment_end_time = self.assessment.end_time
        duration_end_time = self.started_at + \
            timezone.timedelta(minutes=self.assessment.duration_minutes)

        # Whichever comes first
        effective_end_time = min(assessment_end_time, duration_end_time)
        return now > effective_end_time

    @property
    def result_status(self):
        """Get result status (PASS/FAIL/PENDING)."""
        if self.status != self.AttemptStatus.EVALUATED:
            return "PENDING"
        return "PASS" if self.is_passed else "FAIL"


class StudentAnswer(models.Model):
    """
    StudentAnswer model.

    Records individual answers submitted by students.
    """

    attempt = models.ForeignKey(
        StudentAssessmentAttempt,
        on_delete=models.CASCADE,
        related_name='answers',
        help_text="Attempt this answer belongs to"
    )

    question = models.ForeignKey(
        AssessmentQuestion,
        on_delete=models.PROTECT,
        related_name='student_answers',
        help_text="Question being answered"
    )

    selected_option = models.ForeignKey(
        AssessmentOption,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='student_selections',
        help_text="Option selected by student (null if unanswered)"
    )

    is_correct = models.BooleanField(
        null=True,
        blank=True,
        help_text="Whether the answer is correct (set during evaluation)"
    )

    marks_obtained = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Marks obtained for this answer"
    )

    class Meta:
        app_label = 'assessments'
        db_table = 'student_answers'
        verbose_name = 'Student Answer'
        verbose_name_plural = 'Student Answers'
        unique_together = [['attempt', 'question']]

    def __str__(self):
        return f"{self.attempt.student.user.full_name} - Q{self.question.order}"


class QuestionBank(models.Model):
    """
    QuestionBank model.

    A collection of questions for a specific subject, created by faculty.
    Questions can be imported from AIKEN format files.
    """

    name = models.CharField(
        max_length=255,
        help_text="Name of the question bank"
    )

    subject = models.ForeignKey(
        'academics.Module',
        on_delete=models.PROTECT,
        related_name='question_banks',
        help_text="Subject/Module this bank is for"
    )

    faculty = models.ForeignKey(
        'faculty.FacultyProfile',
        on_delete=models.PROTECT,
        related_name='question_banks',
        help_text="Faculty who created this bank"
    )

    description = models.TextField(
        blank=True,
        help_text="Optional description"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Soft delete flag"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'assessments'
        db_table = 'question_banks'
        verbose_name = 'Question Bank'
        verbose_name_plural = 'Question Banks'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.subject.name})"

    @property
    def questions_count(self):
        """Return the number of questions in this bank."""
        return self.questions.filter(is_active=True).count()


class BankQuestion(models.Model):
    """
    BankQuestion model.

    A question stored in a question bank.
    Can be imported into assessments.
    """

    bank = models.ForeignKey(
        QuestionBank,
        on_delete=models.CASCADE,
        related_name='questions',
        help_text="Question bank this question belongs to"
    )

    question_text = models.TextField(
        help_text="The question text"
    )

    option_a = models.TextField(
        help_text="Option A text"
    )

    option_b = models.TextField(
        help_text="Option B text"
    )

    option_c = models.TextField(
        help_text="Option C text"
    )

    option_d = models.TextField(
        help_text="Option D text"
    )

    correct_option = models.CharField(
        max_length=1,
        choices=[('A', 'A'), ('B', 'B'), ('C', 'C'), ('D', 'D')],
        help_text="The correct answer (A, B, C, or D)"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Soft delete flag"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'assessments'
        db_table = 'bank_questions'
        verbose_name = 'Bank Question'
        verbose_name_plural = 'Bank Questions'
        ordering = ['id']

    def __str__(self):
        return f"{self.question_text[:50]}..."


class StudentSkill(models.Model):
    """
    StudentSkill model.

    Tracks student skill levels computed from assessment attempts.
    Levels are determined based on percentage thresholds.
    """

    class SkillLevel(models.TextChoices):
        """Skill level choices based on percentage."""
        NOT_ACQUIRED = "NOT_ACQUIRED", "Not Acquired"  # 0-39%
        BEGINNER = "BEGINNER", "Beginner"              # 40-59%
        INTERMEDIATE = "INTERMEDIATE", "Intermediate"  # 60-79%
        ADVANCED = "ADVANCED", "Advanced"              # 80-100%

    student = models.ForeignKey(
        'students.StudentProfile',
        on_delete=models.CASCADE,
        related_name='skills',
        help_text="Student this skill belongs to"
    )

    skill = models.ForeignKey(
        Skill,
        on_delete=models.PROTECT,
        related_name='student_skills',
        help_text="The skill being tracked"
    )

    percentage_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Aggregated percentage score for this skill"
    )

    level = models.CharField(
        max_length=20,
        choices=SkillLevel.choices,
        default=SkillLevel.NOT_ACQUIRED,
        help_text="Current skill level"
    )

    attempts_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of assessments contributing to this skill"
    )

    last_updated = models.DateTimeField(
        auto_now=True,
        help_text="When this skill was last updated"
    )

    class Meta:
        app_label = 'assessments'
        db_table = 'student_skills'
        verbose_name = 'Student Skill'
        verbose_name_plural = 'Student Skills'
        unique_together = [['student', 'skill']]
        ordering = ['skill__name']
        indexes = [
            models.Index(fields=['student', 'level']),
        ]

    def __str__(self):
        return f"{self.student.user.full_name} - {self.skill.name}: {self.level}"

    @staticmethod
    def get_level_from_percentage(percentage):
        """
        Determine skill level from percentage.

        Thresholds:
        - 0-39: NOT_ACQUIRED
        - 40-59: BEGINNER
        - 60-79: INTERMEDIATE
        - 80-100: ADVANCED
        """
        if percentage < 40:
            return StudentSkill.SkillLevel.NOT_ACQUIRED
        elif percentage < 60:
            return StudentSkill.SkillLevel.BEGINNER
        elif percentage < 80:
            return StudentSkill.SkillLevel.INTERMEDIATE
        else:
            return StudentSkill.SkillLevel.ADVANCED
