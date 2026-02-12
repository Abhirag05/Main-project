"""
Assessment serializers.

This module contains serializers for all assessment-related models,
handling validation, nested representations, and business logic.
"""
from rest_framework import serializers
from django.db import transaction
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


# ==================== Skill Serializers ====================

class SkillSerializer(serializers.ModelSerializer):
    """Serializer for Skill model."""
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)

    class Meta:
        model = Skill
        fields = [
            'id', 'name', 'description', 'course', 'course_name', 'course_code',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SkillCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating skills."""

    class Meta:
        model = Skill
        fields = ['id', 'name', 'description', 'course']
        read_only_fields = ['id']


# ==================== Option Serializers ====================

class AssessmentOptionSerializer(serializers.ModelSerializer):
    """Serializer for AssessmentOption model."""

    class Meta:
        model = AssessmentOption
        fields = ['id', 'option_label', 'option_text', 'is_correct']
        read_only_fields = ['id']


class AssessmentOptionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating assessment options."""

    class Meta:
        model = AssessmentOption
        fields = ['option_label', 'option_text', 'is_correct']


class AssessmentOptionStudentSerializer(serializers.ModelSerializer):
    """Serializer for options shown to students (without is_correct)."""

    class Meta:
        model = AssessmentOption
        fields = ['id', 'option_label', 'option_text']


# ==================== Question Serializers ====================

class AssessmentQuestionSerializer(serializers.ModelSerializer):
    """Serializer for AssessmentQuestion with nested options."""
    options = AssessmentOptionSerializer(many=True, read_only=True)

    class Meta:
        model = AssessmentQuestion
        fields = ['id', 'question_text', 'marks',
                  'order', 'options', 'is_active']
        read_only_fields = ['id']


class AssessmentQuestionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating questions with nested options."""
    options = AssessmentOptionCreateSerializer(many=True, required=True)

    class Meta:
        model = AssessmentQuestion
        fields = ['question_text', 'marks', 'order', 'options']

    def validate_options(self, value):
        """Validate options data."""
        if len(value) < 2:
            raise serializers.ValidationError(
                "At least 2 options are required")

        correct_count = sum(1 for opt in value if opt.get('is_correct', False))
        if correct_count != 1:
            raise serializers.ValidationError(
                "Exactly one option must be marked as correct")

        labels = [opt.get('option_label') for opt in value]
        if len(labels) != len(set(labels)):
            raise serializers.ValidationError("Option labels must be unique")

        return value

    def create(self, validated_data):
        """Create question with nested options."""
        options_data = validated_data.pop('options')
        question = AssessmentQuestion.objects.create(**validated_data)

        for option_data in options_data:
            AssessmentOption.objects.create(question=question, **option_data)

        return question

    def update(self, instance, validated_data):
        """Update question and replace options."""
        options_data = validated_data.pop('options', None)

        # Update question fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Replace options if provided
        if options_data is not None:
            instance.options.all().delete()
            for option_data in options_data:
                AssessmentOption.objects.create(
                    question=instance, **option_data)

        return instance


class AssessmentQuestionStudentSerializer(serializers.ModelSerializer):
    """Serializer for questions shown to students (without correct answers)."""
    options = AssessmentOptionStudentSerializer(many=True, read_only=True)

    class Meta:
        model = AssessmentQuestion
        fields = ['id', 'question_text', 'marks', 'order', 'options']


# ==================== Skill Mapping Serializers ====================

class AssessmentSkillMappingSerializer(serializers.ModelSerializer):
    """Serializer for AssessmentSkillMapping."""
    skill_name = serializers.CharField(source='skill.name', read_only=True)

    class Meta:
        model = AssessmentSkillMapping
        fields = ['id', 'skill', 'skill_name', 'weight_percentage']
        read_only_fields = ['id']


class AssessmentSkillMappingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating skill mappings."""

    class Meta:
        model = AssessmentSkillMapping
        fields = ['skill', 'weight_percentage']


# ==================== Assessment Serializers ====================

class AssessmentListSerializer(serializers.ModelSerializer):
    """Serializer for assessment list view."""
    batch = serializers.SerializerMethodField()
    subject = serializers.SerializerMethodField()
    faculty = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()
    start_datetime = serializers.DateTimeField(
        source='start_time', read_only=True)
    end_datetime = serializers.DateTimeField(source='end_time', read_only=True)

    class Meta:
        model = Assessment
        fields = [
            'id', 'title', 'description', 'batch', 'subject', 'faculty',
            'total_marks', 'duration_minutes', 'passing_percentage',
            'start_datetime', 'end_datetime', 'status', 'questions_count',
            'skills', 'is_active', 'created_at', 'updated_at'
        ]

    def get_batch(self, obj):
        if not obj.batch:
            return None
        return {
            'id': obj.batch.id,
            'code': obj.batch.code,
            'course_name': obj.batch.template.course.name if obj.batch.template and obj.batch.template.course else 'N/A',
            'centre_name': obj.batch.centre.name if obj.batch.centre else 'N/A',
            'status': obj.batch.status,
        }

    def get_subject(self, obj):
        if not obj.subject:
            return None
        return {
            'id': obj.subject.id,
            'code': obj.subject.code,
            'name': obj.subject.name,
        }

    def get_faculty(self, obj):
        if not obj.faculty:
            return None
        return {
            'id': obj.faculty.id,
            'full_name': obj.faculty.user.full_name if hasattr(obj.faculty.user, 'full_name') and obj.faculty.user.full_name else obj.faculty.user.email,
            'email': obj.faculty.user.email,
        }

    def get_skills(self, obj):
        """Get skills from skill mappings."""
        skill_mappings = obj.skill_mappings.all()
        return [
            {
                'id': mapping.skill.id,
                'name': mapping.skill.name,
            }
            for mapping in skill_mappings
        ]


class StudentAssessmentListSerializer(serializers.ModelSerializer):
    """Serializer for student assessment list view with attempt info."""
    batch = serializers.SerializerMethodField()
    subject = serializers.SerializerMethodField()
    faculty = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()
    start_datetime = serializers.DateTimeField(
        source='start_time', read_only=True)
    end_datetime = serializers.DateTimeField(source='end_time', read_only=True)
    attempt_info = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            'id', 'title', 'description', 'batch', 'subject', 'faculty',
            'total_marks', 'duration_minutes', 'passing_percentage',
            'start_datetime', 'end_datetime', 'status', 'questions_count',
            'skills', 'is_active', 'created_at', 'updated_at', 'attempt_info'
        ]

    def get_attempt_info(self, obj):
        """Get student's attempt information for this assessment."""
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'student_profile'):
            return None

        try:
            attempt = StudentAssessmentAttempt.objects.get(
                student=request.user.student_profile,
                assessment=obj
            )

            # Check if attempt is expired and still IN_PROGRESS
            status = attempt.status
            if status == StudentAssessmentAttempt.AttemptStatus.IN_PROGRESS and attempt.is_expired:
                # Auto-submit expired attempt
                from .services import AssessmentEvaluationService
                from django.utils import timezone

                # Set submitted_at to when it expired
                assessment_end_time = attempt.assessment.end_time
                duration_end_time = attempt.started_at + \
                    timezone.timedelta(
                        minutes=attempt.assessment.duration_minutes)
                attempt.submitted_at = min(
                    assessment_end_time, duration_end_time)
                attempt.save(update_fields=['submitted_at'])

                # Evaluate the expired attempt
                attempt = AssessmentEvaluationService.evaluate_attempt(attempt)
                status = attempt.status

            return {
                'id': attempt.id,
                'status': status,
                'started_at': attempt.started_at.isoformat(),
                'submitted_at': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
                'total_marks_obtained': attempt.total_marks_obtained,
                'percentage': attempt.percentage,
            }
        except StudentAssessmentAttempt.DoesNotExist:
            return None

    def get_batch(self, obj):
        return {
            'id': obj.batch.id,
            'code': obj.batch.code,
            'course_name': obj.batch.template.course.name if obj.batch.template else '',
            'centre_name': obj.batch.centre.name if obj.batch.centre else '',
            'status': obj.batch.status,
        }

    def get_subject(self, obj):
        return {
            'id': obj.subject.id,
            'code': obj.subject.code,
            'name': obj.subject.name,
        }

    def get_faculty(self, obj):
        return {
            'id': obj.faculty.id,
            'full_name': obj.faculty.user.full_name if hasattr(obj.faculty.user, 'full_name') else obj.faculty.user.email,
            'email': obj.faculty.user.email,
        }

    def get_skills(self, obj):
        """Get skills from skill mappings."""
        skill_mappings = obj.skill_mappings.all()
        return [
            {
                'id': mapping.skill.id,
                'name': mapping.skill.name,
            }
            for mapping in skill_mappings
        ]


