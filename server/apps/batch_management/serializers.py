"""
Serializers for batch management app.
Handles serialization of BatchTemplate, Batch, and related models.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.batch_management.models import BatchTemplate, Batch, BatchStudent, BatchMentorAssignment
from apps.academics.models import Course
from apps.students.models import StudentProfile

User = get_user_model()


class CourseSerializer(serializers.ModelSerializer):
    """Nested serializer for Course details in BatchTemplate."""

    class Meta:
        model = Course
        fields = ['id', 'name', 'code', 'duration_months']
        read_only_fields = ['id', 'name', 'code', 'duration_months']


class BatchTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for BatchTemplate model.

    Provides full CRUD support for batch templates.
    Nested course data for read operations, course ID for write operations.
    """
    course_detail = CourseSerializer(source='course', read_only=True)

    class Meta:
        model = BatchTemplate
        fields = [
            'id',
            'course',
            'course_detail',
            'name',
            'mode',
            'max_students',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_max_students(self, value):
        """Ensure max_students is a positive number."""
        if value <= 0:
            raise serializers.ValidationError(
                "Maximum students must be greater than 0.")
        return value

    def validate_name(self, value):
        """Ensure template name is not empty or whitespace."""
        if not value or not value.strip():
            raise serializers.ValidationError("Template name cannot be empty.")
        return value.strip()


# ==========================================
# Batch Management Serializers
# ==========================================

class BatchTemplateListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing active batch templates.
    Used by Centre Admins when creating batches.
    """
    course_detail = CourseSerializer(source='course', read_only=True)

    class Meta:
        model = BatchTemplate
        fields = [
            'id',
            'course',
            'course_detail',
            'name',
            'mode',
            'max_students',
        ]
        read_only_fields = fields


class CreateBatchSerializer(serializers.Serializer):
    """
    Serializer for creating a new batch from a template.
    Used by Centre Admin to instantiate batches.
    """
    template_id = serializers.IntegerField(required=True)
    start_date = serializers.DateField(required=True)
    end_date = serializers.DateField(required=True)

    def validate_template_id(self, value):
        """Ensure template exists and is active."""
        try:
            template = BatchTemplate.objects.get(id=value)
            if not template.is_active:
                raise serializers.ValidationError(
                    "Cannot create batch from inactive template."
                )
            return value
        except BatchTemplate.DoesNotExist:
            raise serializers.ValidationError("Template not found.")

    def validate(self, data):
        """Validate start_date is before end_date."""
        if data['start_date'] >= data['end_date']:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })
        return data


class BatchSerializer(serializers.ModelSerializer):
    """
    Serializer for Batch model with full details.
    Includes nested template and centre information.
    """
    template_detail = BatchTemplateSerializer(
        source='template', read_only=True)
    centre_name = serializers.CharField(source='centre.name', read_only=True)
    centre_code = serializers.CharField(source='centre.code', read_only=True)
    course_name = serializers.CharField(
        source='template.course.name', read_only=True)
    course_code = serializers.CharField(
        source='template.course.code', read_only=True)
    course_duration_months = serializers.IntegerField(
        source='template.course.duration_months', read_only=True)
    mode = serializers.CharField(source='template.mode', read_only=True)
    max_students = serializers.IntegerField(
        source='template.max_students', read_only=True)
    current_student_count = serializers.SerializerMethodField()
    mentor_detail = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = [
            'id',
            'template',
            'template_detail',
            'centre',
            'centre_name',
            'centre_code',
            'code',
            'start_date',
            'end_date',
            'status',
            'course_name',
            'course_code',
            'course_duration_months',
            'mode',
            'max_students',
            'current_student_count',
            'mentor',
            'mentor_detail',
            'meeting_link',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'code',
            'centre',
            'status',
            'created_at',
            'updated_at',
        ]

    def get_current_student_count(self, obj):
        """Get the current number of active students in this batch."""
        if hasattr(obj, 'active_student_count'):
            return obj.active_student_count
        return obj.students.filter(is_active=True).count()

    def get_mentor_detail(self, obj):
        """Get mentor details if assigned."""
        if obj.mentor:
            return {
                'id': obj.mentor.id,
                'full_name': obj.mentor.full_name,
                'email': obj.mentor.email,
                'phone': obj.mentor.phone
            }
        return None


class BatchListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing batches.
    Optimized for list views with minimal nested data.
    """
    centre_name = serializers.CharField(source='centre.name', read_only=True)
    centre_code = serializers.CharField(source='centre.code', read_only=True)
    course_name = serializers.CharField(
        source='template.course.name', read_only=True)
    course_code = serializers.CharField(
        source='template.course.code', read_only=True)
    course_duration_months = serializers.IntegerField(
        source='template.course.duration_months', read_only=True)
    mode = serializers.CharField(source='template.mode', read_only=True)
    current_student_count = serializers.SerializerMethodField()
    max_students = serializers.IntegerField(
        source='template.max_students', read_only=True)
    mentor_name = serializers.CharField(
        source='mentor.full_name', read_only=True, default=None)

    class Meta:
        model = Batch
        fields = [
            'id',
            'code',
            'centre_name',
            'centre_code',
            'course_name',
            'course_code',
            'course_duration_months',
            'mode',
            'start_date',
            'end_date',
            'status',
            'current_student_count',
            'max_students',
            'mentor_name',
            'meeting_link',
            'is_active',
        ]
        read_only_fields = fields

    def get_current_student_count(self, obj):
        """Get the current number of active students in this batch."""
        if hasattr(obj, 'active_student_count'):
            return obj.active_student_count
        return obj.students.filter(is_active=True).count()


class UpdateBatchStatusSerializer(serializers.Serializer):
    """
    Serializer for updating batch status.
    Enforces valid status transitions.
    """
    status = serializers.ChoiceField(
        choices=['COMPLETED', 'CANCELLED'],
        required=True
    )

    def validate_status(self, value):
        """Ensure valid status transition from ACTIVE."""
        batch = self.context.get('batch')
        if batch and batch.status != 'ACTIVE':
            raise serializers.ValidationError(
                f"Cannot change status from {batch.status}. "
                "Only ACTIVE batches can be updated."
            )
        return value


# ==========================================
# Student Assignment Serializers
# ==========================================

class EligibleStudentSerializer(serializers.ModelSerializer):
    """
    Serializer for eligible students for batch assignment.

    Returns students who:
    - Have admission_status == APPROVED
    - Do NOT have any active BatchStudent (is_active=True)
    """
    student_profile_id = serializers.IntegerField(source='id', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    registration_date = serializers.DateTimeField(
        source='created_at', read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            'student_profile_id',
            'full_name',
            'email',
            'registration_date',
        ]
        read_only_fields = fields


class AssignStudentsSerializer(serializers.Serializer):
    """
    Serializer for assigning multiple students to a batch.

    Input:
    {
        "student_profile_ids": [1, 2, 3]
    }
    """
    student_profile_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        min_length=1,
        help_text="List of student profile IDs to assign"
    )

    def validate_student_profile_ids(self, value):
        """Ensure no duplicate IDs in the request."""
        if len(value) != len(set(value)):
            raise serializers.ValidationError(
                "Duplicate student IDs are not allowed.")
        return value


class BatchStudentSerializer(serializers.ModelSerializer):
    """
    Serializer for batch student details.
    Used in batch details endpoint.
    """
    student_profile_id = serializers.IntegerField(
        source='student.id', read_only=True)
    full_name = serializers.CharField(
        source='student.user.full_name', read_only=True)
    email = serializers.EmailField(source='student.user.email', read_only=True)
    phone = serializers.CharField(
        source='student.phone_number', read_only=True)

    class Meta:
        model = BatchStudent
        fields = [
            'student_profile_id',
            'full_name',
            'email',
            'phone',
            'joined_at',
        ]
        read_only_fields = fields


class BatchDetailsSerializer(serializers.ModelSerializer):
    """
    Serializer for batch details with enrolled students.

    GET /api/batches/{batch_id}/details/
    """
    template_detail = BatchTemplateSerializer(
        source='template', read_only=True)
    centre_name = serializers.CharField(source='centre.name', read_only=True)
    centre_code = serializers.CharField(source='centre.code', read_only=True)
    course_name = serializers.CharField(
        source='template.course.name', read_only=True)
    course_code = serializers.CharField(
        source='template.course.code', read_only=True)
    mode = serializers.CharField(source='template.mode', read_only=True)
    max_students = serializers.IntegerField(
        source='template.max_students', read_only=True)
    current_student_count = serializers.SerializerMethodField()
    available_slots = serializers.SerializerMethodField()
    enrolled_students = serializers.SerializerMethodField()
    mentor_detail = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = [
            'id',
            'code',
            'template',
            'template_detail',
            'centre',
            'centre_name',
            'centre_code',
            'course_name',
            'course_code',
            'mode',
            'start_date',
            'end_date',
            'status',
            'max_students',
            'current_student_count',
            'available_slots',
            'mentor',
            'mentor_detail',
            'is_active',
            'created_at',
            'updated_at',
            'enrolled_students',
        ]
        read_only_fields = fields

    def get_current_student_count(self, obj):
        """Get the current number of active students in this batch."""
        if hasattr(obj, 'active_student_count'):
            return obj.active_student_count
        return obj.students.filter(is_active=True).count()

    def get_available_slots(self, obj):
        """Calculate available slots in the batch."""
        current_count = self.get_current_student_count(obj)
        return max(0, obj.template.max_students - current_count)

    def get_enrolled_students(self, obj):
        """Get list of actively enrolled students."""
        active_enrollments = obj.students.filter(
            is_active=True
        ).select_related('student', 'student__user').order_by('joined_at')

        return BatchStudentSerializer(active_enrollments, many=True).data

    def get_mentor_detail(self, obj):
        """Get mentor details from active assignment."""
        # Use the BatchMentorAssignment table instead of direct FK
        active_assignment = obj.mentor_assignments.filter(
            is_active=True).select_related('mentor').first()
        if active_assignment:
            mentor = active_assignment.mentor
            return {
                'id': mentor.id,
                'full_name': mentor.full_name,
                'email': mentor.email,
                'phone': mentor.phone,
                'assigned_at': active_assignment.assigned_at.isoformat()
            }
        return None


# ==========================================
# Batch Mentor Assignment Serializers (ERP-Grade)
# ==========================================

class EligibleMentorSerializer(serializers.ModelSerializer):
    """
    Serializer for listing eligible mentors for batch assignment.

    Returns mentors who:
    - Have role.code == 'BATCH_MENTOR'
    - Are is_active == True (can login)
    - Belong to the same centre as the batch
    - Have NO active BatchMentorAssignment OR are assigned to THIS batch
    """
    user_id = serializers.IntegerField(source='id', read_only=True)

    class Meta:
        model = User
        fields = ['user_id', 'full_name', 'email', 'phone']
        read_only_fields = fields


class AssignMentorRequestSerializer(serializers.Serializer):
    """
    Serializer for mentor assignment request validation.

    PATCH /api/batches/{batch_id}/assign-mentor/

    Input: { "mentor_user_id": <int> }

    Validates:
    - Mentor exists
    - Mentor is active (can login)
    - Mentor has role BATCH_MENTOR
    - Mentor belongs to same centre as batch
    """
    mentor_user_id = serializers.IntegerField(required=True)

    def validate_mentor_user_id(self, value):
        """Validate mentor exists, is active, has correct role and centre."""
        batch = self.context.get('batch')

        try:
            mentor = User.objects.select_related(
                'role', 'centre').get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Mentor not found.")

        if mentor.role is None or mentor.role.code != 'BATCH_MENTOR':
            raise serializers.ValidationError("User is not a batch mentor.")

        if not mentor.is_active:
            raise serializers.ValidationError(
                "Mentor account is not active. Contact administrator."
            )

        if mentor.centre_id != batch.centre_id:
            raise serializers.ValidationError(
                "Mentor must belong to the same centre as the batch."
            )

        # Store the mentor object for use in the view
        self.mentor = mentor
        return value


class BatchMentorAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for batch mentor assignment response.
    """
    mentor_id = serializers.IntegerField(source='mentor.id', read_only=True)
    mentor_name = serializers.CharField(
        source='mentor.full_name', read_only=True)
    mentor_email = serializers.EmailField(
        source='mentor.email', read_only=True)
    mentor_phone = serializers.CharField(source='mentor.phone', read_only=True)
    batch_id = serializers.IntegerField(source='batch.id', read_only=True)
    batch_code = serializers.CharField(source='batch.code', read_only=True)

    class Meta:
        model = BatchMentorAssignment
        fields = [
            'id',
            'mentor_id',
            'mentor_name',
            'mentor_email',
            'mentor_phone',
            'batch_id',
            'batch_code',
            'is_active',
            'assigned_at',
            'unassigned_at',
        ]
        read_only_fields = fields


# ==========================================
# Legacy Mentor Serializers (Deprecated - kept for backward compatibility)
# ==========================================

class AvailableMentorSerializer(serializers.ModelSerializer):
    """
    DEPRECATED: Use EligibleMentorSerializer instead.
    Kept for backward compatibility.
    """
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'phone']
        read_only_fields = fields


class AssignMentorSerializer(serializers.Serializer):
    """
    DEPRECATED: Use AssignMentorRequestSerializer instead.
    Kept for backward compatibility - maps mentor_id to mentor_user_id.
    """
    mentor_id = serializers.IntegerField(required=True)

    def validate_mentor_id(self, value):
        """Validate mentor exists, is active, has correct role and centre."""
        batch = self.context.get('batch')

        try:
            mentor = User.objects.select_related(
                'role', 'centre').get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Mentor not found.")

        if mentor.role is None or mentor.role.code != 'BATCH_MENTOR':
            raise serializers.ValidationError("User is not a batch mentor.")

        if not mentor.is_active:
            raise serializers.ValidationError(
                "Mentor is not available for assignment.")

        if mentor.centre_id != batch.centre_id:
            raise serializers.ValidationError(
                "Mentor must belong to the same centre as the batch.")

        # Store mentor for use in view
        self.mentor = mentor
        return value


class BatchMentorDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for batch mentor details in batch response.
    """
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'phone']
        read_only_fields = fields


