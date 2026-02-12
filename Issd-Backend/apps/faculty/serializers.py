"""
Serializers for faculty management APIs.
All serializers whitelist fields for security.
"""
from rest_framework import serializers
from django.db import transaction
from .models import FacultyProfile, FacultyAvailability, FacultyModuleAssignment, FacultyBatchAssignment
from apps.users.models import User
from apps.roles.models import Role
from apps.centres.models import Centre
from apps.batch_management.models import Batch
from apps.academics.models import Module


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user information for faculty responses."""
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'phone']


class CreateFacultySerializer(serializers.Serializer):
    """
    Serializer for creating new faculty profiles.
    Creates both User and FacultyProfile in a transaction.
    """
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(
        max_length=15, required=False, allow_blank=True)
    employee_code = serializers.CharField(max_length=50)
    designation = serializers.CharField(max_length=100)
    joining_date = serializers.DateField()

    def validate_email(self, value):
        """Ensure email is unique."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists.")
        return value.lower()

    def validate_employee_code(self, value):
        """Ensure employee code is unique."""
        if FacultyProfile.objects.filter(employee_code=value).exists():
            raise serializers.ValidationError(
                "A faculty with this employee code already exists.")
        return value

    def create(self, validated_data):
        """
        Create user and faculty profile atomically.
        - User role = FACULTY
        - User centre = default centre
        - User is_staff = False
        - User is_active = True
        - User password = unusable
        """
        with transaction.atomic():
            # Get FACULTY role
            try:
                faculty_role = Role.objects.get(code='FACULTY')
            except Role.DoesNotExist:
                raise serializers.ValidationError(
                    "FACULTY role does not exist. Please seed roles first.")

            # Get default centre
            default_centre = Centre.objects.filter(is_active=True).first()
            if not default_centre:
                raise serializers.ValidationError(
                    "No active centre available.")

            # Create user
            user = User.objects.create(
                email=validated_data['email'],
                full_name=validated_data['full_name'],
                phone=validated_data.get('phone', ''),
                role=faculty_role,
                centre=default_centre,
                is_staff=False,
                is_active=True
            )
            # Set unusable password
            user.set_unusable_password()
            user.save()

            # Create faculty profile
            faculty = FacultyProfile.objects.create(
                user=user,
                employee_code=validated_data['employee_code'],
                designation=validated_data['designation'],
                joining_date=validated_data['joining_date'],
                is_active=True
            )

            return faculty


class FacultyListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing faculty profiles.
    Minimal fields for Next.js frontend.
    """
    user = UserBasicSerializer(read_only=True)

    class Meta:
        model = FacultyProfile
        fields = [
            'id',
            'employee_code',
            'designation',
            'joining_date',
            'is_active',
            'user'
        ]


class FacultyDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for faculty detail view.
    Includes full user information and availability slots.
    """
    user = UserBasicSerializer(read_only=True)

    class Meta:
        model = FacultyProfile
        fields = [
            'id',
            'employee_code',
            'designation',
            'joining_date',
            'is_active',
            'created_at',
            'updated_at',
            'user'
        ]


class UpdateFacultySerializer(serializers.ModelSerializer):
    """
    Serializer for updating faculty profile.
    Only allows updating specific fields.
    """
    class Meta:
        model = FacultyProfile
        fields = ['designation', 'joining_date']

    def update(self, instance, validated_data):
        """Update allowed fields only."""
        instance.designation = validated_data.get(
            'designation', instance.designation)
        instance.joining_date = validated_data.get(
            'joining_date', instance.joining_date)
        instance.save()
        return instance


class UpdateFacultyPhoneSerializer(serializers.Serializer):
    """
    Serializer for updating faculty phone number.
    Updates the User model, not FacultyProfile.
    """
    phone = serializers.CharField(max_length=15)

    def update(self, instance, validated_data):
        """Update user phone number."""
        instance.user.phone = validated_data['phone']
        instance.user.save()
        return instance


class FacultyStatusSerializer(serializers.Serializer):
    """
    Serializer for activating/deactivating faculty.
    """
    is_active = serializers.BooleanField()

    def update(self, instance, validated_data):
        """Update faculty active status."""
        instance.is_active = validated_data['is_active']
        instance.save()
        return instance


class CreateAvailabilitySerializer(serializers.ModelSerializer):
    """
    Serializer for creating faculty availability slots.
    """
    class Meta:
        model = FacultyAvailability
        fields = ['day_of_week', 'start_time', 'end_time']

    def validate(self, data):
        """
        Validate availability slot:
        - start_time must be before end_time
        """
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time.'
            })
        return data

    def create(self, validated_data):
        """Create availability slot."""
        return FacultyAvailability.objects.create(**validated_data)


class AvailabilityListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing faculty availability slots.
    """
    day_name = serializers.CharField(
        source='get_day_of_week_display', read_only=True)

    class Meta:
        model = FacultyAvailability
        fields = [
            'id',
            'day_of_week',
            'day_name',
            'start_time',
            'end_time',
            'is_active'
        ]


class UpdateAvailabilitySerializer(serializers.ModelSerializer):
    """
    Serializer for updating availability slots.
    Allows updating time and active status.
    """
    class Meta:
        model = FacultyAvailability
        fields = ['start_time', 'end_time', 'is_active']

    def validate(self, data):
        """
        Validate availability slot:
        - start_time must be before end_time
        """
        start_time = data.get('start_time', self.instance.start_time)
        end_time = data.get('end_time', self.instance.end_time)

        if start_time >= end_time:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time.'
            })
        return data


# Basic Serializers for Nested Data

class BatchBasicSerializer(serializers.ModelSerializer):
    """Basic batch information for assignment responses."""
    course_name = serializers.CharField(
        source='template.course.name', read_only=True)
    mode = serializers.CharField(
        source='template.mode', read_only=True)

    class Meta:
        model = Batch
        fields = ['id', 'code', 'course_name', 'mode',
                  'start_date', 'end_date', 'status']


class ModuleBasicSerializer(serializers.ModelSerializer):
    """Basic module information for assignment responses."""
    course_name = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ['id', 'code', 'name', 'course_name']

    def get_course_name(self, obj):
        """Get the course name from CourseModule relationship."""
        course_module = obj.course_modules.first()
        if course_module:
            return course_module.course.name
        return None


class FacultyBasicSerializer(serializers.ModelSerializer):
    """Basic faculty information for assignment responses."""
    user = UserBasicSerializer(read_only=True)

    class Meta:
        model = FacultyProfile
        fields = ['id', 'employee_code', 'designation', 'user']


# Faculty Module Assignment Serializers

class FacultyModuleAssignmentCreateSerializer(serializers.Serializer):
    """
    Serializer for creating faculty module assignments.
    """
    faculty_id = serializers.IntegerField()
    module_id = serializers.IntegerField()

    def validate_faculty_id(self, value):
        """Validate faculty exists and is active."""
        try:
            faculty = FacultyProfile.objects.get(id=value)
            if not faculty.is_active:
                raise serializers.ValidationError("Faculty is not active.")
            return faculty
        except FacultyProfile.DoesNotExist:
            raise serializers.ValidationError("Faculty does not exist.")

    def validate_module_id(self, value):
        """Validate module exists."""
        try:
            module = Module.objects.get(id=value)
            if not module.is_active:
                raise serializers.ValidationError("Module is not active.")
            return module
        except Module.DoesNotExist:
            raise serializers.ValidationError("Module does not exist.")

    def validate(self, data):
        """Check for duplicate assignments."""
        faculty = data['faculty_id']
        module = data['module_id']

        # Check if assignment already exists
        existing = FacultyModuleAssignment.objects.filter(
            faculty=faculty,
            module=module
        ).exists()

        if existing:
            raise serializers.ValidationError(
                "This faculty is already assigned to this module."
            )

        return data

    def create(self, validated_data):
        """Create faculty module assignment."""
        assignment = FacultyModuleAssignment.objects.create(
            faculty=validated_data['faculty_id'],
            module=validated_data['module_id'],
            is_active=True
        )
        return assignment


class FacultyModuleAssignmentListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing faculty module assignments.
    Includes nested details for easy display.
    """
    faculty = FacultyBasicSerializer(read_only=True)
    module = ModuleBasicSerializer(read_only=True)

    class Meta:
        model = FacultyModuleAssignment
        fields = [
            'id',
            'faculty',
            'module',
            'is_active',
            'assigned_at'
        ]


class FacultyModuleAssignmentUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating faculty module assignment.
    Allows updating module and active status.
    """
    module_id = serializers.IntegerField(required=False)

    class Meta:
        model = FacultyModuleAssignment
        fields = ['module_id', 'is_active']

    def validate_module_id(self, value):
        """Validate module exists and is active."""
        try:
            module = Module.objects.get(id=value)
            if not module.is_active:
                raise serializers.ValidationError("Module is not active.")
            return module
        except Module.DoesNotExist:
            raise serializers.ValidationError("Module does not exist.")

    def update(self, instance, validated_data):
        """Update assignment."""
        if 'module_id' in validated_data:
            instance.module = validated_data['module_id']
        if 'is_active' in validated_data:
            instance.is_active = validated_data['is_active']
        instance.save()
        return instance


# Faculty Batch Assignment Serializers

class FacultyBatchAssignmentCreateSerializer(serializers.Serializer):
    """
    Serializer for creating faculty batch assignments.
    """
    faculty_id = serializers.IntegerField()
    batch_id = serializers.IntegerField()

    def validate_faculty_id(self, value):
        """Validate faculty exists and is active."""
        try:
            faculty = FacultyProfile.objects.get(id=value)
            if not faculty.is_active:
                raise serializers.ValidationError("Faculty is not active.")
            return faculty
        except FacultyProfile.DoesNotExist:
            raise serializers.ValidationError("Faculty does not exist.")

    def validate_batch_id(self, value):
        """Validate batch exists and is active."""
        try:
            batch = Batch.objects.get(id=value)
            if batch.status != 'ACTIVE':
                raise serializers.ValidationError("Batch is not active.")
            return batch
        except Batch.DoesNotExist:
            raise serializers.ValidationError("Batch does not exist.")

    def validate(self, data):
        """Check for duplicate assignments."""
        faculty = data['faculty_id']
        batch = data['batch_id']

        # Check if assignment already exists
        existing = FacultyBatchAssignment.objects.filter(
            faculty=faculty,
            batch=batch
        ).exists()

        if existing:
            raise serializers.ValidationError(
                "This faculty is already assigned to this batch."
            )

        return data

    def create(self, validated_data):
        """Create faculty batch assignment."""
        assignment = FacultyBatchAssignment.objects.create(
            faculty=validated_data['faculty_id'],
            batch=validated_data['batch_id'],
            is_active=True
        )
        return assignment


class FacultyBatchAssignmentListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing faculty batch assignments.
    Includes nested details for easy display.
    """
    faculty = FacultyBasicSerializer(read_only=True)
    batch = BatchBasicSerializer(read_only=True)

    class Meta:
        model = FacultyBatchAssignment
        fields = [
            'id',
            'faculty',
            'batch',
            'is_active',
            'assigned_at'
        ]


class FacultyBatchAssignmentUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating faculty batch assignment.
    Allows updating batch and active status.
    """
    batch_id = serializers.IntegerField(required=False)

    class Meta:
        model = FacultyBatchAssignment
        fields = ['batch_id', 'is_active']

    def validate_batch_id(self, value):
        """Validate batch exists and is active."""
        try:
            batch = Batch.objects.get(id=value)
            if batch.status != 'ACTIVE':
                raise serializers.ValidationError("Batch is not active.")
            return batch
        except Batch.DoesNotExist:
            raise serializers.ValidationError("Batch does not exist.")

    def update(self, instance, validated_data):
        """Update assignment."""
        if 'batch_id' in validated_data:
            instance.batch = validated_data['batch_id']
        if 'is_active' in validated_data:
            instance.is_active = validated_data['is_active']
        instance.save()
        return instance


# Faculty Conflict Check Serializer

class CheckConflictSerializer(serializers.Serializer):
    """
    Serializer for checking timetable conflicts.
    Validates proposed time slot against faculty availability.
    """
    day_of_week = serializers.IntegerField(min_value=1, max_value=7)
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()

    def validate(self, data):
        """Validate that start_time is before end_time."""
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time.'
            })
        return data


# ==================== FACULTY SELF-PROFILE SERIALIZERS ====================

class FacultySelfProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for faculty to view their own profile.
    READ-ONLY fields: email, employee_code, role, centre
    """
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    phone = serializers.CharField(source='user.phone')
    role = serializers.SerializerMethodField()
    centre = serializers.SerializerMethodField()

    class Meta:
        model = FacultyProfile
        fields = [
            'id',
            'email',
            'full_name',
            'employee_code',
            'designation',
            'phone',
            'joining_date',
            'is_active',
            'role',
            'centre'
        ]
        read_only_fields = ['id', 'email', 'full_name', 'employee_code',
                            'joining_date', 'is_active', 'role', 'centre']

    def get_role(self, obj):
        """Get role information."""
        return {
            'id': obj.user.role.id,
            'name': obj.user.role.name,
            'code': obj.user.role.code
        }

    def get_centre(self, obj):
        """Get centre information."""
        if obj.user.centre:
            return {
                'id': obj.user.centre.id,
                'name': obj.user.centre.name,
                'code': obj.user.centre.code
            }
        return None


class UpdateFacultySelfProfileSerializer(serializers.Serializer):
    """
    Serializer for faculty to update their own profile.
    Only phone and designation can be edited.
    """
    phone = serializers.CharField(max_length=15, required=False)
    designation = serializers.CharField(max_length=100, required=False)

    def update(self, instance, validated_data):
        """Update faculty profile."""
        if 'phone' in validated_data:
            instance.user.phone = validated_data['phone']
            instance.user.save()
        if 'designation' in validated_data:
            instance.designation = validated_data['designation']
            instance.save()
        return instance
