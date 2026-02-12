from rest_framework import serializers
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Assignment, AssignmentSubmission, AssignmentSkillMapping
import mimetypes
import os


class FormDataListField(serializers.ListField):
    """Custom ListField that handles FormData list values (strings) and converts them"""

    def to_internal_value(self, data):
        """Convert FormData string list to proper list of integers"""
        if isinstance(data, str):
            # Single string value
            data = [data]
        elif isinstance(data, list):
            # Already a list, keep as-is
            pass
        else:
            # Let parent handle other types
            return super().to_internal_value(data)

        # Convert string elements to integers
        try:
            converted = []
            for item in data:
                if isinstance(item, str):
                    converted.append(int(item))
                else:
                    converted.append(item)
            return super().to_internal_value(converted)
        except (ValueError, TypeError) as e:
            raise serializers.ValidationError(f"Invalid skill ID format: {e}")


class AssignmentSerializer(serializers.ModelSerializer):
    """Base serializer for Assignment"""
    faculty_name = serializers.CharField(
        source='faculty.get_full_name', read_only=True)
    batch_name = serializers.CharField(source='batch.code', read_only=True)
    module_name = serializers.CharField(source='module.name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    total_submissions = serializers.IntegerField(read_only=True)
    evaluated_submissions = serializers.IntegerField(read_only=True)
    assignment_file_url = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            'id', 'batch', 'batch_name', 'module', 'module_name',
            'faculty', 'faculty_name', 'title', 'description',
            'assignment_file', 'assignment_file_url', 'max_marks', 'start_date', 'due_date', 'created_at',
            'updated_at', 'is_active', 'is_overdue',
            'total_submissions', 'evaluated_submissions'
        ]
        read_only_fields = ['id', 'created_at',
                            'updated_at', 'faculty', 'assignment_file_url']

    def get_assignment_file_url(self, obj):
        """Return URL path for assignment file"""
        if obj.assignment_file:
            return obj.assignment_file.url
        return None

    def validate_due_date(self, value):
        """Ensure due date is in the future for new assignments"""
        if not self.instance and value < timezone.now():
            raise serializers.ValidationError("Due date must be in the future")
        return value

    def validate_max_marks(self, value):
        """Ensure max marks is positive"""
        if value <= 0:
            raise serializers.ValidationError(
                "Maximum marks must be greater than 0")
        return value


class FacultyAssignmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for faculty to create assignments with file validation and skill mapping"""
    skill_ids = FormDataListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of skill IDs to map to this assignment"
    )

    class Meta:
        model = Assignment
        fields = [
            'batch', 'module', 'title', 'description',
            'assignment_file', 'max_marks', 'start_date', 'due_date', 'is_active', 'skill_ids'
        ]

    def validate_due_date(self, value):
        """Ensure due date is in the future"""
        if value < timezone.now():
            raise serializers.ValidationError("Due date must be in the future")
        return value

    def validate_max_marks(self, value):
        """Ensure max marks is positive"""
        if value <= 0:
            raise serializers.ValidationError(
                "Maximum marks must be greater than 0")
        return value

    def validate_assignment_file(self, value):
        """
        Validate assignment file:
        - Allowed extensions: pdf, doc, docx, zip
        - Max file size: 10MB
        """
        if not value:
            return value

        # File size validation (10MB)
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size must not exceed 10MB. Current size: {value.size / (1024*1024):.2f}MB"
            )

        # File extension validation
        allowed_extensions = {'.pdf', '.doc', '.docx', '.zip'}
        file_ext = os.path.splitext(value.name)[1].lower()

        if file_ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
            )

        return value

    def validate(self, attrs):
        """Validate that faculty teaches this module to this batch"""
        start_date = attrs.get('start_date')
        due_date = attrs.get('due_date')
        now = timezone.now()

        if start_date and start_date < now:
            raise serializers.ValidationError(
                {"start_date": "Start date must be in the future"}
            )

        if start_date and due_date and due_date <= start_date:
            raise serializers.ValidationError(
                {"due_date": "Due date must be after the start date"}
            )

        request = self.context.get('request')
        if request and request.user:
            batch = attrs.get('batch')
            module = attrs.get('module')

            # Check if faculty is assigned to teach this module
            from apps.faculty.models import FacultyModuleAssignment

            assignment_exists = FacultyModuleAssignment.objects.filter(
                faculty__user=request.user,
                module=module,
                is_active=True
            ).exists()

            if not assignment_exists:
                raise serializers.ValidationError(
                    "You are not assigned to teach this module"
                )

        return attrs

    def create(self, validated_data):
        """Create assignment and map skills"""
        from django.db import transaction
        from apps.assessments.models import Skill

        skill_ids = validated_data.pop('skill_ids', [])
        request = self.context.get('request')

        with transaction.atomic():
            # Create assignment
            assignment = Assignment.objects.create(**validated_data)

            # Create skill mappings with equal weights
            if skill_ids:
                skills = Skill.objects.filter(id__in=skill_ids, is_active=True)
                weight = 100 // len(skills) if skills else 0
                for skill in skills:
                    AssignmentSkillMapping.objects.create(
                        assignment=assignment,
                        skill=skill,
                        weight_percentage=weight
                    )

        return assignment

    def update(self, instance, validated_data):
        """Update assignment and refresh skill mappings when provided"""
        from django.db import transaction
        from apps.assessments.models import Skill

        skill_ids = validated_data.pop('skill_ids', None)

        with transaction.atomic():
            # Update assignment fields
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            # If skill_ids provided, refresh mappings
            if skill_ids is not None:
                instance.skill_mappings.all().delete()
                if skill_ids:
                    skills = Skill.objects.filter(
                        id__in=skill_ids, is_active=True)
                    weight = 100 // len(skills) if skills else 0
                    for skill in skills:
                        AssignmentSkillMapping.objects.create(
                            assignment=instance,
                            skill=skill,
                            weight_percentage=weight
                        )

        return instance


class FacultyAssignmentListSerializer(serializers.ModelSerializer):
    """Serializer for faculty to list their assignments with submission stats and skills"""
    batch_name = serializers.CharField(source='batch.code', read_only=True)
    module_name = serializers.CharField(source='module.name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    total_submissions = serializers.SerializerMethodField()
    evaluated_submissions = serializers.SerializerMethodField()
    total_submissions = serializers.SerializerMethodField()
    evaluated_submissions = serializers.SerializerMethodField()
    pending_evaluations = serializers.SerializerMethodField()
    has_file = serializers.SerializerMethodField()
    assignment_file_url = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            'id', 'batch', 'batch_name', 'module', 'module_name',
            'title', 'description', 'max_marks', 'start_date', 'due_date',
            'created_at', 'updated_at', 'is_active', 'is_overdue',
            'total_submissions', 'evaluated_submissions', 'pending_evaluations',
            'has_file', 'assignment_file_url', 'skills'
        ]

    def get_total_submissions(self, obj):
        """Count of submissions received, using annotation when available"""
        if hasattr(obj, '_total_submissions'):
            return obj._total_submissions
        return obj.total_submissions

    def get_evaluated_submissions(self, obj):
        """Count of evaluated submissions, using annotation when available"""
        if hasattr(obj, '_evaluated_submissions'):
            return obj._evaluated_submissions
        return obj.evaluated_submissions

    def get_pending_evaluations(self, obj):
        """Count submissions pending evaluation, using annotation when available"""
        if hasattr(obj, '_pending_evaluations'):
            return obj._pending_evaluations
        return obj.submissions.filter(marks_obtained__isnull=True).count()

    def get_total_submissions(self, obj):
        """Count total submissions, using annotated value when available."""
        count = getattr(obj, "total_submissions_count", None)
        if count is not None:
            return count
        return obj.total_submissions

    def get_evaluated_submissions(self, obj):
        """Count evaluated submissions, using annotated value when available."""
        count = getattr(obj, "evaluated_submissions_count", None)
        if count is not None:
            return count
        return obj.evaluated_submissions

    def get_has_file(self, obj):
        """Check if assignment has a file attached"""
        return bool(obj.assignment_file)

    def get_assignment_file_url(self, obj):
        """Return URL path for assignment file"""
        if obj.assignment_file:
            return obj.assignment_file.url
        return None

    def get_skills(self, obj):
        """Get skills from skill mappings"""
        skill_mappings = obj.skill_mappings.all()
        return [
            {
                'id': mapping.skill.id,
                'name': mapping.skill.name,
            }
            for mapping in skill_mappings
        ]


class SubmissionSerializer(serializers.ModelSerializer):
    """Base serializer for AssignmentSubmission"""
    student_name = serializers.CharField(
        source='student.user.get_full_name', read_only=True)
    student_roll_number = serializers.CharField(
        source='student.roll_number', read_only=True)
    assignment_title = serializers.CharField(
        source='assignment.title', read_only=True)
    is_evaluated = serializers.BooleanField(read_only=True)
    is_late_submission = serializers.BooleanField(read_only=True)
    evaluated_by_name = serializers.CharField(
        source='evaluated_by.get_full_name', read_only=True)

    class Meta:
        model = AssignmentSubmission
        fields = [
            'id', 'assignment', 'assignment_title', 'student', 'student_name',
            'student_roll_number', 'submission_file', 'submitted_at',
            'updated_at', 'marks_obtained', 'feedback', 'evaluated_at',
            'evaluated_by', 'evaluated_by_name', 'is_evaluated', 'is_late_submission'
        ]
        read_only_fields = [
            'id', 'submitted_at', 'updated_at', 'evaluated_at', 'student'
        ]


class StudentSubmissionCreateSerializer(serializers.ModelSerializer):
    """Serializer for students to submit assignments"""

    class Meta:
        model = AssignmentSubmission
        fields = ['submission_file']

    def validate(self, attrs):
        """Validate submission constraints"""
        assignment = self.context.get('assignment')
        student = self.context.get('student')

        if not assignment:
            raise serializers.ValidationError("Assignment not found")

        if not assignment.is_active:
            raise serializers.ValidationError(
                "This assignment is no longer accepting submissions")

        if timezone.now() < assignment.start_date:
            raise serializers.ValidationError(
                f"This assignment opens on {assignment.start_date.strftime('%Y-%m-%d %H:%M')}"
            )

        # Check due date
        if timezone.now() > assignment.due_date:
            raise serializers.ValidationError(
                f"Submission deadline has passed. Due date was {assignment.due_date.strftime('%Y-%m-%d %H:%M')}"
            )

        return attrs


class StudentAssignmentListSerializer(serializers.ModelSerializer):
    """Serializer for students to view assignments with skills"""
    module_name = serializers.CharField(source='module.name', read_only=True)
    faculty_name = serializers.CharField(
        source='faculty.get_full_name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    my_submission = serializers.SerializerMethodField()
    assignment_file_url = serializers.SerializerMethodField()
    has_file = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            'id', 'module', 'module_name', 'faculty_name',
            'title', 'description', 'assignment_file', 'assignment_file_url', 'has_file',
            'max_marks', 'start_date', 'due_date', 'created_at', 'is_overdue', 'my_submission', 'skills'
        ]

    def get_assignment_file_url(self, obj):
        """Return URL path for assignment file if student can access it"""
        if obj.assignment_file:
            return obj.assignment_file.url
        return None

    def get_has_file(self, obj):
        """Check if assignment has a file attached"""
        return bool(obj.assignment_file)

    def get_my_submission(self, obj):
        """Get current student's submission details if exists (uses prefetched data when available)"""
        # Use prefetched data to avoid N+1 queries
        student_submissions = getattr(obj, '_student_submissions', None)
        if student_submissions is not None:
            if student_submissions:
                submission = student_submissions[0]
                return {
                    'id': submission.id,
                    'submitted_at': submission.submitted_at,
                    'marks_obtained': submission.marks_obtained,
                    'feedback': submission.feedback,
                    'is_evaluated': submission.is_evaluated,
                    'is_late_submission': submission.is_late_submission
                }
            return None

        # Fallback to individual query (for non-list contexts)
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'student_profile'):
            return None


        try:
            submission = AssignmentSubmission.objects.get(
                assignment=obj,
                student=request.user.student_profile
            )
            return {
                'id': submission.id,
                'submitted_at': submission.submitted_at,
                'marks_obtained': submission.marks_obtained,
                'feedback': submission.feedback,
                'is_evaluated': submission.is_evaluated,
                'is_late_submission': submission.is_late_submission
            }
        except AssignmentSubmission.DoesNotExist:
            return None

    def get_skills(self, obj):
        """Get skills from skill mappings"""
        skill_mappings = obj.skill_mappings.select_related('skill')
        return [
            {
                'id': mapping.skill.id,
                'name': mapping.skill.name,
            }
            for mapping in skill_mappings
        ]