class AssessmentDetailSerializer(serializers.ModelSerializer):
    """Serializer for assessment detail view with all nested data."""
    batch = serializers.SerializerMethodField()
    subject = serializers.SerializerMethodField()
    faculty = serializers.SerializerMethodField()
    start_datetime = serializers.DateTimeField(
        source='start_time', read_only=True)
    end_datetime = serializers.DateTimeField(source='end_time', read_only=True)
    questions = AssessmentQuestionSerializer(many=True, read_only=True)
    skill_mappings = AssessmentSkillMappingSerializer(
        many=True, read_only=True)

    class Meta:
        model = Assessment
        fields = [
            'id', 'title', 'description', 'batch', 'subject', 'faculty',
            'total_marks', 'duration_minutes', 'passing_percentage',
            'start_datetime', 'end_datetime', 'status', 'is_active',
            'questions', 'skill_mappings', 'questions_count',
            'created_at', 'updated_at'
        ]

    def get_batch(self, obj):
        return {
            'id': obj.batch.id,
            'code': obj.batch.code,
            'course_name': obj.batch.template.course.name if obj.batch.template else '',
            'centre_name': obj.batch.centre.name if obj.batch.centre else '',
            'status': obj.batch.status,
        }

    def get_subject(self, obj):
        return {
            'id': obj.subject.id,
            'code': obj.subject.code,
            'name': obj.subject.name,
        }

    def get_faculty(self, obj):
        return {
            'id': obj.faculty.id,
            'full_name': obj.faculty.user.full_name if hasattr(obj.faculty.user, 'full_name') else obj.faculty.user.email,
            'email': obj.faculty.user.email,
        }


class AssessmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating assessments."""
    skill_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True
    )

    class Meta:
        model = Assessment
        fields = [
            'id', 'title', 'description', 'batch', 'subject',
            'total_marks', 'duration_minutes', 'passing_percentage',
            'start_time', 'end_time', 'skill_ids'
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        """Validate assessment data."""
        request = self.context.get('request')
        faculty_profile = getattr(request.user, 'faculty_profile', None)

        if not faculty_profile:
            raise serializers.ValidationError("Faculty profile not found")

        # Validate batch assignment
        batch = attrs.get('batch')
        if batch:
            from apps.faculty.models import FacultyBatchAssignment
            if not FacultyBatchAssignment.objects.filter(
                faculty=faculty_profile,
                batch=batch,
                is_active=True
            ).exists():
                raise serializers.ValidationError({
                    'batch': 'You are not assigned to this batch'
                })

        # Validate subject assignment
        subject = attrs.get('subject')
        if subject:
            from apps.faculty.models import FacultyModuleAssignment
            if not FacultyModuleAssignment.objects.filter(
                faculty=faculty_profile,
                module=subject,
                is_active=True
            ).exists():
                raise serializers.ValidationError({
                    'subject': 'You are not assigned to this subject'
                })

        # Validate time
        start_time = attrs.get('start_time')
        end_time = attrs.get('end_time')
        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time'
            })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        """Create assessment with skill mappings."""
        skill_ids = validated_data.pop('skill_ids', [])
        request = self.context.get('request')
        faculty_profile = request.user.faculty_profile

        assessment = Assessment.objects.create(
            faculty=faculty_profile,
            **validated_data
        )

        # Create skill mappings with equal weights
        if skill_ids:
            skills = Skill.objects.filter(id__in=skill_ids, is_active=True)
            weight = 100 // len(skills) if skills else 0
            for skill in skills:
                AssessmentSkillMapping.objects.create(
                    assessment=assessment,
                    skill=skill,
                    weight_percentage=weight
                )
            # Also store skill names in the JSON field for quick access
            assessment.skills = list(skills.values_list('name', flat=True))
            assessment.save()

        return assessment


class AssessmentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating assessments (only allowed in DRAFT status)."""

    class Meta:
        model = Assessment
        fields = [
            'title', 'description', 'total_marks', 'duration_minutes',
            'passing_percentage', 'start_time', 'end_time'
        ]

    def validate(self, attrs):
        """Ensure assessment is in DRAFT status."""
        if self.instance and self.instance.status != Assessment.Status.DRAFT:
            raise serializers.ValidationError(
                "Cannot edit assessment that is not in DRAFT status"
            )
        return attrs


