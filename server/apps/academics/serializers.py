"""
Serializers for Academic Master Data (PHASE 1A).
"""
from rest_framework import serializers
from apps.academics.models import Course, Module, CourseModule


class CourseCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating Course instances.
    """
    skills = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Comma-separated skills or list of strings"
    )

    class Meta:
        model = Course
        fields = ['code', 'name', 'description',
                  'duration_months', 'skills', 'is_active']

    def validate_code(self, value):
        """Ensure course code is unique and uppercase."""
        value = value.strip().upper()
        # Exclude current instance when updating
        queryset = Course.objects.filter(code=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                f"Course with code '{value}' already exists."
            )
        return value

    def validate_name(self, value):
        """Ensure course name is not empty."""
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Course name cannot be empty.")
        return value

    def validate_duration_months(self, value):
        """Ensure duration is at least 1 month."""
        if value < 1:
            raise serializers.ValidationError(
                "Course duration must be at least 1 month."
            )
        return value

    def validate_skills(self, value):
        """
        Normalize skills input.
        Accept comma-separated string or list of strings.
        Return normalized list of unique skills.
        """
        if not value:
            return []

        # Handle list input (future-proof)
        if isinstance(value, list):
            skills_list = value
        # Handle comma-separated string input (from frontend)
        elif isinstance(value, str):
            skills_list = [s.strip() for s in value.split(',')]
        else:
            return []

        # Normalize: strip whitespace, remove empty, deduplicate (case-insensitive)
        normalized = []
        seen = set()
        for skill in skills_list:
            skill = skill.strip()
            if skill and skill.lower() not in seen:
                normalized.append(skill)
                seen.add(skill.lower())

        return normalized

    def to_representation(self, instance):
        """Return skills as list of strings in JSON response."""
        representation = super().to_representation(instance)
        # Ensure skills is always a list
        if 'skills' in representation and representation['skills'] is None:
            representation['skills'] = []
        return representation


class CourseListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing Course instances.
    """
    class Meta:
        model = Course
        fields = ['id', 'code', 'name', 'description', 'duration_months',
                  'skills', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_representation(self, instance):
        """Ensure skills is always a list."""
        representation = super().to_representation(instance)
        if representation.get('skills') is None:
            representation['skills'] = []
        return representation


class ModuleCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating Module instances.
    """
    class Meta:
        model = Module
        fields = ['code', 'name', 'description', 'is_active']

    def validate_code(self, value):
        """Ensure module code is unique and uppercase."""
        value = value.strip().upper()
        queryset = Module.objects.filter(code=value)

        # CRITICAL FIX: Exclude current instance when updating
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                f"Module with code '{value}' already exists."
            )
        return value

    def validate_name(self, value):
        """Ensure module name is not empty."""
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Module name cannot be empty.")
        return value


class ModuleListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing Module instances.
    """
    class Meta:
        model = Module
        fields = ['id', 'code', 'name', 'description',
                  'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CourseModuleCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating CourseModule assignments.
    """
    class Meta:
        model = CourseModule
        fields = ['course', 'module', 'sequence_order', 'is_active']
        # We'll handle uniqueness manually to support re-activating inactive assignments.
        validators = []

    def validate(self, data):
        """Validate course-module assignment."""
        course = data.get('course')
        module = data.get('module')

        # Check if course is active
        if course and not course.is_active:
            raise serializers.ValidationError({
                'course': f"Course '{course.code}' is not active."
            })

        # Check if module is active
        if module and not module.is_active:
            raise serializers.ValidationError({
                'module': f"Module '{module.code}' is not active."
            })

        # Check for duplicate assignment: if already active, raise.
        if course and module:
            existing = CourseModule.objects.filter(
                course=course, module=module).first()
            if existing and existing.is_active:
                raise serializers.ValidationError(
                    {'non_field_errors': [
                        f"Module '{module.code}' is already assigned to course '{course.code}'."]}
                )
            # If an inactive assignment exists, allow — we'll reactivate in create().
        return data

    def create(self, validated_data):
        """Create or reactivate a CourseModule assignment.

        If a CourseModule with the same course+module exists but is inactive,
        update its `sequence_order` and `is_active` instead of creating a new row
        (avoids unique_together conflicts and preserves historical record).
        """
        course = validated_data.get('course')
        module = validated_data.get('module')
        sequence_order = validated_data.get('sequence_order')
        is_active = validated_data.get('is_active', True)

        existing = CourseModule.objects.filter(
            course=course, module=module).first()
        if existing:
            existing.sequence_order = sequence_order
            existing.is_active = is_active
            existing.save()
            return existing

        return CourseModule.objects.create(**validated_data)

        return data

    def validate_sequence_order(self, value):
        """Ensure sequence order is positive."""
        if value < 1:
            raise serializers.ValidationError(
                "Sequence order must be at least 1.")
        return value


class CourseModuleListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing modules in a course with details.
    """
    module_code = serializers.CharField(source='module.code', read_only=True)
    module_name = serializers.CharField(source='module.name', read_only=True)
    module_description = serializers.CharField(
        source='module.description', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)

    class Meta:
        model = CourseModule
        fields = [
            'id',
            'course',
            'course_code',
            'course_name',
            'module',
            'module_code',
            'module_name',
            'module_description',
            'sequence_order',
            'is_active',
        ]
        read_only_fields = ['id']
