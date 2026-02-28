"""
Serializers for student registration.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

from apps.users.models import User
from apps.roles.models import Role
from apps.centres.models import Centre
from apps.students.models import StudentProfile
from apps.audit.services import AuditService


class StudentRegistrationSerializer(serializers.Serializer):
    """
    Public student registration serializer.

    STRICT RULES:
    - Only creates User + StudentProfile
    - Only assigns STUDENT role
    - NO batch assignment
    - NO fees assignment
    - NO full LMS access
    - admission_status = PENDING by default
    """
    first_name = serializers.CharField(
        max_length=100,
        required=True,
        help_text="Student's first name"
    )
    last_name = serializers.CharField(
        max_length=100,
        required=True,
        help_text="Student's last name"
    )
    email = serializers.EmailField(
        required=True,
        help_text="Student's email address (must be unique)"
    )
    phone_number = serializers.CharField(
        max_length=15,
        required=True,
        help_text="Student's contact phone number"
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Strong password for the account"
    )
    interested_courses = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        help_text="Comma-separated course IDs or names the user is interested in"
    )
    payment_method = serializers.ChoiceField(
        choices=[('FULL', 'Full Payment'), ('INSTALLMENT', 'Installment')],
        required=False,
        allow_blank=True,
        help_text="Preferred payment method"
    )
    study_mode = serializers.ChoiceField(
        choices=[('LIVE', 'Live')],
        required=False,
        default='LIVE',
        help_text="Study mode (Live only)"
    )

    discovery_sources = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        allow_empty=True,
        help_text="How the student heard about the institute"
    )

    def validate_email(self, value):
        """Ensure email is unique."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )
        return value

    def validate_password(self, value):
        """Validate password strength using Django's built-in validators."""
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    @transaction.atomic
    def create(self, validated_data):
        """
        Create User and StudentProfile in a transaction.

        Steps:
        1. Get STUDENT role
        2. Get default active centre
        3. Create User with hashed password
        4. Create StudentProfile with PENDING status
        5. Create audit log
        """
        first_name = validated_data['first_name']
        last_name = validated_data['last_name']
        email = validated_data['email']
        phone_number = validated_data.get('phone_number', '')
        password = validated_data['password']
        interested_courses = validated_data.get('interested_courses', '')
        payment_method = validated_data.get('payment_method', '')
        study_mode = validated_data.get('study_mode', 'LIVE')

        discovery_sources = validated_data.get('discovery_sources', [])

        # Full name = first_name + last_name
        full_name = f"{first_name} {last_name}"

        # Get STUDENT role (must exist)
        try:
            student_role = Role.objects.get(code='STUDENT', is_active=True)
        except Role.DoesNotExist:
            raise serializers.ValidationError(
                "Student role is not configured in the system."
            )

        # Get default active centre
        try:
            default_centre = Centre.objects.filter(is_active=True).first()
            if not default_centre:
                raise Centre.DoesNotExist
        except Centre.DoesNotExist:
            raise serializers.ValidationError(
                "No active centre found in the system."
            )



        # Create User
        user = User.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
            role=student_role,
            centre=default_centre,
            is_active=True,
            is_staff=False,  # Explicitly set to False for students
            interested_courses=interested_courses,
            payment_method=payment_method
        )

        # Create StudentProfile with PENDING admission status
        student_profile = StudentProfile.objects.create(
            user=user,
            phone_number=phone_number,
            admission_status='PENDING',
            study_mode=study_mode,
            discovery_sources=discovery_sources
        )

        # Create audit log entry
        AuditService.log(
            action='student.registered',
            entity='Student',
            entity_id=str(user.id),
            performed_by=None,  # Public registration, no authenticated user
            details={
                'email': user.email,
                'full_name': user.full_name,
                'admission_status': 'PENDING',
                'interested_courses': interested_courses,
                'payment_method': payment_method,
                'study_mode': study_mode
            }
        )

        return {
            'user': user,
            'student_profile': student_profile
        }


class StudentAdmissionListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing student admissions for Finance users.

    Returns comprehensive information about student user and their admission status.
    """
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone = serializers.CharField(source='phone_number', read_only=True)
    centre = serializers.CharField(source='user.centre.name', read_only=True)
    centre_code = serializers.CharField(
        source='user.centre.code', read_only=True)
    student_profile_id = serializers.IntegerField(source='id', read_only=True)
    interested_courses = serializers.SerializerMethodField(read_only=True)
    payment_method = serializers.CharField(
        source='user.payment_method', read_only=True)
    study_mode = serializers.CharField(read_only=True)
    discovery_sources = serializers.ListField(read_only=True)

    def get_interested_courses(self, obj):
        """
        Resolve interested_courses field to actual course names.
        Handles comma-separated course IDs or names.
        """
        from apps.academics.models import Course

        interested = obj.user.interested_courses
        if not interested:
            return ""

        # Try to parse as course IDs first
        try:
            course_ids = [int(id.strip())
                          for id in interested.split(',') if id.strip()]
            courses = Course.objects.filter(id__in=course_ids, is_active=True)
            return ', '.join([course.name for course in courses])
        except ValueError:
            # If not IDs, return as is (might be course names already)
            return interested

    class Meta:
        model = StudentProfile
        fields = [
            'student_profile_id',
            'user_id',
            'full_name',
            'email',
            'phone',
            'centre',
            'centre_code',
            'interested_courses',
            'payment_method',
            'study_mode',
            'discovery_sources',
            'admission_status',
            'payment_status',
            'created_at',
            'updated_at'
        ]
        read_only_fields = fields


class AdmissionApproveSerializer(serializers.Serializer):
    """
    Serializer for admission approval response.

    Returns the updated student profile information after approval.
    """
    student_profile_id = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    admission_status = serializers.CharField(read_only=True)
    message = serializers.CharField(read_only=True)


class AdmissionRejectSerializer(serializers.Serializer):
    """
    Serializer for admission rejection.

    Accepts optional rejection reason and returns the updated profile.
    """
    rejection_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text="Optional reason for rejection"
    )

    # Response fields
    student_profile_id = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    admission_status = serializers.CharField(read_only=True)
    message = serializers.CharField(read_only=True)


class MyBatchSerializer(serializers.Serializer):
    """
    Read-only serializer for student's assigned batch details.

    Used by student users to view their currently active batch information.
    Includes batch details and assigned mentor information if available.

    BUSINESS RULES:
    - Read-only (no write operations)
    - Returns only the student's active batch
    - Includes mentor details if assigned
    - Returns null if no active batch
    """

    # Batch details
    batch_id = serializers.IntegerField(
        read_only=True,
        help_text="Unique identifier for the batch"
    )
    batch_code = serializers.CharField(
        read_only=True,
        help_text="Unique batch code"
    )
    course_name = serializers.CharField(
        read_only=True,
        help_text="Name of the course"
    )
    start_date = serializers.DateField(
        read_only=True,
        help_text="Batch start date"
    )
    end_date = serializers.DateField(
        read_only=True,
        help_text="Batch end date"
    )
    batch_status = serializers.CharField(
        read_only=True,
        help_text="Current batch status (ACTIVE, COMPLETED, CANCELLED)"
    )
    mode = serializers.CharField(
        read_only=True,
        help_text="Delivery mode (LIVE/RECORDED)"
    )

    # Mentor details (if assigned)
    mentor_name = serializers.CharField(
        read_only=True,
        allow_null=True,
        help_text="Full name of the assigned mentor"
    )
    mentor_email = serializers.EmailField(
        read_only=True,
        allow_null=True,
        help_text="Email address of the assigned mentor"
    )

    # Additional info
    total_students = serializers.IntegerField(
        read_only=True,
        help_text="Total number of active students in the batch"
    )


class MyBatchModuleFacultySerializer(serializers.Serializer):
    """
    Serializer for student's batch modules with faculty information.

    Returns modules from the student's batch course with assigned faculty details.
    Read-only - students can only view this data.
    """

    # Module details
    module_id = serializers.IntegerField(
        read_only=True,
        help_text="Module ID"
    )
    module_name = serializers.CharField(
        read_only=True,
        help_text="Module name"
    )
    module_code = serializers.CharField(
        read_only=True,
        help_text="Module code"
    )

    # Faculty details (null if not assigned)
    faculty_id = serializers.IntegerField(
        read_only=True,
        allow_null=True,
        help_text="Faculty ID (null if not assigned)"
    )
    faculty_name = serializers.CharField(
        read_only=True,
        allow_null=True,
        help_text="Faculty full name (null if not assigned)"
    )
    faculty_designation = serializers.CharField(
        read_only=True,
        allow_null=True,
        help_text="Faculty designation (null if not assigned)"
    )
    faculty_email = serializers.EmailField(
        read_only=True,
        allow_null=True,
        help_text="Faculty email (null if not assigned)"
    )


class StudentSkillSerializer(serializers.Serializer):
    """Serializer for student skills with mastery levels."""
    skill_name = serializers.CharField(read_only=True)
    level = serializers.CharField(read_only=True)
    percentage_score = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True)
    last_updated = serializers.DateTimeField(read_only=True)


class PlacementStudentWithSkillsSerializer(serializers.Serializer):
    """
    Serializer for placement dashboard showing students with their skills, batch, and course.
    """
    student_profile_id = serializers.IntegerField(source='id', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    phone_number = serializers.CharField(
        source='user.phone_number', read_only=True)
    study_mode = serializers.CharField(read_only=True)

    # Batch information
    batch_id = serializers.IntegerField(allow_null=True, read_only=True)
    batch_name = serializers.CharField(allow_null=True, read_only=True)
    batch_code = serializers.CharField(allow_null=True, read_only=True)

    # Course information
    course_id = serializers.IntegerField(allow_null=True, read_only=True)
    course_name = serializers.CharField(allow_null=True, read_only=True)
    course_code = serializers.CharField(allow_null=True, read_only=True)

    # Skills with mastery levels
    skills = StudentSkillSerializer(many=True, read_only=True)
