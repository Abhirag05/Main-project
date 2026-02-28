"""
Serializers for authentication APIs.
Frontend-friendly serializers for Next.js integration.
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from apps.users.models import User
from apps.roles.models import Role
from apps.centres.models import Centre


class CentreSerializer(serializers.ModelSerializer):
    """Serializer for Centre model - minimal data for frontend."""

    class Meta:
        model = Centre
        fields = ['id', 'name', 'code']
        read_only_fields = ['id', 'name', 'code']


class RoleSerializer(serializers.ModelSerializer):
    """Serializer for Role model - minimal data for frontend."""

    class Meta:
        model = Role
        fields = ['id', 'name', 'code']
        read_only_fields = ['id', 'name', 'code']


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Detailed user serializer for authenticated endpoints.
    Returns nested role and centre data.
    DOES NOT expose is_staff or is_superuser (backend-only fields).
    """
    role = RoleSerializer(read_only=True)
    centre = CentreSerializer(read_only=True)

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
        ]
        read_only_fields = fields


class LoginSerializer(serializers.Serializer):
    """
    Serializer for login endpoint.
    Accepts email and password, validates credentials.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={
                                     'input_type': 'password'})

    def validate(self, attrs):
        """Validate user credentials."""
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            # Check if user exists first to provide specific error message
            try:
                existing_user = User.objects.get(email=email)
            except User.DoesNotExist:
                raise serializers.ValidationError(
                    'No account found with this email address.',
                    code='authorization'
                )

            # Check if account is deactivated BEFORE authenticating
            # This allows us to provide better error messages for students
            if not existing_user.is_active:
                # For students, check admission_status for specific messaging
                if existing_user.role and existing_user.role.code == 'STUDENT':
                    if hasattr(existing_user, 'student_profile'):
                        profile = existing_user.student_profile
                        if profile.admission_status == 'SUSPENDED':
                            raise serializers.ValidationError(
                                'Your account has been suspended. Please contact the admin for assistance.',
                                code='suspended'
                            )
                        elif profile.admission_status == 'PAYMENT_DUE':
                            raise serializers.ValidationError(
                                'Your access has been suspended due to pending installment payment. Please contact the finance team.',
                                code='payment_due'
                            )
                        elif profile.admission_status in ['DROPPED', 'REJECTED']:
                            raise serializers.ValidationError(
                                'Your admission has been terminated. Please contact the admin for more details.',
                                code='terminated'
                            )
                # Generic message for non-students or if no profile
                raise serializers.ValidationError(
                    'Your account has been disabled. Please contact the admin.',
                    code='authorization'
                )

            # Authenticate using email (USERNAME_FIELD)
            user = authenticate(
                request=self.context.get('request'),
                username=email,  # Django uses 'username' internally
                password=password
            )

            if not user:
                raise serializers.ValidationError(
                    'Incorrect password.',
                    code='authorization'
                )

            # Check that user has role and centre (required fields)
            if not user.role:
                raise serializers.ValidationError(
                    'User account is not properly configured (missing role).',
                    code='configuration'
                )

            if not user.centre:
                raise serializers.ValidationError(
                    'User account is not properly configured (missing centre).',
                    code='configuration'
                )

            # Payment Verification Check for Students
            if user.role.code == 'STUDENT':
                try:
                    # Check if student profile exists
                    if hasattr(user, 'student_profile'):
                        profile = user.student_profile
                        # New lifecycle: only ACTIVE students can login
                        # Legacy statuses also allowed for backward compatibility
                        allowed_statuses = [
                            'ACTIVE',
                            'FULL_PAYMENT_VERIFIED',  # legacy
                            'INSTALLMENT_VERIFIED'    # legacy
                        ]

                        if profile.admission_status not in allowed_statuses:
                            # Customize message based on status
                            if profile.admission_status in ['PENDING', 'APPROVED']:
                                msg = 'Your admission is pending payment verification. Please wait for the admin to verify your payment before you can access the system.'
                            elif profile.admission_status == 'PAYMENT_DUE':
                                msg = 'Your access has been suspended due to pending installment payment. Please complete your installment and contact the admin to restore access.'
                            elif profile.admission_status in ['SUSPENDED', 'DISABLED']:
                                msg = 'Your account has been suspended by the admin. Please contact the admin to resolve this.'
                            elif profile.admission_status in ['DROPPED', 'REJECTED']:
                                msg = 'Your admission has been terminated. Please contact the admin for more details.'
                            elif profile.admission_status == 'INSTALLMENT_PENDING':  # legacy
                                msg = 'Your access has been suspended due to pending installment payment. Please complete your installment and contact the admin to restore access.'
                            elif profile.admission_status == 'COURSE_COMPLETED':  # legacy
                                msg = 'Your course has been completed. Your access to the system has ended. Thank you for learning with us!'
                            else:
                                msg = f'Your account is currently inactive. Please contact the admin for assistance.'

                            raise serializers.ValidationError(
                                msg, code='payment_verification')

                except serializers.ValidationError:
                    raise
                except Exception as e:
                    # Log error if needed, but don't block unless critical
                    pass

            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError(
                'Must include "email" and "password".',
                code='required'
            )


class LogoutSerializer(serializers.Serializer):
    """
    Serializer for logout endpoint.
    Accepts refresh token to blacklist.
    """
    refresh = serializers.CharField(
        required=True, help_text="Refresh token to blacklist")

    def validate(self, attrs):
        """Validate refresh token."""
        return attrs
