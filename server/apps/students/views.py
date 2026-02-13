"""
Public student registration API.
"""
from apps.faculty.models import FacultyModuleAssignment, FacultyBatchAssignment
from apps.academics.models import CourseModule
from apps.batch_management.models import BatchStudent, BatchMentorAssignment, BatchRecordedSession
from apps.batch_management.serializers import BatchRecordedSessionSerializer
from apps.audit.services import AuditService
from common.permissions import IsFinanceUser, IsStudent, IsAdminUser
from apps.users.models import User
from apps.students.models import StudentProfile
from apps.students.serializers import (
    StudentRegistrationSerializer,
    StudentAdmissionListSerializer,
    AdmissionApproveSerializer,
    AdmissionRejectSerializer,
    MyBatchSerializer,
    MyBatchModuleFacultySerializer,
    PlacementStudentWithSkillsSerializer,
    StudentReferralSerializer,
    FinanceReferralListSerializer
)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework import generics as drf_generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class StudentRegistrationView(APIView):
    """
    Public API for student registration (pre-admission).

    STRICT RULES:
    - AllowAny permission (public endpoint)
    - Only creates User with STUDENT role + StudentProfile
    - admission_status = PENDING by default
    - Does NOT return JWT tokens
    - Does NOT assign batch or fees
    - Does NOT grant full LMS access

    POST /api/public/student/register/

    Request:
    {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@student.com",
        "password": "StrongPassword123!"
    }

    Response:
    {
        "message": "Registration successful. Admission pending approval.",
        "student_id": <user_id>
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """Handle student registration."""
        serializer = StudentRegistrationSerializer(data=request.data)

        if serializer.is_valid():
            # Create User and StudentProfile
            result = serializer.save()
            user = result['user']

            return Response(
                {
                    'message': 'Registration successful. Admission pending approval.',
                    'student_id': user.id
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class ReferralCodeValidationView(APIView):
    """
    Public API to validate referral codes.

    GET /api/public/student/referral/validate/?code=AB12CD34

    Response:
    {
        "valid": true,
        "message": "Referral code is valid."
    }
    """
    permission_classes = [AllowAny]

    def get(self, request):
        code = (request.query_params.get('code') or '').strip().upper()

        if not code:
            return Response(
                {
                    'valid': False,
                    'message': 'Referral code is required.'
                },
                status=status.HTTP_200_OK
            )

        exists = StudentProfile.objects.filter(referral_code=code).exists()

        return Response(
            {
                'valid': exists,
                'message': 'Referral code is valid.' if exists else 'Referral code is invalid.'
            },
            status=status.HTTP_200_OK
        )


class FinanceAdmissionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Finance API for managing student admissions.

    PERMISSIONS:
    - Only users with FINANCE role can access these endpoints

    ENDPOINTS:
    - GET /api/finance/admissions/ - List all student admissions
    - GET /api/finance/admissions/?admission_status=PENDING - Filter by status
    - PATCH /api/finance/admissions/{id}/approve/ - Approve admission
    - PATCH /api/finance/admissions/{id}/reject/ - Reject admission

    BUSINESS RULES:
    - Only PENDING admissions can be approved or rejected
    - All status changes are logged in AuditLog
    - FINANCE users can view all students regardless of centre
    """
    permission_classes = [IsAuthenticated, IsFinanceUser]
    serializer_class = StudentAdmissionListSerializer
    queryset = StudentProfile.objects.select_related(
        'user',
        'user__role',
        'user__centre'
    ).filter(user__role__code='STUDENT')

    def get_queryset(self):
        """
        Optionally filter by admission_status query parameter.

        Examples:
        - /api/finance/admissions/ - All students
        - /api/finance/admissions/?admission_status=PENDING
        - /api/finance/admissions/?admission_status=APPROVED
        """
        queryset = super().get_queryset()
        admission_status = self.request.query_params.get(
            'admission_status', None)

        if admission_status:
            queryset = queryset.filter(
                admission_status=admission_status.upper())

        return queryset.order_by('-created_at')

    @action(detail=True, methods=['patch'], url_path='approve')
    @transaction.atomic
    def approve(self, request, pk=None):
        """Approve admission"""
        student_profile = get_object_or_404(StudentProfile, pk=pk)
        if student_profile.admission_status == 'APPROVED':
            return Response({'error': 'Admission is already approved.'}, status=status.HTTP_400_BAD_REQUEST)

        previous_status = student_profile.admission_status
        student_profile.admission_status = 'APPROVED'
        student_profile.save(update_fields=['admission_status', 'updated_at'])

        AuditService.log(
            action='ADMISSION_APPROVED', entity='StudentProfile', entity_id=str(student_profile.id),
            performed_by=request.user, details={
                'previous_status': previous_status, 'student_user_id': student_profile.user.id}
        )
        return Response({'message': 'Admission approved successfully'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='reject')
    @transaction.atomic
    def reject(self, request, pk=None):
        """Reject admission"""
        student_profile = get_object_or_404(StudentProfile, pk=pk)
        if student_profile.admission_status == 'REJECTED':
            return Response({'error': 'Admission is already rejected.'}, status=status.HTTP_400_BAD_REQUEST)

        previous_status = student_profile.admission_status
        student_profile.admission_status = 'REJECTED'
        student_profile.save(update_fields=['admission_status', 'updated_at'])

        AuditService.log(
            action='ADMISSION_REJECTED', entity='StudentProfile', entity_id=str(student_profile.id),
            performed_by=request.user, details={
                'previous_status': previous_status, 'reason': request.data.get('rejection_reason', '')}
        )
        return Response({'message': 'Admission rejected'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='set-pending')
    @transaction.atomic
    def set_pending(self, request, pk=None):
        """Set to pending"""
        student_profile = get_object_or_404(StudentProfile, pk=pk)
        if student_profile.admission_status == 'PENDING':
            return Response({'error': 'Already PENDING.'}, status=status.HTTP_400_BAD_REQUEST)
        previous_status = student_profile.admission_status
        student_profile.admission_status = 'PENDING'
        student_profile.save(update_fields=['admission_status', 'updated_at'])
        AuditService.log(action='ADMISSION_SET_PENDING', entity='StudentProfile', entity_id=str(
            student_profile.id), performed_by=request.user, details={'previous_status': previous_status})
        return Response({'message': 'Admission status set to pending'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='verify-full-payment')
    @transaction.atomic
    def verify_full_payment(self, request, pk=None):
        """Verify full payment"""
        student_profile = get_object_or_404(StudentProfile, pk=pk)
        student_profile.admission_status = 'FULL_PAYMENT_VERIFIED'
        student_profile.payment_status = 'FULL_PAYMENT'
        student_profile.save(
            update_fields=['admission_status', 'payment_status', 'updated_at'])
        student_profile.user.is_active = True
        student_profile.user.save(update_fields=['is_active'])
        AuditService.log(action='FULL_PAYMENT_VERIFIED', entity='StudentProfile', entity_id=str(
            student_profile.id), performed_by=request.user)
        return Response({'message': 'Full payment verified successfully'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='verify-installment')
    @transaction.atomic
    def verify_installment(self, request, pk=None):
        """Verify installment"""
        student_profile = get_object_or_404(StudentProfile, pk=pk)
        previous_status = student_profile.admission_status
        student_profile.admission_status = 'INSTALLMENT_VERIFIED'
        student_profile.payment_status = 'INSTALLMENT'
        student_profile.save(
            update_fields=['admission_status', 'payment_status', 'updated_at'])
        student_profile.user.is_active = True
        student_profile.user.save(update_fields=['is_active'])
        AuditService.log(action='INSTALLMENT_VERIFIED', entity='StudentProfile', entity_id=str(
            student_profile.id), performed_by=request.user, details={'previous_status': previous_status})
        return Response({'message': 'Installment payment verified successfully'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='disable-access')
    @transaction.atomic
    def disable_access(self, request, pk=None):
        """Disable access"""
        logger.info(f"Disable access called for pk={pk}")
        student_profile = get_object_or_404(StudentProfile, pk=pk)
        previous_status = student_profile.admission_status
        if previous_status == 'INSTALLMENT_VERIFIED':
            student_profile.admission_status = 'INSTALLMENT_PENDING'
        else:
            student_profile.admission_status = 'DISABLED'
        student_profile.save(update_fields=['admission_status', 'updated_at'])
        student_profile.user.is_active = False
        student_profile.user.save(update_fields=['is_active'])
        AuditService.log(action='STUDENT_ACCESS_DISABLED', entity='StudentProfile', entity_id=str(student_profile.id),
                         performed_by=request.user, details={'previous_status': previous_status, 'new_status': student_profile.admission_status})
        return Response({'message': 'Student access disabled'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='enable-access')
    @transaction.atomic
    def enable_access(self, request, pk=None):
        """Enable access"""
        logger.info(f"Enable access called for pk={pk}")
        student_profile = get_object_or_404(StudentProfile, pk=pk)
        previous_status = student_profile.admission_status
        if previous_status == 'INSTALLMENT_PENDING':
            student_profile.admission_status = 'INSTALLMENT_VERIFIED'
        elif previous_status == 'DISABLED' and student_profile.payment_status == 'FULL_PAYMENT':
            student_profile.admission_status = 'FULL_PAYMENT_VERIFIED'
        elif previous_status == 'DISABLED' and student_profile.payment_status == 'INSTALLMENT':
            student_profile.admission_status = 'INSTALLMENT_VERIFIED'
        else:
            student_profile.admission_status = 'PENDING'
        student_profile.save(update_fields=['admission_status', 'updated_at'])
        student_profile.user.is_active = True
        student_profile.user.save(update_fields=['is_active'])
        AuditService.log(action='STUDENT_ACCESS_ENABLED', entity='StudentProfile', entity_id=str(student_profile.id),
                         performed_by=request.user, details={'previous_status': previous_status, 'new_status': student_profile.admission_status})
        return Response({'message': 'Student access enabled'}, status=status.HTTP_200_OK)


class StudentReferralView(APIView):
    """
    Student API for viewing referral info.

    GET /api/student/referral/

    Response:
    {
        "referral_code": "AB12CD34",
        "confirmed_count": 3
    }
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        student_profile = get_object_or_404(StudentProfile, user=request.user)

        # Ensure referral code exists
        if not student_profile.referral_code:
            from apps.students.models import generate_referral_code

            referral_code = generate_referral_code()
            while StudentProfile.objects.filter(referral_code=referral_code).exists():
                referral_code = generate_referral_code()
            student_profile.referral_code = referral_code
            student_profile.save(update_fields=['referral_code'])

        serializer = StudentReferralSerializer({
            'referral_code': student_profile.referral_code,
            'confirmed_count': student_profile.referral_confirmed_count
        })
        return Response(serializer.data, status=status.HTTP_200_OK)


class FinanceReferralViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Finance API for confirming student referrals.

    ENDPOINTS:
    - GET /api/finance/referrals/ - List pending referrals
    - PATCH /api/finance/referrals/{student_profile_id}/confirm/ - Confirm referral
    """
    permission_classes = [IsAuthenticated, IsFinanceUser]
    serializer_class = FinanceReferralListSerializer

    def get_queryset(self):
        return StudentProfile.objects.select_related(
            'user',
            'referred_by',
            'referred_by__user'
        ).filter(referred_by__isnull=False, referral_confirmed=False)

    @action(detail=True, methods=['patch'], url_path='confirm')
    @transaction.atomic
    def confirm(self, request, pk=None):
        referred_student = get_object_or_404(StudentProfile, pk=pk)

        if referred_student.referral_confirmed:
            return Response(
                {'error': 'Referral already confirmed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not referred_student.referred_by:
            return Response(
                {'error': 'No referrer found for this student.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        referrer = StudentProfile.objects.select_for_update().get(
            pk=referred_student.referred_by_id
        )

        referred_student.referral_confirmed = True
        referred_student.referral_confirmed_at = timezone.now()
        referred_student.save(
            update_fields=['referral_confirmed', 'referral_confirmed_at'])

        referrer.referral_confirmed_count = referrer.referral_confirmed_count + 1
        referrer.save(update_fields=['referral_confirmed_count'])

        AuditService.log(
            action='REFERRAL_CONFIRMED',
            entity='StudentProfile',
            entity_id=str(referred_student.id),
            performed_by=request.user,
            details={
                'referred_student_id': referred_student.id,
                'referred_student_email': referred_student.user.email,
                'referrer_student_id': referrer.id,
                'referrer_email': referrer.user.email
            }
        )

        return Response(
            {
                'student_profile_id': referred_student.id,
                'referrer_student_profile_id': referrer.id,
                'message': 'Referral confirmed successfully.'
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['patch'], url_path='approve')
    @transaction.atomic
    def approve(self, request, pk=None):
        """
        Approve a student admission.

        PATCH /api/finance/admissions/{student_profile_id}/approve/

        CONDITIONS:
        - Can be called from any status

        ACTIONS:
        - Set admission_status = APPROVED
        - Create audit log entry

        RESPONSE:
        {
            "student_profile_id": 1,
            "user_id": 5,
            "full_name": "John Doe",
            "email": "john@example.com",
            "admission_status": "APPROVED",
            "message": "Admission approved successfully"
        }
        """
        student_profile = get_object_or_404(StudentProfile, pk=pk)

        # Check if already approved
        if student_profile.admission_status == 'APPROVED':
            return Response(
                {
                    'error': 'Admission is already approved.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update status
        previous_status = student_profile.admission_status
        student_profile.admission_status = 'APPROVED'
        student_profile.save(update_fields=['admission_status', 'updated_at'])

        # Create audit log
        AuditService.log(
            action='ADMISSION_APPROVED',
            entity='StudentProfile',
            entity_id=str(student_profile.id),
            performed_by=request.user,
            details={
                'previous_status': previous_status,
                'student_user_id': student_profile.user.id,
                'student_email': student_profile.user.email,
                'student_name': student_profile.user.full_name
            }
        )

        # Return response
        return Response(
            {
                'student_profile_id': student_profile.id,
                'user_id': student_profile.user.id,
                'full_name': student_profile.user.full_name,
                'email': student_profile.user.email,
                'admission_status': student_profile.admission_status,
                'message': 'Admission approved successfully'
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['patch'], url_path='reject')
    @transaction.atomic
    def reject(self, request, pk=None):
        """
        Reject a student admission.

        PATCH /api/finance/admissions/{student_profile_id}/reject/

        REQUEST:
        {
            "rejection_reason": "Incomplete documentation" (optional)
        }

        CONDITIONS:
        - Can be called from any status

        ACTIONS:
        - Set admission_status = REJECTED
        - Create audit log with reason

        RESPONSE:
        {
            "student_profile_id": 1,
            "user_id": 5,
            "full_name": "John Doe",
            "email": "john@example.com",
            "admission_status": "REJECTED",
            "message": "Admission rejected"
        }
        """
        student_profile = get_object_or_404(StudentProfile, pk=pk)

        # Check if already rejected
        if student_profile.admission_status == 'REJECTED':
            return Response(
                {
                    'error': 'Admission is already rejected.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get rejection reason from request (optional)
        rejection_reason = request.data.get('rejection_reason', '')

        # Update status
        previous_status = student_profile.admission_status
        student_profile.admission_status = 'REJECTED'
        student_profile.save(update_fields=['admission_status', 'updated_at'])

        # Create audit log
        AuditService.log(
            action='ADMISSION_REJECTED',
            entity='StudentProfile',
            entity_id=str(student_profile.id),
            performed_by=request.user,
            details={
                'previous_status': previous_status,
                'reason': rejection_reason,
                'student_user_id': student_profile.user.id,
                'student_email': student_profile.user.email,
                'student_name': student_profile.user.full_name
            }
        )

        # Return response
        return Response(
            {
                'student_profile_id': student_profile.id,
                'user_id': student_profile.user.id,
                'full_name': student_profile.user.full_name,
                'email': student_profile.user.email,
                'admission_status': student_profile.admission_status,
                'message': 'Admission rejected'
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['patch'], url_path='set-pending')
    @transaction.atomic
    def set_pending(self, request, pk=None):
        """
        Set admission status back to PENDING.

        PATCH /api/finance/admissions/{student_profile_id}/set-pending/

        CONDITIONS:
        - admission_status must be APPROVED or REJECTED

        ACTIONS:
        - Set admission_status = PENDING
        - Create audit log entry

        RESPONSE:
        {
            "student_profile_id": 1,
            "user_id": 5,
            "full_name": "John Doe",
            "email": "john@example.com",
            "admission_status": "PENDING",
            "message": "Admission status set to pending"
        }
        """
        student_profile = get_object_or_404(StudentProfile, pk=pk)

        # Validate current status
        if student_profile.admission_status == 'PENDING':
            return Response(
                {
                    'error': 'Admission status is already PENDING.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update status
        previous_status = student_profile.admission_status
        student_profile.admission_status = 'PENDING'
        student_profile.save(update_fields=['admission_status', 'updated_at'])

        # Create audit log
        AuditService.log(
            action='ADMISSION_SET_PENDING',
            entity='StudentProfile',
            entity_id=str(student_profile.id),
            performed_by=request.user,
            details={
                'previous_status': previous_status,
                'student_user_id': student_profile.user.id,
                'student_email': student_profile.user.email,
                'student_name': student_profile.user.full_name
            }
        )

        # Return response
        return Response(
            {
                'student_profile_id': student_profile.id,
                'user_id': student_profile.user.id,
                'full_name': student_profile.user.full_name,
                'email': student_profile.user.email,
                'admission_status': student_profile.admission_status,
                'message': 'Admission status set to pending'
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['patch'], url_path='verify-full-payment')
    @transaction.atomic
    def verify_full_payment(self, request, pk=None):
        """
        Verify full payment for a student admission.

        PATCH /api/public/student/finance/admissions/{student_profile_id}/verify-full-payment/

        ACTIONS:
        - Set admission_status = FULL_PAYMENT_VERIFIED
        - Set payment_status = FULL_PAYMENT
        - Enable user account (is_active = True)
        - Create audit log entry

        RESPONSE:
        {
            "student_profile_id": 1,
            "user_id": 5,
            "full_name": "John Doe",
            "email": "john@example.com",
            "admission_status": "FULL_PAYMENT_VERIFIED",
            "payment_status": "FULL_PAYMENT",
            "message": "Full payment verified successfully"
        }
        """
        student_profile = get_object_or_404(StudentProfile, pk=pk)

        # Update status
        previous_admission_status = student_profile.admission_status
        previous_payment_status = getattr(
            student_profile, 'payment_status', 'PENDING')

        student_profile.admission_status = 'FULL_PAYMENT_VERIFIED'
        student_profile.payment_status = 'FULL_PAYMENT'
        student_profile.save(
            update_fields=['admission_status', 'payment_status', 'updated_at'])

        # Enable user account
        student_profile.user.is_active = True
        student_profile.user.save(update_fields=['is_active'])

        # Create audit log
        AuditService.log(
            action='FULL_PAYMENT_VERIFIED',
            entity='StudentProfile',
            entity_id=str(student_profile.id),
            performed_by=request.user,
            details={
                'previous_admission_status': previous_admission_status,
                'previous_payment_status': previous_payment_status,
                'student_user_id': student_profile.user.id,
                'student_email': student_profile.user.email,
                'student_name': student_profile.user.full_name
            }
        )

        return Response(
            {
                'student_profile_id': student_profile.id,
                'user_id': student_profile.user.id,
                'full_name': student_profile.user.full_name,
                'email': student_profile.user.email,
                'admission_status': student_profile.admission_status,
                'payment_status': student_profile.payment_status,
                'message': 'Full payment verified successfully'
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['patch'], url_path='disable-access')
    @transaction.atomic
    def disable_access(self, request, pk=None):
        """
        Disable student access.

        PATCH /api/public/student/finance/admissions/{student_profile_id}/disable-access/

        ACTIONS:
        - Set admission_status = DISABLED
        - Disable user account (is_active = False)
        - Create audit log entry

        RESPONSE:
        {
            "student_profile_id": 1,
            "user_id": 5,
            "full_name": "John Doe",
            "email": "john@example.com",
            "admission_status": "DISABLED",
            "message": "Student access disabled successfully"
        }
        """
        logger.info(f"Disable access called for pk={pk}")
        student_profile = get_object_or_404(StudentProfile, pk=pk)

        # Update status
        previous_admission_status = student_profile.admission_status

        student_profile.admission_status = 'DISABLED'
        student_profile.save(update_fields=['admission_status', 'updated_at'])

        # Disable user account
        student_profile.user.is_active = False
        student_profile.user.save(update_fields=['is_active'])

        # Create audit log
        AuditService.log(
            action='access_disabled',
            entity='StudentProfile',
            entity_id=str(student_profile.id),
            performed_by=request.user,
            details={
                'previous_admission_status': previous_admission_status,
                'student_user_id': student_profile.user.id,
                'student_email': student_profile.user.email,
                'student_name': student_profile.user.full_name
            }
        )

        return Response(
            {
                'student_profile_id': student_profile.id,
                'user_id': student_profile.user.id,
                'full_name': student_profile.user.full_name,
                'email': student_profile.user.email,
                'admission_status': student_profile.admission_status,
                'message': 'Student access disabled successfully'
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['patch'], url_path='enable-access')
    @transaction.atomic
    def enable_access(self, request, pk=None):
        logger.info(f"Enable access called for pk={pk}")
        student_profile = get_object_or_404(StudentProfile, pk=pk)

        # Update status (revert to APPROVED if it was DISABLED)
        previous_admission_status = student_profile.admission_status

        if student_profile.admission_status == 'DISABLED':
            student_profile.admission_status = 'APPROVED'
            student_profile.save(
                update_fields=['admission_status', 'updated_at'])

        # Enable user login
        student_profile.user.is_active = True
        student_profile.user.save(update_fields=['is_active'])

        # Create audit log
        AuditService.log(
            action='access_enabled',
            entity='StudentProfile',
            entity_id=str(student_profile.id),
            performed_by=request.user,
            details={
                'previous_admission_status': previous_admission_status,
                'student_user_id': student_profile.user.id,
            }
        )

        return Response(
            {
                'student_profile_id': student_profile.id,
                'admission_status': student_profile.admission_status,
                'message': 'Student access enabled successfully'
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['patch'], url_path='verify-installment')
    @transaction.atomic
    def verify_installment(self, request, pk=None):
        """
        Verify installment payment for a student admission.

        PATCH /api/public/student/finance/admissions/{student_profile_id}/verify-installment/

        ACTIONS:
        - Set admission_status = INSTALLMENT_VERIFIED
        - Set payment_status = INSTALLMENT
        - Enable user account (is_active = True)
        - Create audit log entry

        RESPONSE:
        {
            "student_profile_id": 1,
            "user_id": 5,
            "full_name": "John Doe",
            "email": "john@example.com",
            "admission_status": "INSTALLMENT_VERIFIED",
            "payment_status": "INSTALLMENT",
            "message": "Installment payment verified successfully"
        }
        """
        student_profile = get_object_or_404(StudentProfile, pk=pk)

        # Update status
        previous_admission_status = student_profile.admission_status
        previous_payment_status = getattr(
            student_profile, 'payment_status', 'PENDING')

        student_profile.admission_status = 'INSTALLMENT_VERIFIED'
        student_profile.payment_status = 'INSTALLMENT'
        student_profile.save(
            update_fields=['admission_status', 'payment_status', 'updated_at'])

        # Enable user account
        student_profile.user.is_active = True
        student_profile.user.save(update_fields=['is_active'])

        # Create audit log
        AuditService.log(
            action='INSTALLMENT_VERIFIED',
            entity='StudentProfile',
            entity_id=str(student_profile.id),
            performed_by=request.user,
            details={
                'previous_admission_status': previous_admission_status,
                'previous_payment_status': previous_payment_status,
                'student_user_id': student_profile.user.id,
                'student_email': student_profile.user.email,
                'student_name': student_profile.user.full_name
            }
        )

        return Response(
            {
                'student_profile_id': student_profile.id,
                'user_id': student_profile.user.id,
                'full_name': student_profile.user.full_name,
                'email': student_profile.user.email,
                'admission_status': student_profile.admission_status,
                'payment_status': student_profile.payment_status,
                'message': 'Installment payment verified successfully'
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['patch'], url_path='disable-access')
    @transaction.atomic
    def disable_access(self, request, pk=None):
        """
        Disable student access.

        PATCH /api/public/student/finance/admissions/{student_profile_id}/disable-access/

        ACTIONS:
        - Set admission_status = DISABLED
        - Disable user account (is_active = False)
        - Create audit log entry

        RESPONSE:
        {
            "student_profile_id": 1,
            "user_id": 5,
            "full_name": "John Doe",
            "email": "john@example.com",
            "admission_status": "DISABLED",
            "message": "Student access disabled"
        }
        """
        student_profile = get_object_or_404(StudentProfile, pk=pk)

        # Update status - if installment verified, set to installment pending
        previous_status = student_profile.admission_status

        if previous_status == 'INSTALLMENT_VERIFIED':
            student_profile.admission_status = 'INSTALLMENT_PENDING'
        else:
            student_profile.admission_status = 'DISABLED'

        student_profile.save(update_fields=['admission_status', 'updated_at'])

        # Disable user account
        student_profile.user.is_active = False
        student_profile.user.save(update_fields=['is_active'])

        # Create audit log
        AuditService.log(
            action='STUDENT_ACCESS_DISABLED',
            entity='StudentProfile',
            entity_id=str(student_profile.id),
            performed_by=request.user,
            details={
                'previous_status': previous_status,
                'new_status': student_profile.admission_status,
                'student_user_id': student_profile.user.id,
                'student_email': student_profile.user.email,
                'student_name': student_profile.user.full_name,
                'reason': request.data.get('reason', '')
            }
        )

        return Response(
            {
                'student_profile_id': student_profile.id,
                'user_id': student_profile.user.id,
                'full_name': student_profile.user.full_name,
                'email': student_profile.user.email,
                'admission_status': student_profile.admission_status,
                'message': 'Student access disabled'
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['patch'], url_path='enable-access')
    @transaction.atomic
    def enable_access(self, request, pk=None):
        """
        Enable student access.

        PATCH /api/public/student/finance/admissions/{student_profile_id}/enable-access/

        ACTIONS:
        - Restore admission_status to payment verified status (FULL_PAYMENT_VERIFIED or INSTALLMENT_VERIFIED)
        - Enable user account (is_active = True)
        - Create audit log entry

        RESPONSE:
        {
            "student_profile_id": 1,
            "user_id": 5,
            "full_name": "John Doe",
            "email": "john@example.com",
            "admission_status": "FULL_PAYMENT_VERIFIED",
            "message": "Student access enabled"
        }
        """
        student_profile = get_object_or_404(StudentProfile, pk=pk)

        # Validate current status
        if student_profile.admission_status not in ['DISABLED', 'INSTALLMENT_PENDING']:
            return Response(
                {
                    'error': 'Can only enable students who are currently disabled or have installment pending.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Restore status based on current status
        previous_status = student_profile.admission_status

        if previous_status == 'INSTALLMENT_PENDING':
            student_profile.admission_status = 'INSTALLMENT_VERIFIED'
        elif previous_status == 'DISABLED' and student_profile.payment_status == 'FULL_PAYMENT':
            student_profile.admission_status = 'FULL_PAYMENT_VERIFIED'
        elif previous_status == 'DISABLED' and student_profile.payment_status == 'INSTALLMENT':
            student_profile.admission_status = 'INSTALLMENT_VERIFIED'
        else:
            # Fallback to PENDING if payment status is unclear
            student_profile.admission_status = 'PENDING'

        student_profile.save(update_fields=['admission_status', 'updated_at'])

        # Enable user account
        student_profile.user.is_active = True
        student_profile.user.save(update_fields=['is_active'])

        # Create audit log
        AuditService.log(
            action='STUDENT_ACCESS_ENABLED',
            entity='StudentProfile',
            entity_id=str(student_profile.id),
            performed_by=request.user,
            details={
                'previous_status': previous_status,
                'restored_status': student_profile.admission_status,
                'payment_status': student_profile.payment_status,
                'student_user_id': student_profile.user.id,
                'student_email': student_profile.user.email,
                'student_name': student_profile.user.full_name
            }
        )

        return Response(
            {
                'student_profile_id': student_profile.id,
                'user_id': student_profile.user.id,
                'full_name': student_profile.user.full_name,
                'email': student_profile.user.email,
                'admission_status': student_profile.admission_status,
                'message': 'Student access enabled'
            },
            status=status.HTTP_200_OK
        )


class MyBatchView(APIView):
    """
    Read-only API for students to view their currently assigned batch.

    PERMISSIONS:
    - Only authenticated users with STUDENT role
    - Students can only see their own batch

    ENDPOINT:
    - GET /api/student/my-batch/

    BUSINESS RULES:
    - Returns the student's active batch (BatchStudent.is_active = True)
    - Returns 200 with null batch if no active assignment
    - Includes mentor details if assigned
    - Includes total active students count
    - Read-only (no modifications allowed)

    SECURITY:
    - 403 Forbidden for non-STUDENT roles
    - 404 if StudentProfile doesn't exist
    - Optimized queries with select_related/prefetch_related
    """

    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        """
        Retrieve the student's currently assigned batch.

        Returns:
            200 OK: Batch details or null if no active batch
            403 Forbidden: If user is not a STUDENT
            404 Not Found: If StudentProfile doesn't exist
        """
        try:
            # Get the student profile linked to the authenticated user
            student_profile = StudentProfile.objects.select_related('user').get(
                user=request.user
            )
        except StudentProfile.DoesNotExist:
            return Response(
                {
                    'detail': 'Student profile not found for this user'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Find the active batch assignment
        # Use select_related to optimize the query and avoid N+1 issues
        try:
            batch_student = BatchStudent.objects.select_related(
                'batch',
                'batch__template',
                'batch__template__course'
            ).get(
                student=student_profile,
                is_active=True
            )

            batch = batch_student.batch

            # Get the active mentor assignment for this batch (if exists)
            try:
                mentor_assignment = BatchMentorAssignment.objects.select_related(
                    'mentor'
                ).get(
                    batch=batch,
                    is_active=True
                )
                mentor_name = mentor_assignment.mentor.full_name
                mentor_email = mentor_assignment.mentor.email
            except BatchMentorAssignment.DoesNotExist:
                mentor_name = None
                mentor_email = None

            # Count total active students in this batch
            total_students = BatchStudent.objects.filter(
                batch=batch,
                is_active=True
            ).count()

            # Prepare batch data
            batch_data = {
                'batch_id': batch.id,
                'batch_code': batch.code,
                'course_name': batch.template.course.name,
                'start_date': batch.start_date,
                'end_date': batch.end_date,
                'batch_status': batch.status,
                'mode': batch.template.mode,
                'mentor_name': mentor_name,
                'mentor_email': mentor_email,
                'total_students': total_students
            }

            # Serialize and return
            serializer = MyBatchSerializer(batch_data)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except BatchStudent.DoesNotExist:
            # Student has no active batch assignment
            return Response(
                {
                    'message': 'You are not assigned to any batch yet',
                    'batch': None
                },
                status=status.HTTP_200_OK
            )


class StudentRecordedSessionsView(drf_generics.ListAPIView):
    """
    List recorded sessions for the student's batch.

    GET /api/student/recordings/
    Access: STUDENT only
    """

    serializer_class = BatchRecordedSessionSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        try:
            student_profile = StudentProfile.objects.get(
                user=self.request.user)
        except StudentProfile.DoesNotExist:
            return BatchRecordedSession.objects.none()

        # Find active batch assignment
        try:
            batch_student = BatchStudent.objects.select_related(
                'batch',
                'batch__template'
            ).get(
                student=student_profile,
                is_active=True
            )
        except BatchStudent.DoesNotExist:
            return BatchRecordedSession.objects.none()

        batch = batch_student.batch

        # Only recorded mode batches
        if batch.template.mode != 'RECORDED':
            return BatchRecordedSession.objects.none()

        return BatchRecordedSession.objects.filter(batch=batch).order_by('-session_date', '-created_at')


class MyBatchModulesView(APIView):
    """
    API for students to view modules and faculty in their assigned batch.

    STRICT RULES:
    - READ-ONLY for students
    - Students can ONLY see their own batch modules
    - Returns faculty assignment info per subject
    - Returns 403 for non-STUDENT roles

    GET /api/student/my-batch/modules/

    Response:
    {
        "message": "Modules in your batch",
        "modules": [
            {
                "module_id": 1,
                "module_name": "Python Programming",
                "module_code": "PY101",
                "faculty_id": 5,
                "faculty_name": "Dr. Smith",
                "faculty_designation": "Senior Lecturer",
                "faculty_email": "smith@example.com"
            },
            {
                "module_id": 2,
                "module_name": "Data Structures",
                "module_code": "DS201",
                "faculty_id": null,
                "faculty_name": null,
                "faculty_designation": null,
                "faculty_email": null
            }
        ]
    }

    If no batch assigned:
    {
        "message": "You are not assigned to any batch yet",
        "modules": []
    }
    """

    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        """
        Get modules with faculty for the student's active batch.

        Business Logic:
        1. Find student's StudentProfile
        2. Find active BatchStudent record
        3. Get batch's course modules via CourseModule
        4. For each module, find assigned faculty by:
           - FacultyModuleAssignment (faculty can teach this subject)
           - FacultyBatchAssignment (faculty is assigned to this batch)
           - Both must be active
        """
        try:
            # Get StudentProfile for the authenticated user
            student_profile = StudentProfile.objects.select_related('user').get(
                user=request.user
            )
        except StudentProfile.DoesNotExist:
            return Response(
                {
                    'detail': 'Student profile not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Find active batch assignment
        try:
            batch_student = BatchStudent.objects.select_related(
                'batch',
                'batch__template',
                'batch__template__course'
            ).get(
                student=student_profile,
                is_active=True
            )

            batch = batch_student.batch
            course = batch.template.course

        except BatchStudent.DoesNotExist:
            # No active batch - return empty list with message
            return Response(
                {
                    'message': 'You are not assigned to any batch yet',
                    'modules': []
                },
                status=status.HTTP_200_OK
            )

        # Get all modules in the course (ordered by sequence)
        course_modules = CourseModule.objects.filter(
            course=course,
            is_active=True
        ).select_related('module').order_by('sequence_order')

        # Batch-fetch all faculty assignments for these modules to avoid N+1 queries
        module_ids = [cm.module_id for cm in course_modules]
        faculty_assignments = FacultyModuleAssignment.objects.filter(
            module_id__in=module_ids,
            is_active=True,
            faculty__batch_assignments__batch=batch,
            faculty__batch_assignments__is_active=True
        ).select_related('faculty', 'faculty__user')

        # Build map: module_id → first faculty assignment
        faculty_map = {}
        for fa in faculty_assignments:
            if fa.module_id not in faculty_map:
                faculty_map[fa.module_id] = fa

        # Build list of modules with faculty info
        modules_data = []

        for course_subject in course_modules:
            module = course_subject.module

            faculty_assignment = faculty_map.get(module.id)

            # Build subject data
            subject_data = {
                'module_id': module.id,
                'module_name': module.name,
                'module_code': module.code,
                'faculty_id': None,
                'faculty_name': None,
                'faculty_designation': None,
                'faculty_email': None
            }

            # Add faculty info if assigned
            if faculty_assignment:
                faculty = faculty_assignment.faculty
                subject_data['faculty_id'] = faculty.id
                subject_data['faculty_name'] = faculty.user.full_name
                subject_data['faculty_designation'] = faculty.designation
                subject_data['faculty_email'] = faculty.user.email

            modules_data.append(subject_data)

        # Serialize and return
        serializer = MyBatchModuleFacultySerializer(modules_data, many=True)

        return Response(
            {
                'message': 'Modules in your batch',
                'modules': serializer.data
            },
            status=status.HTTP_200_OK
        )


class StudentProgressViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Student Progress API for viewing verified students with their skills.

    PERMISSIONS:
    - Only admin-level users can access these endpoints

    ENDPOINTS:
    - GET /api/student-progress/ - List all verified students with skills
    - GET /api/student-progress/?skill_name=Python - Filter by skill name
    - GET /api/student-progress/?min_mastery=INTERMEDIATE - Filter by minimum mastery level

    BUSINESS RULES:
    - Only returns students with FULL_PAYMENT_VERIFIED or INSTALLMENT_VERIFIED status
    - Includes student skills with mastery levels
    - Includes batch and course information
    - Can filter by skill name and minimum mastery level
    - Students are ordered by overall performance (average skill score)
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = PlacementStudentWithSkillsSerializer

    def get_queryset(self):
        """
        Return verified students with their skills, batch, and course information.
        Supports filtering by skill name and minimum mastery level.
        """
        from apps.assessments.models import StudentSkill, Skill
        from django.db.models import Avg, Prefetch

        # Get query parameters
        skill_name = self.request.query_params.get('skill_name', None)
        min_mastery = self.request.query_params.get('min_mastery', None)

        # Base queryset - only verified students
        queryset = StudentProfile.objects.select_related(
            'user',
            'user__role',
            'user__centre'
        ).filter(
            user__role__code='STUDENT',
            admission_status__in=[
                'FULL_PAYMENT_VERIFIED', 'INSTALLMENT_VERIFIED']
        )

        # Filter by skill name if provided
        if skill_name:
            queryset = queryset.filter(
                skills__skill__name__icontains=skill_name
            ).distinct()

        # Filter by minimum mastery level if provided
        if min_mastery:
            # Map level to ensure proper filtering
            level_order = {
                'NOT_ACQUIRED': 0,
                'BEGINNER': 1,
                'INTERMEDIATE': 2,
                'ADVANCED': 3
            }
            if min_mastery.upper() in level_order:
                min_level_value = level_order[min_mastery.upper()]
                valid_levels = [
                    level for level, value in level_order.items() if value >= min_level_value]
                queryset = queryset.filter(
                    skills__level__in=valid_levels
                ).distinct()

        # Order by average skill score (highest first)
        queryset = queryset.annotate(
            avg_skill_score=Avg('skills__percentage_score')
        ).prefetch_related(
            Prefetch(
                'batch_memberships',
                queryset=BatchStudent.objects.filter(is_active=True).select_related(
                    'batch', 'batch__template', 'batch__template__course'
                ),
                to_attr='_active_batch_memberships'
            ),
            Prefetch(
                'skills',
                queryset=StudentSkill.objects.select_related('skill').order_by('-percentage_score'),
                to_attr='_prefetched_skills'
            )
        ).order_by('-avg_skill_score', '-updated_at')

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Override list to include batch and course info for each student.
        Uses prefetched data to avoid N+1 queries.
        """
        queryset = self.get_queryset()

        # Build response data
        results = []
        for student_profile in queryset:
            # Use prefetched batch memberships
            active_memberships = getattr(student_profile, '_active_batch_memberships', None)
            if active_memberships is None:
                from apps.batch_management.models import BatchStudent as BS
                batch_student = BS.objects.select_related(
                    'batch', 'batch__template', 'batch__template__course'
                ).filter(student=student_profile, is_active=True).first()
            else:
                batch_student = active_memberships[0] if active_memberships else None

            # Use prefetched skills
            prefetched_skills = getattr(student_profile, '_prefetched_skills', None)
            if prefetched_skills is None:
                from apps.assessments.models import StudentSkill
                prefetched_skills = StudentSkill.objects.select_related('skill').filter(
                    student=student_profile
                ).order_by('-percentage_score')

            # Prepare skills data
            skills_data = [{
                'skill_name': skill.skill.name,
                'level': skill.level,
                'percentage_score': float(skill.percentage_score),
                'last_updated': skill.last_updated
            } for skill in prefetched_skills]

            # Build student data
            student_data = {
                'student_profile_id': student_profile.id,
                'full_name': student_profile.user.full_name,
                'email': student_profile.user.email,
                'phone_number': student_profile.phone_number,
                'centre_name': student_profile.user.centre.name if student_profile.user.centre else None,
                'centre_code': student_profile.user.centre.code if student_profile.user.centre else None,
                'study_mode': student_profile.study_mode,
                'batch_id': batch_student.batch.id if batch_student else None,
                'batch_name': batch_student.batch.template.name if batch_student and batch_student.batch.template else None,
                'batch_code': batch_student.batch.code if batch_student else None,
                'course_id': batch_student.batch.template.course.id if batch_student and batch_student.batch.template and batch_student.batch.template.course else None,
                'course_name': batch_student.batch.template.course.name if batch_student and batch_student.batch.template and batch_student.batch.template.course else None,
                'course_code': batch_student.batch.template.course.code if batch_student and batch_student.batch.template and batch_student.batch.template.course else None,
                'skills': skills_data
            }

            results.append(student_data)

        return Response({
            'count': len(results),
            'results': results
        })

    @action(detail=False, methods=['get'], url_path='available-skills')
    def available_skills(self, request):
        """
        Get list of all available skills for filtering.

        GET /api/public/student/student-progress/available-skills/
        """
        from apps.assessments.models import Skill

        skills = Skill.objects.filter(is_active=True).values(
            'id', 'name', 'description').order_by('name')

        return Response({
            'count': len(skills),
            'skills': list(skills)
        })
