"""
Public student registration API.
"""
from apps.faculty.models import FacultyModuleAssignment, FacultyBatchAssignment
from apps.academics.models import CourseModule
from apps.batch_management.models import BatchStudent, BatchMentorAssignment
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


class FinanceAdmissionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Finance / Admin API for managing the student admission lifecycle.

    STUDENT LIFECYCLE
    ─────────────────
    PENDING      → Registered, awaiting first payment verification
    ACTIVE       → Payment verified (full or installment), student has LMS access
    PAYMENT_DUE  → Installment overdue, access temporarily revoked
    SUSPENDED    → Admin manually suspended access
    DROPPED      → Permanently removed from the system

    TRANSITION TABLE
    ────────────────
    PENDING     ─── verify-full-payment  ──→ ACTIVE
    PENDING     ─── verify-installment   ──→ ACTIVE
    PENDING     ─── drop                 ──→ DROPPED
    ACTIVE      ─── mark-overdue         ──→ PAYMENT_DUE   (installment only)
    ACTIVE      ─── suspend              ──→ SUSPENDED
    PAYMENT_DUE ─── collect-payment      ──→ ACTIVE
    PAYMENT_DUE ─── drop                 ──→ DROPPED
    SUSPENDED   ─── reactivate           ──→ ACTIVE
    SUSPENDED   ─── drop                 ──→ DROPPED
    """
    permission_classes = [IsAuthenticated, IsFinanceUser]
    serializer_class = StudentAdmissionListSerializer
    queryset = StudentProfile.objects.select_related(
        'user',
        'user__role',
        'user__centre'
    ).filter(user__role__code='STUDENT')

    def get_queryset(self):
        queryset = super().get_queryset()
        admission_status = self.request.query_params.get(
            'admission_status', None)

        if admission_status:
            queryset = queryset.filter(
                admission_status=admission_status.upper())

        return queryset.order_by('-created_at')

    # ── helpers ────────────────────────────────────────────────────

    def _transition(self, request, pk, *, to_status, set_active, audit_action,
                    allowed_from=None, payment_status=None, error_msg=None):
        """
        Generic state-transition helper. Validates the current status against
        `allowed_from` (if given), updates the profile, toggles `is_active`,
        and writes an audit log entry.
        """
        student_profile = get_object_or_404(StudentProfile, pk=pk)
        previous_status = student_profile.admission_status

        if allowed_from and previous_status not in allowed_from:
            return Response(
                {'error': error_msg or f'Cannot transition from {previous_status} to {to_status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        student_profile.admission_status = to_status
        update_fields = ['admission_status', 'updated_at']

        if payment_status is not None:
            student_profile.payment_status = payment_status
            update_fields.append('payment_status')

        student_profile.save(update_fields=update_fields)

        student_profile.user.is_active = set_active
        student_profile.user.save(update_fields=['is_active'])

        AuditService.log(
            action=audit_action,
            entity='StudentProfile',
            entity_id=str(student_profile.id),
            performed_by=request.user,
            details={
                'previous_status': previous_status,
                'new_status': to_status,
                'student_user_id': student_profile.user.id,
            },
        )

        return Response(
            {'message': f'Student status changed to {to_status}.'},
            status=status.HTTP_200_OK,
        )

    # ── PRIMARY LIFECYCLE ACTIONS ─────────────────────────────────

    @action(detail=True, methods=['patch'], url_path='verify-full-payment')
    @transaction.atomic
    def verify_full_payment(self, request, pk=None):
        """
        Verify full payment → ACTIVE.
        Allowed from: PENDING (or legacy APPROVED).
        """
        return self._transition(
            request, pk,
            to_status='ACTIVE',
            set_active=True,
            audit_action='FULL_PAYMENT_VERIFIED',
            allowed_from=['PENDING', 'APPROVED'],
            payment_status='FULL_PAYMENT',
            error_msg='Full payment can only be verified for students in PENDING status.',
        )

    @action(detail=True, methods=['patch'], url_path='verify-installment')
    @transaction.atomic
    def verify_installment(self, request, pk=None):
        """
        Verify first installment → ACTIVE.
        Allowed from: PENDING (or legacy APPROVED).
        """
        return self._transition(
            request, pk,
            to_status='ACTIVE',
            set_active=True,
            audit_action='INSTALLMENT_VERIFIED',
            allowed_from=['PENDING', 'APPROVED'],
            payment_status='INSTALLMENT',
            error_msg='Installment can only be verified for students in PENDING status.',
        )

    @action(detail=True, methods=['patch'], url_path='mark-overdue')
    @transaction.atomic
    def mark_overdue(self, request, pk=None):
        """
        Mark an installment student as overdue → PAYMENT_DUE.
        Access is suspended until next payment is collected.
        Allowed from: ACTIVE (installment students only).
        """
        student_profile = get_object_or_404(StudentProfile, pk=pk)
        if student_profile.payment_status != 'INSTALLMENT':
            return Response(
                {'error': 'Only installment students can be marked as overdue.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self._transition(
            request, pk,
            to_status='PAYMENT_DUE',
            set_active=False,
            audit_action='STUDENT_MARKED_OVERDUE',
            allowed_from=['ACTIVE'],
            error_msg='Only ACTIVE installment students can be marked as overdue.',
        )

    @action(detail=True, methods=['patch'], url_path='collect-payment')
    @transaction.atomic
    def collect_payment(self, request, pk=None):
        """
        Collect overdue installment → ACTIVE.
        Restores LMS access after payment is received.
        Allowed from: PAYMENT_DUE.
        """
        return self._transition(
            request, pk,
            to_status='ACTIVE',
            set_active=True,
            audit_action='INSTALLMENT_COLLECTED',
            allowed_from=['PAYMENT_DUE'],
            error_msg='Payment can only be collected for students in PAYMENT_DUE status.',
        )

    @action(detail=True, methods=['patch'], url_path='suspend')
    @transaction.atomic
    def suspend(self, request, pk=None):
        """
        Admin suspends a student → SUSPENDED.
        Allowed from: ACTIVE, PAYMENT_DUE.
        """
        return self._transition(
            request, pk,
            to_status='SUSPENDED',
            set_active=False,
            audit_action='STUDENT_SUSPENDED',
            allowed_from=['ACTIVE', 'PAYMENT_DUE'],
            error_msg='Only ACTIVE or PAYMENT_DUE students can be suspended.',
        )

    @action(detail=True, methods=['patch'], url_path='reactivate')
    @transaction.atomic
    def reactivate(self, request, pk=None):
        """
        Reactivate a suspended student → ACTIVE.
        Allowed from: SUSPENDED.
        """
        return self._transition(
            request, pk,
            to_status='ACTIVE',
            set_active=True,
            audit_action='STUDENT_REACTIVATED',
            allowed_from=['SUSPENDED'],
            error_msg='Only SUSPENDED students can be reactivated.',
        )

    @action(detail=True, methods=['patch'], url_path='drop')
    @transaction.atomic
    def drop(self, request, pk=None):
        """
        Permanently drop a student → DROPPED.
        Allowed from: PENDING, PAYMENT_DUE, SUSPENDED.
        """
        return self._transition(
            request, pk,
            to_status='DROPPED',
            set_active=False,
            audit_action='STUDENT_DROPPED',
            allowed_from=['PENDING', 'ACTIVE', 'PAYMENT_DUE', 'SUSPENDED'],
            error_msg='Cannot drop a student in their current status.',
        )

    # ── LEGACY ENDPOINTS (kept for backward compatibility) ────────

    @action(detail=True, methods=['patch'], url_path='approve')
    @transaction.atomic
    def approve(self, request, pk=None):
        """Legacy: approve admission (no-op in new lifecycle, kept for compat)."""
        student_profile = get_object_or_404(StudentProfile, pk=pk)
        previous_status = student_profile.admission_status
        AuditService.log(
            action='ADMISSION_APPROVED', entity='StudentProfile',
            entity_id=str(student_profile.id), performed_by=request.user,
            details={'previous_status': previous_status, 'student_user_id': student_profile.user.id},
        )
        return Response({'message': 'Admission noted. Use payment verification to activate.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='reject')
    @transaction.atomic
    def reject(self, request, pk=None):
        """Legacy: reject → maps to DROPPED."""
        return self._transition(
            request, pk,
            to_status='DROPPED',
            set_active=False,
            audit_action='ADMISSION_REJECTED',
            error_msg='Cannot reject this student.',
        )

    @action(detail=True, methods=['patch'], url_path='set-pending')
    @transaction.atomic
    def set_pending(self, request, pk=None):
        """Legacy: set to pending."""
        student_profile = get_object_or_404(StudentProfile, pk=pk)
        if student_profile.admission_status == 'PENDING':
            return Response({'error': 'Already PENDING.'}, status=status.HTTP_400_BAD_REQUEST)
        previous_status = student_profile.admission_status
        student_profile.admission_status = 'PENDING'
        student_profile.save(update_fields=['admission_status', 'updated_at'])
        AuditService.log(action='ADMISSION_SET_PENDING', entity='StudentProfile', entity_id=str(
            student_profile.id), performed_by=request.user, details={'previous_status': previous_status})
        return Response({'message': 'Admission status set to pending'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='complete-course')
    @transaction.atomic
    def complete_course(self, request, pk=None):
        """Legacy: maps to DROPPED."""
        return self._transition(
            request, pk,
            to_status='DROPPED',
            set_active=False,
            audit_action='COURSE_COMPLETED',
            allowed_from=['ACTIVE'],
            error_msg='Only ACTIVE students can be marked as course completed.',
        )

    @action(detail=True, methods=['patch'], url_path='disable-access')
    @transaction.atomic
    def disable_access(self, request, pk=None):
        """Legacy: maps to SUSPENDED (or PAYMENT_DUE for installment)."""
        student_profile = get_object_or_404(StudentProfile, pk=pk)
        if student_profile.payment_status == 'INSTALLMENT' and student_profile.admission_status == 'ACTIVE':
            return self._transition(
                request, pk, to_status='PAYMENT_DUE', set_active=False,
                audit_action='STUDENT_MARKED_OVERDUE',
            )
        return self._transition(
            request, pk, to_status='SUSPENDED', set_active=False,
            audit_action='STUDENT_SUSPENDED',
        )

    @action(detail=True, methods=['patch'], url_path='enable-access')
    @transaction.atomic
    def enable_access(self, request, pk=None):
        """Legacy: maps to reactivate → ACTIVE."""
        return self._transition(
            request, pk, to_status='ACTIVE', set_active=True,
            audit_action='STUDENT_REACTIVATED',
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


class MySkillsView(APIView):
    """
    Student API for viewing their own skills.

    GET /api/student/my-skills/

    Response:
    {
        "skills": [
            {
                "skill_id": 1,
                "skill_name": "Python",
                "skill_description": "Python programming language",
                "level": "INTERMEDIATE",
                "percentage_score": 72.5,
                "attempts_count": 3,
                "last_updated": "2026-02-10T12:00:00Z"
            }
        ]
    }
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        from apps.assessments.models import StudentSkill, Skill, AssessmentSkillMapping, StudentAssessmentAttempt
        from apps.assignments.models import AssignmentSkillMapping, AssignmentSubmission

        student_profile = get_object_or_404(StudentProfile, user=request.user)

        # Get student's active batch enrollment(s) to find course
        enrollments = BatchStudent.objects.filter(
            student=student_profile, is_active=True
        ).select_related('batch__template__course')

        if not enrollments.exists():
            return Response({'skills': []}, status=status.HTTP_200_OK)

        # Collect all course IDs from active enrollments
        course_ids = set()
        for enrollment in enrollments:
            course_ids.add(enrollment.batch.template.course_id)

        # Get ALL skills for those courses
        all_skills = Skill.objects.filter(
            course_id__in=course_ids, is_active=True
        ).order_by('name')

        # Get student's acquired skill data (keyed by skill_id)
        student_skills = StudentSkill.objects.filter(
            student=student_profile
        ).select_related('skill')
        skill_map = {ss.skill_id: ss for ss in student_skills}

        # Count assessments attempted per skill
        # StudentAssessmentAttempt where assessment has a mapping to this skill
        assessment_counts = {}
        for skill in all_skills:
            assessment_counts[skill.id] = StudentAssessmentAttempt.objects.filter(
                student=student_profile,
                assessment__skill_mappings__skill=skill
            ).distinct().count()

        # Count assignments submitted per skill
        assignment_counts = {}
        for skill in all_skills:
            assignment_counts[skill.id] = AssignmentSubmission.objects.filter(
                student=student_profile,
                assignment__skill_mappings__skill=skill
            ).distinct().count()

        skills_data = []
        for skill in all_skills:
            ss = skill_map.get(skill.id)
            skills_data.append({
                'skill_id': skill.id,
                'skill_name': skill.name,
                'skill_description': skill.description or '',
                'level': ss.level if ss else 'NOT_ACQUIRED',
                'percentage_score': float(ss.percentage_score) if ss else 0.0,
                'attempts_count': ss.attempts_count if ss else 0,
                'last_updated': ss.last_updated.isoformat() if ss and ss.last_updated else None,
                'assessment_count': assessment_counts.get(skill.id, 0),
                'assignment_count': assignment_counts.get(skill.id, 0),
            })

        return Response({'skills': skills_data}, status=status.HTTP_200_OK)


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

        # Base queryset - only active/verified students
        queryset = StudentProfile.objects.select_related(
            'user',
            'user__role',
            'user__centre'
        ).filter(
            user__role__code='STUDENT',
            admission_status__in=[
                'ACTIVE', 'APPROVED',
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