# ==========================================
# Mentor Dashboard Serializers (Read-Only)
# ==========================================

class MentorBatchSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for Batch Mentor's "My Batches" view.

    GET /api/mentor/my-batches/

    Returns batch details for the logged-in mentor's assigned batches.
    """
    batch_id = serializers.IntegerField(source='id', read_only=True)
    batch_code = serializers.CharField(source='code', read_only=True)
    course_name = serializers.CharField(
        source='template.course.name', read_only=True)
    batch_status = serializers.CharField(source='status', read_only=True)
    mode = serializers.CharField(source='template.mode', read_only=True)
    total_students = serializers.SerializerMethodField()

    class Meta:
        model = Batch
        fields = [
            'batch_id',
            'batch_code',
            'course_name',
            'start_date',
            'end_date',
            'batch_status',
            'mode',
            'total_students',
        ]
        read_only_fields = fields

    def get_total_students(self, obj):
        """Get count of active students in this batch."""
        if hasattr(obj, 'active_student_count'):
            return obj.active_student_count
        return obj.students.filter(is_active=True).count()


class MentorBatchStudentSerializer(serializers.ModelSerializer):
    """
    Serializer for students in a batch for Mentor view.

    GET /api/mentor/batches/{batch_id}/students/
    """
    student_id = serializers.IntegerField(source='student.id', read_only=True)
    full_name = serializers.CharField(
        source='student.user.full_name', read_only=True)
    email = serializers.EmailField(source='student.user.email', read_only=True)
    phone = serializers.SerializerMethodField()

    class Meta:
        model = BatchStudent
        fields = [
            'student_id',
            'full_name',
            'email',
            'phone',
            'joined_at',
        ]
        read_only_fields = fields

    def get_phone(self, obj):
        """Return phone from StudentProfile or User, whichever is available."""
        # Try StudentProfile.phone_number first
        if obj.student.phone_number:
            return obj.student.phone_number
        # Fallback to User.phone
        if obj.student.user.phone:
            return obj.student.user.phone
        return None
