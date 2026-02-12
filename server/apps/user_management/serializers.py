"""
Serializers for user management APIs.
All serializers whitelist fields for security.
"""
from rest_framework import serializers
from django.db import transaction
from django.apps import apps
from apps.users.models import User
from apps.roles.models import Role
from apps.centres.models import Centre


class RoleBasicSerializer(serializers.ModelSerializer):
    """Basic role information for user responses."""
    class Meta:
        model = Role
        fields = ['id', 'code', 'name']


class CentreBasicSerializer(serializers.ModelSerializer):
    """Basic centre information for user responses."""
    class Meta:
        model = Centre
        fields = ['id', 'code', 'name']


class CreateUserSerializer(serializers.Serializer):
    """
    Serializer for creating new users (controlled registration).
    Only accepts safe fields - no is_staff or is_superuser.
    For FACULTY role, also creates FacultyProfile.
    """
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(
        max_length=15, required=False, allow_blank=True)
    role_code = serializers.CharField(max_length=50)

    # Faculty-specific fields (required only if role is FACULTY)
    # employee_code is auto-generated, not provided by frontend
    designation = serializers.CharField(
        max_length=100, required=False, allow_blank=True)
    joining_date = serializers.DateField(required=False, allow_null=True)

    def validate_email(self, value):
        """Ensure email is unique."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists.")
        return value.lower()

    def validate_role_code(self, value):
        """Ensure role exists."""
        try:
            role = Role.objects.get(code=value)
            return role
        except Role.DoesNotExist:
            raise serializers.ValidationError(
                f"Role with code '{value}' does not exist.")

    def validate(self, data):
        """Validate that faculty-specific fields are provided when role is FACULTY."""
        role = data.get('role_code')
        if role and role.code == 'FACULTY':
            if not data.get('designation'):
                raise serializers.ValidationError({
                    'designation': 'Designation is required for faculty users.'
                })
            if not data.get('joining_date'):
                raise serializers.ValidationError({
                    'joining_date': 'Joining date is required for faculty users.'
                })
        return data

    def create(self, validated_data):
        """
        Create user with:
        - Default centre (first active centre)
        - Default password (for testing - will be replaced with email invitation)
        - Active by default
        - If role is FACULTY, also create FacultyProfile with auto-generated employee_code
        """
        # Use Django's app registry to avoid circular imports
        FacultyProfile = apps.get_model('faculty', 'FacultyProfile')

        # Get default centre (first active centre)
        default_centre = Centre.objects.filter(is_active=True).first()
        if not default_centre:
            raise serializers.ValidationError(
                "No active centre available. Please activate a centre first.")

        # Extract role from validated data (it was validated as Role object)
        role = validated_data.pop('role_code')

        # Extract faculty-specific fields
        designation = validated_data.pop('designation', None)
        joining_date = validated_data.pop('joining_date', None)

        # Auto-generate employee_code for faculty
        employee_code = None
        if role.code == 'FACULTY':
            # Get the highest existing employee code number
            last_faculty = FacultyProfile.objects.filter(
                employee_code__startswith='FAC'
            ).order_by('-employee_code').first()

            if last_faculty:
                # Extract number from last code (e.g., 'FAC005' -> 5)
                try:
                    last_num = int(last_faculty.employee_code[3:])
                    new_num = last_num + 1
                except (ValueError, IndexError):
                    # Fallback if format is unexpected
                    new_num = FacultyProfile.objects.count() + 1
            else:
                new_num = 1

            # Generate new code with zero-padding (e.g., FAC001, FAC010, FAC100)
            employee_code = f'FAC{new_num:03d}'

        # Create user and faculty profile in a transaction
        with transaction.atomic():
            # Create user with default password
            # TODO: Replace with email-based password reset flow in production
            user = User.objects.create(
                email=validated_data['email'],
                full_name=validated_data['full_name'],
                phone=validated_data.get('phone', ''),
                role=role,
                centre=default_centre,
                is_active=True  # Active by default
            )
            # Set default password for testing purposes
            user.set_password('ChangeMe@123')
            user.save()

            # If role is FACULTY, create FacultyProfile
            if role.code == 'FACULTY':
                FacultyProfile.objects.create(
                    user=user,
                    employee_code=employee_code,
                    designation=designation,
                    joining_date=joining_date,
                    is_active=True
                )

        return user


class UserListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing users.
    Includes nested role and centre, excludes sensitive fields.
    """
    role = RoleBasicSerializer(read_only=True)
    centre = CentreBasicSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'phone',
            'role',
            'centre',
            'is_active',
            'created_at',
            'last_login'
        ]
        # Explicitly exclude sensitive fields
        # is_staff, is_superuser, password are NOT in fields list


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Detailed user serializer.
    Same as UserListSerializer but can be extended later.
    """
    role = RoleBasicSerializer(read_only=True)
    centre = CentreBasicSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'full_name',
            'phone',
            'role',
            'centre',
            'is_active',
            'created_at',
            'last_login'
        ]


class UserUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating user details from admin UI.
    Allows updating `full_name`, `phone` and `role_code`.
    """
    full_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(
        max_length=15, required=False, allow_blank=True)
    role_code = serializers.CharField(max_length=50, required=False)

    def validate_role_code(self, value):
        try:
            return Role.objects.get(code=value)
        except Role.DoesNotExist:
            raise serializers.ValidationError(
                f"Role with code '{value}' does not exist.")

    def update(self, instance, validated_data):
        changed = {}
        if 'full_name' in validated_data:
            old = instance.full_name
            instance.full_name = validated_data['full_name']
            if old != instance.full_name:
                changed['full_name'] = {'old': old, 'new': instance.full_name}

        if 'phone' in validated_data:
            old = instance.phone
            instance.phone = validated_data.get('phone', '')
            if old != instance.phone:
                changed['phone'] = {'old': old, 'new': instance.phone}

        if 'role_code' in validated_data:
            role = validated_data['role_code']
            old = instance.role.code if instance.role else None
            instance.role = role
            if old != role.code:
                changed['role'] = {'old': old, 'new': role.code}

        instance.save()

        # Attach changes for views to log if desired
        instance._admin_changes = changed
        return instance


class UserStatusSerializer(serializers.Serializer):
    """
    Serializer for enabling/disabling users.
    Only accepts is_active field.
    """
    is_active = serializers.BooleanField()

    def update(self, instance, validated_data):
        """Update user's active status."""
        instance.is_active = validated_data['is_active']
        instance.save()
        return instance
