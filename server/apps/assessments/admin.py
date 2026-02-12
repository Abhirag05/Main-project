"""
Assessment admin configuration.

Admin interface for managing assessments, questions, skills, and results.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone

from .models import (
    Assessment,
    AssessmentQuestion,
    AssessmentOption,
    Skill,
    AssessmentSkillMapping,
    StudentAssessmentAttempt,
    StudentAnswer,
    StudentSkill,
)


class AssessmentQuestionInline(admin.TabularInline):
    """Inline for assessment questions."""
    model = AssessmentQuestion
    extra = 0
    fields = ('question_text', 'marks', 'order', 'is_active')
    readonly_fields = ('id',)
    ordering = ('order',)


class AssessmentOptionInline(admin.TabularInline):
    """Inline for question options."""
    model = AssessmentOption
    extra = 0
    fields = ('option_label', 'option_text', 'is_correct')
    ordering = ('option_label',)


class AssessmentSkillMappingInline(admin.TabularInline):
    """Inline for skill mappings."""
    model = AssessmentSkillMapping
    extra = 0
    fields = ('skill', 'weight_percentage')
    autocomplete_fields = ('skill',)


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    """Admin for assessments."""
    list_display = (
        'title',
        'faculty_name',
        'batch_code',
        'subject_name',
        'status',
        'total_marks',
        'start_time',
        'is_active',
    )
    list_filter = ('status', 'batch', 'is_active', 'created_at')
    search_fields = ('title', 'faculty__user__first_name', 'faculty__user__last_name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'
    autocomplete_fields = ('faculty', 'batch', 'subject')
    inlines = [AssessmentQuestionInline, AssessmentSkillMappingInline]

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'faculty', 'batch', 'subject')
        }),
        ('Settings', {
            'fields': ('total_marks', 'passing_percentage', 'duration_minutes')
        }),
        ('Schedule', {
            'fields': ('start_time', 'end_time', 'status')
        }),
        ('Status', {
            'fields': ('is_active', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def faculty_name(self, obj):
        return obj.faculty.user.get_full_name()
    faculty_name.short_description = 'Faculty'
    faculty_name.admin_order_field = 'faculty__user__first_name'

    def batch_code(self, obj):
        return obj.batch.code
    batch_code.short_description = 'Batch'
    batch_code.admin_order_field = 'batch__code'

    def subject_name(self, obj):
        return obj.subject.name if obj.subject else '-'
    subject_name.short_description = 'Subject'


@admin.register(AssessmentQuestion)
class AssessmentQuestionAdmin(admin.ModelAdmin):
    """Admin for questions."""
    list_display = ('truncated_text', 'assessment_title', 'marks', 'order', 'is_active')
    list_filter = ('is_active', 'assessment__batch')
    search_fields = ('question_text', 'assessment__title')
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ('assessment',)
    inlines = [AssessmentOptionInline]
    ordering = ('assessment', 'order')

    def truncated_text(self, obj):
        return obj.question_text[:50] + '...' if len(obj.question_text) > 50 else obj.question_text
    truncated_text.short_description = 'Question'

    def assessment_title(self, obj):
        return obj.assessment.title
    assessment_title.short_description = 'Assessment'
    assessment_title.admin_order_field = 'assessment__title'


@admin.register(AssessmentOption)
class AssessmentOptionAdmin(admin.ModelAdmin):
    """Admin for options."""
    list_display = ('truncated_text', 'question_preview', 'option_label', 'is_correct')
    list_filter = ('is_correct',)
    search_fields = ('option_text', 'question__question_text')
    autocomplete_fields = ('question',)

    def truncated_text(self, obj):
        return obj.option_text[:50] + '...' if len(obj.option_text) > 50 else obj.option_text
    truncated_text.short_description = 'Option'

    def question_preview(self, obj):
        return obj.question.question_text[:30] + '...' if len(obj.question.question_text) > 30 else obj.question.question_text
    question_preview.short_description = 'Question'


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    """Admin for skills."""
    list_display = ('name', 'course_name', 'is_active')
    list_filter = ('course', 'is_active')
    search_fields = ('name', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ('course',)

    def course_name(self, obj):
        return obj.course.name
    course_name.short_description = 'Course'
    course_name.admin_order_field = 'course__name'


@admin.register(AssessmentSkillMapping)
class AssessmentSkillMappingAdmin(admin.ModelAdmin):
    """Admin for skill mappings."""
    list_display = ('assessment_title', 'skill_name', 'weight_percentage')
    list_filter = ('assessment__batch', 'skill__course')
    autocomplete_fields = ('assessment', 'skill')

    def assessment_title(self, obj):
        return obj.assessment.title
    assessment_title.short_description = 'Assessment'

    def skill_name(self, obj):
        return obj.skill.name
    skill_name.short_description = 'Skill'


class StudentAnswerInline(admin.TabularInline):
    """Inline for student answers."""
    model = StudentAnswer
    extra = 0
    fields = ('question', 'selected_option', 'is_correct', 'marks_obtained')
    readonly_fields = ('is_correct', 'marks_obtained')


@admin.register(StudentAssessmentAttempt)
class StudentAssessmentAttemptAdmin(admin.ModelAdmin):
    """Admin for assessment attempts."""
    list_display = (
        'student_name',
        'assessment_title',
        'status',
        'total_score_display',
        'percentage_display',
        'started_at',
        'submitted_at',
    )
    list_filter = ('status', 'assessment__batch', 'submitted_at')
    search_fields = (
        'student__user__first_name',
        'student__user__last_name',
        'assessment__title'
    )
    readonly_fields = ('id', 'created_at', 'updated_at')
    date_hierarchy = 'started_at'
    autocomplete_fields = ('student', 'assessment')
    inlines = [StudentAnswerInline]

    def student_name(self, obj):
        return obj.student.user.get_full_name()
    student_name.short_description = 'Student'
    student_name.admin_order_field = 'student__user__first_name'

    def assessment_title(self, obj):
        return obj.assessment.title
    assessment_title.short_description = 'Assessment'

    def total_score_display(self, obj):
        if obj.total_marks_obtained is not None:
            return f"{obj.total_marks_obtained}/{obj.assessment.total_marks}"
        return '-'
    total_score_display.short_description = 'Score'

    def percentage_display(self, obj):
        if obj.percentage is not None:
            color = 'green' if obj.percentage >= 40 else 'red'
            return format_html(
                '<span style="color: {}">{:.1f}%</span>',
                color,
                obj.percentage
            )
        return '-'
    percentage_display.short_description = 'Percentage'
    
    def created_at(self, obj):
        return obj.started_at
    created_at.short_description = 'Created At'
    
    def updated_at(self, obj):
        return obj.submitted_at or obj.started_at
    updated_at.short_description = 'Updated At'


@admin.register(StudentAnswer)
class StudentAnswerAdmin(admin.ModelAdmin):
    """Admin for student answers."""
    list_display = (
        'student_name',
        'question_preview',
        'selected_option_preview',
        'is_correct',
        'marks_obtained'
    )
    list_filter = ('is_correct', 'attempt__assessment__batch')
    search_fields = ('attempt__student__user__first_name', 'question__question_text')
    autocomplete_fields = ('attempt', 'question', 'selected_option')

    def student_name(self, obj):
        return obj.attempt.student.user.get_full_name()
    student_name.short_description = 'Student'

    def question_preview(self, obj):
        return obj.question.question_text[:40] + '...' if len(obj.question.question_text) > 40 else obj.question.question_text
    question_preview.short_description = 'Question'

    def selected_option_preview(self, obj):
        if obj.selected_option:
            text = obj.selected_option.option_text
            return text[:30] + '...' if len(text) > 30 else text
        return '-'
    selected_option_preview.short_description = 'Selected'


@admin.register(StudentSkill)
class StudentSkillAdmin(admin.ModelAdmin):
    """Admin for student skills."""
    list_display = (
        'student_name',
        'skill_name',
        'level',
        'score_display',
        'attempts_count',
        'last_updated_display'
    )
    list_filter = ('level', 'skill__course')
    search_fields = ('student__user__first_name', 'student__user__last_name', 'skill__name')
    readonly_fields = ('id',)
    autocomplete_fields = ('student', 'skill')

    def student_name(self, obj):
        return obj.student.user.get_full_name()
    student_name.short_description = 'Student'
    student_name.admin_order_field = 'student__user__first_name'

    def skill_name(self, obj):
        return obj.skill.name
    skill_name.short_description = 'Skill'
    skill_name.admin_order_field = 'skill__name'

    def score_display(self, obj):
        return f"{obj.percentage_score:.1f}%"
    score_display.short_description = 'Score'

    def last_updated_display(self, obj):
        return obj.last_updated.strftime('%Y-%m-%d %H:%M')
    last_updated_display.short_description = 'Last Updated'
