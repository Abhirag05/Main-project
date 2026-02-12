"""
Placement serializers.

Serializers for placement list management, including student details
with email, phone, and skill information with mastery levels.
"""
from rest_framework import serializers
from apps.placement.models import PlacementList, PlacementListStudent, StudentPlacementLink
from apps.students.models import StudentProfile
from apps.assessments.models import StudentSkill


class StudentSkillInfoSerializer(serializers.ModelSerializer):
    """
    Serializer for student skill information with mastery level.
    """
    skill_name = serializers.CharField(source='skill.name', read_only=True)
    mastery_level = serializers.CharField(source='level', read_only=True)
    percentage = serializers.DecimalField(
        source='percentage_score',
        max_digits=5,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = StudentSkill
        fields = ['skill_name', 'mastery_level', 'percentage']


class StudentDetailSerializer(serializers.ModelSerializer):
    """
    Detailed student serializer for placement list display.
    Includes email, phone, and skills with mastery levels.
    """
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='phone_number', read_only=True)
    skills = StudentSkillInfoSerializer(many=True, read_only=True)

    class Meta:
        model = StudentProfile
        fields = ['id', 'full_name', 'email',
                  'phone', 'skills', 'admission_status']


class PlacementListStudentSerializer(serializers.ModelSerializer):
    """
    Serializer for students in a placement list.
    Shows full student details including contact info and skills.
    """
    student_details = StudentDetailSerializer(source='student', read_only=True)
    added_by_name = serializers.CharField(
        source='added_by.full_name', read_only=True)

    class Meta:
        model = PlacementListStudent
        fields = [
            'id',
            'student',
            'student_details',
            'notes',
            'added_by',
            'added_by_name',
            'added_at',
            'is_active'
        ]
        read_only_fields = ['id', 'added_by', 'added_at']

    def validate_student(self, value):
        """
        Validate that the student exists and is approved.
        """
        if not value:
            raise serializers.ValidationError("Student is required.")

        if value.admission_status not in ['APPROVED', 'FULL_PAYMENT_VERIFIED', 'INSTALLMENT_VERIFIED']:
            raise serializers.ValidationError(
                "Only approved students can be added to placement lists."
            )

        return value


class PlacementListSerializer(serializers.ModelSerializer):
    """
    Serializer for PlacementList with basic information.
    """
    created_by_name = serializers.CharField(
        source='created_by.full_name', read_only=True)
    student_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PlacementList
        fields = [
            'id',
            'name',
            'description',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'is_active',
            'student_count',
            'placement_link'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class PlacementListDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for PlacementList including all students.
    Shows student details with email, phone, and skills.
    """
    created_by_name = serializers.CharField(
        source='created_by.full_name', read_only=True)
    students = serializers.SerializerMethodField()
    student_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PlacementList
        fields = [
            'id',
            'name',
            'description',
            'placement_link',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'is_active',
            'student_count',
            'students'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_students(self, obj):
        """
        Get only active students in the placement list.
        """
        active_students = obj.students.filter(is_active=True)
        return PlacementListStudentSerializer(active_students, many=True).data


class AddStudentToListSerializer(serializers.Serializer):
    """
    Serializer for adding a student to a placement list.
    """
    student_id = serializers.IntegerField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_student_id(self, value):
        """
        Validate that the student exists.
        """
        try:
            student = StudentProfile.objects.get(id=value)
            if student.admission_status not in ['APPROVED', 'FULL_PAYMENT_VERIFIED', 'INSTALLMENT_VERIFIED']:
                raise serializers.ValidationError(
                    "Only approved students can be added to placement lists."
                )
            return value
        except StudentProfile.DoesNotExist:
            raise serializers.ValidationError("Student not found.")


class RemoveStudentFromListSerializer(serializers.Serializer):
    """
    Serializer for removing a student from a placement list.
    """
    student_id = serializers.IntegerField(required=True)

    def validate_student_id(self, value):
        """
        Validate that the student exists.
        """
        try:
            StudentProfile.objects.get(id=value)
            return value
        except StudentProfile.DoesNotExist:
            raise serializers.ValidationError("Student not found.")


class StudentPlacementLinkSerializer(serializers.ModelSerializer):
    """
    Serializer for student placement links.
    Shows the registration link sent to a student for a placement list.
    """
    placement_list_name = serializers.CharField(
        source='placement_list.name', read_only=True)
    placement_list_description = serializers.CharField(
        source='placement_list.description', read_only=True)

    class Meta:
        model = StudentPlacementLink
        fields = [
            'id',
            'placement_list',
            'placement_list_name',
            'placement_list_description',
            'placement_link',
            'sent_at'
        ]
        read_only_fields = ['id', 'sent_at']
