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

            if not user.is_active:
                raise serializers.ValidationError(
                    'User account is disabled.',
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
                        allowed_statuses = [
                            'FULL_PAYMENT_VERIFIED', 'INSTALLMENT_VERIFIED']

                        if profile.admission_status not in allowed_statuses:
                            # Customize message based on status
                            if profile.admission_status == 'PENDING':
                                msg = 'Your admission is pending payment verification. Please wait for the admin to verify your payment before you can access the system.'
                            elif profile.admission_status == 'REJECTED':
                                msg = 'Your admission application has been rejected. Please contact the admin for more details.'
                            elif profile.admission_status == 'INSTALLMENT_PENDING':
                                msg = 'Your access has been suspended due to pending installment payment. Please complete your installment and contact the admin to restore access.'
                            elif profile.admission_status == 'DISABLED':
                                msg = 'Your account has been disabled by the admin due to payment issues. Please contact the admin to resolve this.'
                            elif profile.admission_status == 'COURSE_COMPLETED':
                                msg = 'Your course has been completed. Your access to the system has ended. Thank you for learning with us!'
                            elif profile.admission_status == 'APPROVED':
                                msg = 'Your admission is approved but payment is not yet verified. Please contact the admin.'
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