class AssessmentStudentSerializer(serializers.ModelSerializer):
    """Serializer for assessments shown to students."""
    batch_code = serializers.CharField(source='batch.code', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    questions = AssessmentQuestionStudentSerializer(many=True, read_only=True)
    questions_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Assessment
        fields = [
            'id', 'title', 'description', 'batch_code', 'subject_name',
            'total_marks', 'duration_minutes', 'passing_percentage',
            'start_time', 'end_time', 'questions', 'questions_count'
        ]


# ==================== Student Answer Serializers ====================

class StudentAnswerSerializer(serializers.ModelSerializer):
    """Serializer for student answers."""
    question_text = serializers.CharField(
        source='question.question_text', read_only=True)
    selected_option_text = serializers.CharField(
        source='selected_option.option_text', read_only=True
    )
    correct_option_text = serializers.SerializerMethodField()

    class Meta:
        model = StudentAnswer
        fields = [
            'id', 'question', 'question_text', 'selected_option',
            'selected_option_text', 'correct_option_text',
            'is_correct', 'marks_obtained'
        ]

    def get_correct_option_text(self, obj):
        """Get the correct option text for the question."""
        correct = obj.question.correct_option
        return correct.option_text if correct else None


class StudentAnswerSubmitSerializer(serializers.Serializer):
    """Serializer for submitting student answers."""
    question_id = serializers.IntegerField()
    selected_option_id = serializers.IntegerField(allow_null=True)


# ==================== Student Attempt Serializers ====================

class StudentAssessmentAttemptSerializer(serializers.ModelSerializer):
    """Serializer for student assessment attempts."""
    student_name = serializers.CharField(
        source='student.user.full_name', read_only=True)
    student_email = serializers.CharField(
        source='student.user.email', read_only=True)
    assessment_title = serializers.CharField(
        source='assessment.title', read_only=True)
    assessment_total_marks = serializers.IntegerField(
        source='assessment.total_marks', read_only=True
    )
    result_status = serializers.CharField(read_only=True)

    class Meta:
        model = StudentAssessmentAttempt
        fields = [
            'id', 'student', 'student_name', 'student_email',
            'assessment', 'assessment_title', 'assessment_total_marks',
            'started_at', 'submitted_at', 'total_marks_obtained',
            'percentage', 'status', 'result_status'
        ]


class StudentAssessmentAttemptDetailSerializer(StudentAssessmentAttemptSerializer):
    """Detailed serializer including answers."""
    answers = StudentAnswerSerializer(many=True, read_only=True)
    skill_impacts = serializers.SerializerMethodField()

    class Meta(StudentAssessmentAttemptSerializer.Meta):
        fields = StudentAssessmentAttemptSerializer.Meta.fields + [
            'answers', 'skill_impacts'
        ]

    def get_skill_impacts(self, obj):
        """Get skill impacts from this attempt."""
        if obj.status != StudentAssessmentAttempt.AttemptStatus.EVALUATED:
            return []

        impacts = []
        for mapping in obj.assessment.skill_mappings.all():
            student_skill = StudentSkill.objects.filter(
                student=obj.student,
                skill=mapping.skill
            ).first()

            if student_skill:
                impacts.append({
                    'skill_name': mapping.skill.name,
                    'previous_level': 'N/A',  # Would need historical tracking
                    'new_level': student_skill.get_level_display(),
                    'percentage': float(student_skill.percentage_score)
                })

        return impacts


# ==================== Student Skill Serializers ====================

class StudentSkillSerializer(serializers.ModelSerializer):
    """Serializer for student skills."""
    skill_name = serializers.CharField(source='skill.name', read_only=True)
    course_name = serializers.CharField(
        source='skill.course.name', read_only=True)

    class Meta:
        model = StudentSkill
        fields = [
            'id', 'skill', 'skill_name', 'course_name',
            'percentage_score', 'level', 'attempts_count', 'last_updated'
        ]


# ==================== Result Serializers ====================

class AssessmentResultSummarySerializer(serializers.Serializer):
    """Serializer for assessment result summary (faculty view)."""
    total_students = serializers.IntegerField()
    attempted = serializers.IntegerField()
    passed = serializers.IntegerField()
    failed = serializers.IntegerField()
    average_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    average_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2)
    highest_score = serializers.DecimalField(max_digits=6, decimal_places=2)
    lowest_score = serializers.DecimalField(max_digits=6, decimal_places=2)