class StudentSubmissionDetailSerializer(serializers.ModelSerializer):
    """Serializer for students to view their own submissions with feedback"""
    assignment_title = serializers.CharField(
        source='assignment.title', read_only=True)
    assignment_max_marks = serializers.DecimalField(
        source='assignment.max_marks',
        max_digits=6,
        decimal_places=2,
        read_only=True
    )
    module_name = serializers.CharField(
        source='assignment.module.name', read_only=True)
    is_evaluated = serializers.BooleanField(read_only=True)
    is_late_submission = serializers.BooleanField(read_only=True)

    class Meta:
        model = AssignmentSubmission
        fields = [
            'id', 'assignment', 'assignment_title', 'module_name',
            'assignment_max_marks', 'submission_file', 'submitted_at',
            'updated_at', 'marks_obtained', 'feedback', 'evaluated_at',
            'is_evaluated', 'is_late_submission'
        ]


class FacultySubmissionListSerializer(serializers.ModelSerializer):
    """Serializer for faculty to view submissions with student details"""
    student_name = serializers.CharField(
        source='student.user.get_full_name', read_only=True)
    student_roll_number = serializers.CharField(
        source='student.roll_number', read_only=True)
    student_email = serializers.EmailField(
        source='student.user.email', read_only=True)
    is_evaluated = serializers.BooleanField(read_only=True)
    is_late_submission = serializers.BooleanField(read_only=True)

    class Meta:
        model = AssignmentSubmission
        fields = [
            'id', 'student', 'student_name', 'student_roll_number',
            'student_email', 'submission_file', 'submitted_at',
            'marks_obtained', 'feedback', 'evaluated_at',
            'is_evaluated', 'is_late_submission'
        ]