class SubmitAssessmentSerializer(serializers.Serializer):
    """Serializer for submitting an entire assessment."""
    answers = StudentAnswerSubmitSerializer(many=True)

    def validate_answers(self, value):
        """Validate submitted answers."""
        if not value:
            raise serializers.ValidationError(
                "At least one answer is required")
        return value


# ==================== Question Bank Serializers ====================

class BankQuestionSerializer(serializers.ModelSerializer):
    """Serializer for BankQuestion model."""

    class Meta:
        from .models import BankQuestion
        model = BankQuestion
        fields = [
            'id', 'question_text', 'option_a', 'option_b',
            'option_c', 'option_d', 'correct_option', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class QuestionBankSerializer(serializers.ModelSerializer):
    """Serializer for QuestionBank model."""
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    faculty_name = serializers.CharField(
        source='faculty.user.full_name', read_only=True)
    questions_count = serializers.IntegerField(read_only=True)

    class Meta:
        from .models import QuestionBank
        model = QuestionBank
        fields = [
            'id', 'name', 'description', 'subject', 'subject_name',
            'faculty', 'faculty_name', 'questions_count', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'faculty', 'questions_count', 'created_at']


class QuestionBankDetailSerializer(serializers.ModelSerializer):
    """Serializer for QuestionBank with questions."""
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    faculty_name = serializers.CharField(
        source='faculty.user.full_name', read_only=True)
    questions = BankQuestionSerializer(many=True, read_only=True)
    questions_count = serializers.IntegerField(read_only=True)

    class Meta:
        from .models import QuestionBank
        model = QuestionBank
        fields = [
            'id', 'name', 'description', 'subject', 'subject_name',
            'faculty', 'faculty_name', 'questions', 'questions_count',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'faculty', 'questions_count', 'created_at']


class AikenImportSerializer(serializers.Serializer):
    """Serializer for AIKEN file import."""
    bank_name = serializers.CharField(
        max_length=255, help_text="Name for the question bank")
    subject_id = serializers.IntegerField(help_text="Subject/Module ID")
    file = serializers.FileField(help_text="AIKEN format .txt file")
    description = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text="Optional description for the question bank"
    )

    def validate_file(self, value):
        """Validate uploaded file."""
        # Check file extension
        if not value.name.endswith('.txt'):
            raise serializers.ValidationError("Only .txt files are allowed")

        # Check file size (max 5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "File size must be less than 5MB")

        return value

    def validate_subject_id(self, value):
        """Validate subject exists."""
        from apps.academics.models import Module
        try:
            Module.objects.get(id=value)
        except Module.DoesNotExist:
            raise serializers.ValidationError(
                f"Subject with ID {value} does not exist")
        return value


class ImportFromBankSerializer(serializers.Serializer):
    """Serializer for importing questions from bank to assessment."""
    bank_id = serializers.IntegerField(help_text="Question bank ID")
    number_of_questions = serializers.IntegerField(
        min_value=1,
        help_text="Number of questions to import"
    )
    randomize = serializers.BooleanField(
        default=True,
        help_text="Whether to randomly select questions"
    )
    marks_per_question = serializers.IntegerField(
        min_value=1,
        default=1,
        help_text="Marks per question"
    )

    def validate_bank_id(self, value):
        """Validate question bank exists."""
        from .models import QuestionBank
        try:
            QuestionBank.objects.get(id=value, is_active=True)
        except QuestionBank.DoesNotExist:
            raise serializers.ValidationError(
                f"Question bank with ID {value} does not exist")
        return value