class FacultyEvaluateSubmissionSerializer(serializers.ModelSerializer):
    """Serializer for faculty to evaluate student submissions"""

    class Meta:
        model = AssignmentSubmission
        fields = ['marks_obtained', 'feedback']

    def validate_marks_obtained(self, value):
        """Ensure marks are within valid range"""
        if value < 0:
            raise serializers.ValidationError("Marks cannot be negative")

        # Check against assignment max_marks
        submission = self.instance
        if submission and value > submission.assignment.max_marks:
            raise serializers.ValidationError(
                f"Marks cannot exceed maximum marks ({submission.assignment.max_marks})"
            )

        return value

    def update(self, instance, validated_data):
        """Update submission with evaluation data and update student skills"""
        instance.marks_obtained = validated_data.get(
            'marks_obtained', instance.marks_obtained)
        instance.feedback = validated_data.get('feedback', instance.feedback)
        instance.evaluated_at = timezone.now()
        instance.evaluated_by = self.context.get('request').user
        instance.save()

        # Update student skills based on assignment evaluation
        self._update_student_skills(instance)

        return instance

    def _update_student_skills(self, submission):
        """
        Update StudentSkill records based on assignment evaluation.
        Skills are averaged across all assessments and assignments for that skill.
        """
        from apps.assessments.models import StudentSkill, StudentAssessmentAttempt
        from django.db.models import Avg, Count, Q

        # Get skills mapped to this assignment
        skill_mappings = submission.assignment.skill_mappings.select_related(
            'skill').all()

        if not skill_mappings:
            return  # No skills to update

        # Calculate percentage score for this assignment
        assignment_percentage = (
            float(submission.marks_obtained) /
            float(submission.assignment.max_marks)
        ) * 100

        student = submission.student

        # Update each skill
        for mapping in skill_mappings:
            skill = mapping.skill

            # Get all assessment attempts for this skill
            assessment_attempts = StudentAssessmentAttempt.objects.filter(
                student=student,
                assessment__skill_mappings__skill=skill,
                submitted_at__isnull=False
            ).values_list('percentage', flat=True)

            # Get all assignment submissions for this skill (excluding current one to avoid duplication)
            assignment_submissions = AssignmentSubmission.objects.filter(
                student=student,
                assignment__skill_mappings__skill=skill,
                marks_obtained__isnull=False
            ).exclude(id=submission.id).select_related('assignment')

            # Calculate assignment scores as percentages
            assignment_scores = []
            for sub in assignment_submissions:
                if sub.marks_obtained and sub.assignment.max_marks:
                    score_percentage = (
                        float(sub.marks_obtained) / float(sub.assignment.max_marks)) * 100
                    assignment_scores.append(score_percentage)

            # Include current assignment score
            assignment_scores.append(assignment_percentage)

            # Combine all scores (assessments + assignments)
            all_scores = list(assessment_attempts) + assignment_scores

            if all_scores:
                # Calculate average score
                avg_score = sum([float(score)
                                for score in all_scores]) / len(all_scores)

                # Update or create StudentSkill
                student_skill, created = StudentSkill.objects.get_or_create(
                    student=student,
                    skill=skill,
                    defaults={
                        'percentage_score': avg_score,
                        'level': StudentSkill.get_level_from_percentage(avg_score),
                        'attempts_count': len(all_scores)
                    }
                )

                if not created:
                    # Update existing StudentSkill
                    student_skill.percentage_score = avg_score
                    student_skill.level = StudentSkill.get_level_from_percentage(
                        avg_score)
                    student_skill.attempts_count = len(all_scores)
                    student_skill.save()


class SkillSerializer(serializers.Serializer):
    """Serializer for skills (read-only)"""
    id = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField(allow_blank=True)


class AssignmentSkillMappingSerializer(serializers.ModelSerializer):
    """Serializer for assignment skill mappings"""
    skill = SkillSerializer(read_only=True)
    skill_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = AssignmentSkillMapping
        fields = ['id', 'skill', 'skill_id', 'weight_percentage', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_weight_percentage(self, value):
        """Validate weight percentage is between 1 and 100"""
        if value < 1 or value > 100:
            raise serializers.ValidationError(
                "Weight percentage must be between 1 and 100")
        return value


class AssignmentSkillMappingCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating assignment skill mappings"""

    class Meta:
        model = AssignmentSkillMapping
        fields = ['skill', 'weight_percentage']

    def validate_weight_percentage(self, value):
        """Validate weight percentage"""
        if value < 1 or value > 100:
            raise serializers.ValidationError(
                "Weight percentage must be between 1 and 100")
        return value
