"""
Views for batch management app.
Provides REST API endpoints for BatchTemplate and related models.
"""
from apps.batch_management.models import BatchRecordedSession
from apps.batch_management.serializers import MentorBatchSerializer, MentorBatchStudentSerializer, BatchRecordedSessionSerializer
from rest_framework import viewsets, permissions, status, generics, serializers
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.db.models import Q, Count, Exists, OuterRef
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime

from apps.batch_management.models import BatchTemplate, Batch, BatchStudent, BatchMentorAssignment
from apps.batch_management.serializers import (
    BatchTemplateSerializer,
    CourseSerializer,
    BatchTemplateListSerializer,
    CreateBatchSerializer,
    BatchSerializer,
    BatchListSerializer,
    UpdateBatchStatusSerializer,
    EligibleStudentSerializer,
    AssignStudentsSerializer,
    BatchDetailsSerializer,
    AvailableMentorSerializer,
    AssignMentorSerializer,
    EligibleMentorSerializer,
    AssignMentorRequestSerializer,
    BatchMentorAssignmentSerializer,
)
from apps.academics.models import Course
from apps.students.models import StudentProfile
from apps.audit.services import AuditService
from common.role_constants import ADMIN_ROLE_CODES, is_admin_role

User = get_user_model()


# ==========================================
# Permission Classes
# ==========================================

class IsSuperAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission: only ADMIN-level roles can create/update/delete.
    All authenticated users can read.
    """

    def has_permission(self, request, view):
        # Allow read operations for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # Only users with admin-level role can create/update/delete
        if not request.user or not request.user.is_authenticated:
            return False

        # Check role code for any admin role
        return (
            hasattr(request.user, 'role') and
            request.user.role and
            is_admin_role(request.user.role.code)
        )


class IsCentreAdminOrSuperAdminReadOnly(permissions.BasePermission):
    """
    Custom permission for Batch management:
    - Centre Admin: Can create and manage batches for their centre
    - Finance Admin: Can create and manage batches for their centre
    - Super Admin: Read-only access to all batches
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, 'role') or not request.user.role:
            return False

        role_code = request.user.role.code

        # Any admin role is allowed
        if is_admin_role(role_code):
            # If admin has a centre, full access; otherwise read-only
            if hasattr(request.user, 'centre') and request.user.centre:
                return True
            return request.method in permissions.SAFE_METHODS

        return False

    def has_object_permission(self, request, view, obj):
        """Ensure admin can only access their own centre's batches (or all for super)."""
        if not request.user or not request.user.is_authenticated:
            return False

        role_code = request.user.role.code

        if is_admin_role(role_code):
            # Super-level admins can view all
            if role_code in ('SUPER_ADMIN', 'ADMIN'):
                if request.method in permissions.SAFE_METHODS:
                    return True
            # Centre-scoped admins: own centre only
            if hasattr(request.user, 'centre') and request.user.centre:
                return obj.centre_id == request.user.centre_id
            # Admins without centre can only read
            return request.method in permissions.SAFE_METHODS

        return False


class IsCentreAdmin(permissions.BasePermission):
    """
    Permission class for admin-level actions (was Centre Admin only).
    Now allows any ADMIN_ROLE_CODES role with a centre assigned.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, 'role') or not request.user.role:
            return False

        # Allow any admin-level role
        if not is_admin_role(request.user.role.code):
            return False

        # Must have a centre assigned
        if not hasattr(request.user, 'centre') or not request.user.centre:
            return False

        return True

    def has_object_permission(self, request, view, obj):
        """Ensure admin can only access their own centre's batches."""
        if not request.user or not request.user.is_authenticated:
            return False

        if not is_admin_role(request.user.role.code):
            return False

        # Admin can only access their centre's batches
        return obj.centre_id == request.user.centre_id


class IsCentreOrFinanceAdmin(permissions.BasePermission):
    """
    Permission class for admin-level roles.
    Consolidated: any ADMIN_ROLE_CODES role with a centre is allowed.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, 'role') or not request.user.role:
            return False

        # Allow any admin-level role
        if not is_admin_role(request.user.role.code):
            return False

        # Must have a centre assigned
        if not hasattr(request.user, 'centre') or not request.user.centre:
            return False

        return True

    def has_object_permission(self, request, view, obj):
        """Ensure admin can only access their own centre's batches."""
        if not request.user or not request.user.is_authenticated:
            return False

        if not is_admin_role(request.user.role.code):
            return False

        # Admin can only access their centre's batches
        return obj.centre_id == request.user.centre_id


class BatchTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for BatchTemplate model.

    Provides CRUD operations for batch templates.

    Endpoints:
        GET    /api/batch/templates/          - List all templates
        POST   /api/batch/templates/          - Create new template (SUPER_ADMIN only)
        GET    /api/batch/templates/{id}/     - Retrieve template details
        PUT    /api/batch/templates/{id}/     - Full update (SUPER_ADMIN only)
        DELETE /api/batch/templates/{id}/     - Delete template (SUPER_ADMIN only)

    Permissions:
        - Read: All authenticated users
        - Create/Update/Delete: SUPER_ADMIN role only
    """

    queryset = BatchTemplate.objects.select_related('course').all()
    serializer_class = BatchTemplateSerializer
    permission_classes = [IsSuperAdminOrReadOnly]
    http_method_names = ['get', 'post', 'put',
                         'delete', 'head', 'options']  # Exclude PATCH

    def get_queryset(self):
        """
        Optionally filter templates by course, mode, or active status.
        Query params: ?course=1&mode=LIVE&is_active=true
        """
        queryset = super().get_queryset()

        # Filter by course
        course_id = self.request.query_params.get('course')
        if course_id:
            queryset = queryset.filter(course_id=course_id)

        # Filter by mode
        mode = self.request.query_params.get('mode')
        if mode:
            queryset = queryset.filter(mode=mode)

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            is_active_bool = is_active.lower() in ['true', '1', 'yes']
            queryset = queryset.filter(is_active=is_active_bool)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        """Save the template with creation metadata."""
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """
        Soft delete: Sets is_active=False instead of deleting.
        This prevents issues with foreign key constraints from existing batches.
        """
        instance = self.get_object()

        # Soft delete by setting is_active to False
        instance.is_active = False
        instance.save()

        return Response(
            {"message": "Template disabled successfully"},
            status=status.HTTP_200_OK
        )


class CourseListView(generics.ListAPIView):
    """
    List all active courses (for dropdowns in batch template forms).

    Endpoint:
        GET /api/batch/courses/ - List all active courses
    """
    queryset = Course.objects.filter(is_active=True).order_by('name')
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]


# ==========================================
# Batch Management Views
# ==========================================

class BatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Batch model (execution layer).

    Endpoints:
        GET    /api/batches/                    - List batches (centre-scoped)
        POST   /api/batches/                    - Create batch from template (Centre Admin)
        GET    /api/batches/{id}/               - Retrieve batch details
        PATCH  /api/batches/{id}/status/        - Update batch status (Centre Admin)
        GET    /api/batch-templates/active/     - List active templates (custom action)
        GET    /api/batches/{id}/available-mentors/ - List available mentors
        POST   /api/batches/{id}/assign-mentor/ - Assign mentor to batch

    Permissions:
        - Centre Admin: Full access to their centre's batches
        - Super Admin: Read-only access to all batches
    """

    queryset = Batch.objects.select_related(
        'template', 'template__course', 'centre', 'mentor'
    ).annotate(
        active_student_count=Count('students', filter=Q(students__is_active=True))
    ).all()

    permission_classes = [IsCentreAdminOrSuperAdminReadOnly]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return BatchListSerializer
        elif self.action == 'create':
            return CreateBatchSerializer
        elif self.action == 'update_status':
            return UpdateBatchStatusSerializer
        elif self.action == 'active_templates':
            return BatchTemplateListSerializer
        elif self.action == 'eligible_students':
            return EligibleStudentSerializer
        elif self.action == 'assign_students':
            return AssignStudentsSerializer
        elif self.action == 'details':
            return BatchDetailsSerializer
        elif self.action == 'eligible_mentors':
            return EligibleMentorSerializer
        elif self.action == 'assign_mentor':
            return AssignMentorRequestSerializer
        # Legacy endpoints - kept for backward compatibility
        elif self.action == 'available_mentors':
            return AvailableMentorSerializer
        return BatchSerializer

    def get_queryset(self):
        """
        Filter batches based on user role:
        - Centre Admin: Only their centre's batches
        - Finance Admin: Only their centre's batches
        - Super Admin: All batches

        Optional filters: course, status, month, year
        """
        queryset = super().get_queryset()
        user = self.request.user

        # Centre Admin and Finance Admin: Filter by their centre
        if hasattr(user, 'role') and is_admin_role(user.role.code):
            if hasattr(user, 'centre') and user.centre:
                queryset = queryset.filter(centre_id=user.centre_id)

        # Filter by course
        course_id = self.request.query_params.get('course')
        if course_id:
            queryset = queryset.filter(template__course_id=course_id)

        # Filter by status
        batch_status = self.request.query_params.get('status')
        if batch_status:
            queryset = queryset.filter(status=batch_status.upper())

        # Filter by month and year
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        if month and year:
            try:
                month = int(month)
                year = int(year)
                queryset = queryset.filter(
                    start_date__month=month,
                    start_date__year=year
                )
            except ValueError:
                pass

        return queryset.order_by('-start_date')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Create a new batch from a template.

        Centre Admin only. Auto-generates batch code and assigns centre.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        template_id = serializer.validated_data['template_id']
        start_date = serializer.validated_data['start_date']
        end_date = serializer.validated_data['end_date']

        # Get template
        template = BatchTemplate.objects.select_related(
            'course').get(id=template_id)

        # Get user's centre
        centre = request.user.centre

        # Generate unique batch code
        # Format: <COURSE_CODE>-<MODE>-<MONTH><YEAR>-<CENTRE_CODE>
        batch_code = self._generate_batch_code(
            template.course.code,
            template.mode,
            start_date,
            centre.code
        )

        # Create batch
        batch = Batch.objects.create(
            template=template,
            centre=centre,
            code=batch_code,
            start_date=start_date,
            end_date=end_date,
            status=Batch.Status.ACTIVE,
            is_active=True
        )

        # Return full batch details
        response_serializer = BatchSerializer(batch)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )

    def _generate_batch_code(self, course_code, mode, start_date, centre_code):
        """
        Generate unique batch code.
        Format: <COURSE_CODE>-<MODE>-<MMYYYY>-<CENTRE_CODE>
        Example: FSWD-LIVE-012025-HYD
        """
        month_year = start_date.strftime("%m%Y")
        base_code = f"{course_code}-{mode}-{month_year}-{centre_code}"

        # Check if code exists, append counter if needed
        if Batch.objects.filter(code=base_code).exists():
            counter = 1
            while Batch.objects.filter(code=f"{base_code}-{counter}").exists():
                counter += 1
            return f"{base_code}-{counter}"

        return base_code

    @action(detail=True, methods=['patch'], url_path='status')
    def update_status(self, request, pk=None):
        """
        Update batch status (Centre Admin only).

        Allowed transitions:
        - ACTIVE → COMPLETED
        - ACTIVE → CANCELLED
        """
        batch = self.get_object()

        serializer = self.get_serializer(
            data=request.data,
            context={'batch': batch}
        )
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']

        # Update status
        batch.status = new_status
        batch.save(update_fields=['status', 'updated_at'])

        # Return updated batch
        response_serializer = BatchSerializer(batch)
        return Response(response_serializer.data)

    @action(detail=False, methods=['get'], url_path='templates/active',
            permission_classes=[permissions.IsAuthenticated])
    def active_templates(self, request):
        """
        List all active batch templates.

        Accessible by: Centre Admin, Super Admin
        Used for creating new batches.
        """
        templates = BatchTemplate.objects.filter(
            is_active=True
        ).select_related('course').order_by('name')

        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)

    # ==========================================
    # Student Assignment Actions
    # ==========================================

    @action(detail=True, methods=['get'], url_path='eligible-students',
            permission_classes=[IsCentreOrFinanceAdmin])
    def eligible_students(self, request, pk=None):
        """
        List students eligible for assignment to this batch.

        GET /api/batches/{batch_id}/eligible-students/

        Eligibility criteria:
        - admission_status in ['APPROVED', 'FULL_PAYMENT_VERIFIED', 'INSTALLMENT_VERIFIED']
        - NOT having any BatchStudent with is_active = True
        - Finance Admin only sees students with fee verification
          (FULL_PAYMENT_VERIFIED or INSTALLMENT_VERIFIED)
        - Centre Admin sees all APPROVED students

        Access: CENTRE_ADMIN or FINANCE
        """
        batch = self.get_object()

        # Subquery to check if student has an active batch assignment
        has_active_batch = BatchStudent.objects.filter(
            student_id=OuterRef('pk'),
            is_active=True
        )

        # Base query: students with approved-like statuses and no active batch
        base_queryset = StudentProfile.objects.exclude(
            Exists(has_active_batch)
        ).select_related('user')

        # Role-based filtering
        user_role = request.user.role.code

        if user_role == 'FINANCE':
            # Finance Admin only sees fee-verified students
            eligible_students = base_queryset.filter(
                admission_status__in=[
                    'FULL_PAYMENT_VERIFIED', 'INSTALLMENT_VERIFIED']
            )
        else:
            # Centre Admin sees all approved students (including fee-verified ones)
            eligible_students = base_queryset.filter(
                admission_status__in=[
                    'APPROVED', 'FULL_PAYMENT_VERIFIED', 'INSTALLMENT_VERIFIED']
            )

        eligible_students = eligible_students.order_by('-created_at')

        serializer = EligibleStudentSerializer(eligible_students, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='assign-students',
            permission_classes=[IsCentreOrFinanceAdmin])
    @transaction.atomic
    def assign_students(self, request, pk=None):
        """
        Assign multiple students to a batch.

        POST /api/batches/{batch_id}/assign-students/

        Request:
        {
            "student_profile_ids": [1, 2, 3]
        }

        Validations:
        - Batch belongs to request.user.centre
        - All students have admission_status in approved/verified statuses
        - None of the students already have an active batch
        - Batch capacity must not be exceeded

        Access: CENTRE_ADMIN or FINANCE
        """
        batch = self.get_object()

        # Validate request data
        serializer = AssignStudentsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student_profile_ids = serializer.validated_data['student_profile_ids']

        # 1. Check batch capacity
        current_count = batch.students.filter(is_active=True).count()
        max_students = batch.template.max_students
        available_slots = max_students - current_count

        if len(student_profile_ids) > available_slots:
            return Response(
                {
                    'error': f'Batch capacity exceeded. Available slots: {available_slots}, '
                             f'Requested: {len(student_profile_ids)}'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Check batch is active
        if batch.status != 'ACTIVE':
            return Response(
                {'error': f'Cannot assign students to a {batch.status} batch.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Fetch all requested students
        students = StudentProfile.objects.filter(
            id__in=student_profile_ids
        ).select_related('user')

        # Check all students exist
        found_ids = set(students.values_list('id', flat=True))
        missing_ids = set(student_profile_ids) - found_ids
        if missing_ids:
            return Response(
                {'error': f'Students not found: {list(missing_ids)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. Validate all students have approved or fee-verified status
        valid_statuses = ['APPROVED',
                          'FULL_PAYMENT_VERIFIED', 'INSTALLMENT_VERIFIED']
        non_approved = students.exclude(admission_status__in=valid_statuses)
        if non_approved.exists():
            non_approved_ids = list(non_approved.values_list('id', flat=True))
            return Response(
                {
                    'error': 'Some students do not have approved or verified admission status.',
                    'student_ids': non_approved_ids
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 5. Check none of them have an active batch already
        students_with_active_batch = StudentProfile.objects.filter(
            id__in=student_profile_ids,
            batch_memberships__is_active=True
        ).distinct()

        if students_with_active_batch.exists():
            already_assigned_ids = list(
                students_with_active_batch.values_list('id', flat=True))
            return Response(
                {
                    'error': 'Some students are already assigned to an active batch.',
                    'student_ids': already_assigned_ids
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 6. Create BatchStudent records
        batch_students = []
        for student in students:
            batch_students.append(
                BatchStudent(
                    batch=batch,
                    student=student,
                    is_active=True
                )
            )

        BatchStudent.objects.bulk_create(batch_students)

        # 7. Create audit log with role differentiation
        user_role = request.user.role.code
        action_name = (
            'STUDENTS_ASSIGNED_TO_BATCH_BY_FINANCE' if user_role == 'FINANCE'
            else 'STUDENTS_ASSIGNED_TO_BATCH_BY_CENTRE_ADMIN'
        )

        AuditService.log(
            action=action_name,
            entity='Batch',
            entity_id=str(batch.id),
            performed_by=request.user,
            details={
                'batch_code': batch.code,
                'student_ids': student_profile_ids,
                'student_count': len(student_profile_ids),
                'centre_id': batch.centre_id,
                'centre_code': batch.centre.code,
                'assigned_by_role': user_role
            }
        )

        # Return success response with updated batch details
        return Response(
            {
                'message': f'Successfully assigned {len(student_profile_ids)} students to batch {batch.code}.',
                'batch_id': batch.id,
                'batch_code': batch.code,
                'assigned_student_ids': student_profile_ids,
                'current_student_count': current_count + len(student_profile_ids),
                'max_students': max_students
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['get'], url_path='details',
            permission_classes=[IsCentreOrFinanceAdmin])
    def details(self, request, pk=None):
        """
        Get batch details with enrolled students.

        GET /api/batches/{batch_id}/details/

        Returns:
        - Batch info
        - List of students assigned (from BatchStudent where is_active = True)
          - name
          - email
          - joined_at

        Access: CENTRE_ADMIN or FINANCE
        """
        batch = self.get_object()

        # Prefetch active students for efficiency
        batch = Batch.objects.select_related(
            'template', 'template__course', 'centre'
        ).prefetch_related(
            'students__student__user',
            'mentor_assignments'
        ).get(pk=batch.pk)

        serializer = BatchDetailsSerializer(batch)
        return Response(serializer.data)

    # ==========================================
    # Mentor Assignment Actions (ERP-Grade with Assignment Table)
    # ==========================================

    @action(detail=True, methods=['get'], url_path='eligible-mentors',
            permission_classes=[IsCentreAdmin])
    def eligible_mentors(self, request, pk=None):
        """
        List mentors eligible for assignment to this batch.

        GET /api/batches/{batch_id}/eligible-mentors/

        Returns mentors who:
        - Have role.code == 'BATCH_MENTOR'
        - Are is_active == True (can login)
        - Belong to the same centre as the batch
        - Have NO active BatchMentorAssignment
        - OR have active assignment to THIS batch (allow keeping current mentor)

        Access: CENTRE_ADMIN only
        """
        batch = self.get_object()

        # Get IDs of mentors with active assignments to OTHER batches
        # Using the BatchMentorAssignment table - the source of truth
        mentors_assigned_to_other_batches = BatchMentorAssignment.objects.filter(
            is_active=True
        ).exclude(
            batch_id=batch.id  # Don't exclude current batch's mentor
        ).values_list('mentor_id', flat=True)

        # Get eligible mentors
        mentors = User.objects.filter(
            role__code='BATCH_MENTOR',
            is_active=True,
            centre_id=batch.centre_id
        ).exclude(
            id__in=mentors_assigned_to_other_batches
        ).select_related('role', 'centre').order_by('full_name')

        serializer = EligibleMentorSerializer(mentors, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch', 'post'], url_path='assign-mentor',
            permission_classes=[IsCentreAdmin])
    @transaction.atomic
    def assign_mentor(self, request, pk=None):
        """
        Assign or change mentor for a batch using BatchMentorAssignment table.

        PATCH /api/batches/{batch_id}/assign-mentor/
        POST  /api/batches/{batch_id}/assign-mentor/ (backward compatible)

        Request:
        {
            "mentor_user_id": 1
        }
        OR (backward compatible):
        {
            "mentor_id": 1
        }

        Business Rules:
        - A mentor can have ONLY ONE active assignment at a time
        - A batch can have ONLY ONE active mentor at a time
        - Previous assignments are soft-deactivated (preserved for history)

        Action (atomic transaction):
        1. Deactivate any active assignment for this batch
        2. Deactivate any active assignment for this mentor
        3. Create new BatchMentorAssignment (is_active=True)
        4. Create AuditLog entry

        Access: CENTRE_ADMIN only
        """
        batch = self.get_object()

        # Support both mentor_user_id (new) and mentor_id (legacy)
        data = request.data.copy()
        if 'mentor_id' in data and 'mentor_user_id' not in data:
            data['mentor_user_id'] = data['mentor_id']

        serializer = AssignMentorRequestSerializer(
            data=data,
            context={'batch': batch, 'request': request}
        )
        serializer.is_valid(raise_exception=True)

        mentor_user_id = serializer.validated_data['mentor_user_id']
        new_mentor = serializer.mentor  # Retrieved during validation

        # Get current active assignment for this batch (if any)
        current_batch_assignment = BatchMentorAssignment.objects.filter(
            batch=batch,
            is_active=True
        ).select_related('mentor').first()

        old_mentor = current_batch_assignment.mentor if current_batch_assignment else None
        old_mentor_id = old_mentor.id if old_mentor else None
        old_mentor_name = old_mentor.full_name if old_mentor else None

        # Step 1: Deactivate any active assignment for THIS BATCH
        deactivated_batch_assignments = BatchMentorAssignment.objects.filter(
            batch=batch,
            is_active=True
        ).update(
            is_active=False,
            unassigned_at=timezone.now()
        )

        # Step 2: Deactivate any active assignment for THIS MENTOR
        # (mentor might be assigned to another batch)
        deactivated_mentor_assignments = BatchMentorAssignment.objects.filter(
            mentor_id=mentor_user_id,
            is_active=True
        ).update(
            is_active=False,
            unassigned_at=timezone.now()
        )

        # Step 3: Create new active assignment
        new_assignment = BatchMentorAssignment.objects.create(
            mentor=new_mentor,
            batch=batch,
            is_active=True,
            assigned_by=request.user
        )

        # Step 4: Audit log
        AuditService.log(
            action='BATCH_MENTOR_ASSIGNED',
            entity='Batch',
            entity_id=str(batch.id),
            performed_by=request.user,
            details={
                'batch_code': batch.code,
                'batch_id': batch.id,
                'mentor_user_id': new_mentor.id,
                'new_mentor_id': new_mentor.id,
                'new_mentor_name': new_mentor.full_name,
                'old_mentor_id': old_mentor_id,
                'old_mentor_name': old_mentor_name,
                'centre_id': batch.centre_id,
                'assignment_id': new_assignment.id,
            }
        )

        return Response(
            {
                'message': f'Mentor {new_mentor.full_name} assigned to batch {batch.code}.',
                'batch_id': batch.id,
                'batch_code': batch.code,
                'assignment_id': new_assignment.id,
                'mentor': {
                    'id': new_mentor.id,
                    'full_name': new_mentor.full_name,
                    'email': new_mentor.email,
                    'phone': new_mentor.phone
                },
                'previous_mentor': {
                    'id': old_mentor_id,
                    'full_name': old_mentor_name
                } if old_mentor else None
            },
            status=status.HTTP_200_OK
        )

    # ==========================================
    # Legacy Endpoint (Deprecated - kept for backward compatibility)
    # ==========================================

    @action(detail=True, methods=['get'], url_path='available-mentors',
            permission_classes=[IsCentreAdmin])
    def available_mentors(self, request, pk=None):
        """
        DEPRECATED: Use eligible-mentors endpoint instead.

        GET /api/batches/{batch_id}/available-mentors/

        This endpoint now uses BatchMentorAssignment table for consistency.
        """
        batch = self.get_object()

        # Use BatchMentorAssignment table - same logic as eligible_mentors
        mentors_assigned_to_other_batches = BatchMentorAssignment.objects.filter(
            is_active=True
        ).exclude(
            batch_id=batch.id
        ).values_list('mentor_id', flat=True)

        mentors = User.objects.filter(
            role__code='BATCH_MENTOR',
            is_active=True,
            centre_id=batch.centre_id
        ).exclude(
            id__in=mentors_assigned_to_other_batches
        ).select_related('role', 'centre').order_by('full_name')

        serializer = AvailableMentorSerializer(mentors, many=True)
        return Response(serializer.data)


# ==========================================
# Batch Mentor Permission Class
# ==========================================

class IsBatchMentor(permissions.BasePermission):
    """
    Permission class for Batch Mentor role.
    Only allows access to users with role.code == 'BATCH_MENTOR'.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, 'role') or not request.user.role:
            return False

        return request.user.role.code == 'BATCH_MENTOR'


# ==========================================
# Mentor Dashboard Views (Read-Only)
# ==========================================


class MentorMyBatchesView(generics.ListAPIView):
    """
    List batches assigned to the logged-in mentor.

    GET /api/mentor/my-batches/

    Access: BATCH_MENTOR only

    Returns batches where:
    - mentor = request.user (via BatchMentorAssignment)
    - assignment is_active = True

    Response fields per batch:
    - batch_id
    - batch_code
    - course_name
    - start_date
    - end_date
    - batch_status
    - total_students
    """
    serializer_class = MentorBatchSerializer
    permission_classes = [permissions.IsAuthenticated, IsBatchMentor]

    def get_queryset(self):
        """
        Return batches assigned to the current mentor via BatchMentorAssignment.
        """
        # Get batch IDs where this mentor has active assignments
        assigned_batch_ids = BatchMentorAssignment.objects.filter(
            mentor=self.request.user,
            is_active=True
        ).values_list('batch_id', flat=True)

        # Return those batches with optimized queries
        return Batch.objects.filter(
            id__in=assigned_batch_ids
        ).select_related(
            'template',
            'template__course',
            'centre'
        ).annotate(
            active_student_count=Count('students', filter=Q(students__is_active=True))
        ).order_by('-start_date')


class MentorBatchStudentsView(generics.ListAPIView):
    """
    List students in the mentor's assigned batch.

    GET /api/mentor/batches/{batch_id}/students/

    Access: BATCH_MENTOR only (must be assigned to this batch)

    Returns students with:
    - student_id
    - full_name
    - email
    - phone
    - roll_no
    - joined_at
    """
    serializer_class = MentorBatchStudentSerializer
    permission_classes = [permissions.IsAuthenticated, IsBatchMentor]

    def get_queryset(self):
        """
        Return students in the specified batch if mentor is assigned to it.
        """
        batch_id = self.kwargs.get('batch_id')

        # Verify mentor is assigned to this batch
        is_assigned = BatchMentorAssignment.objects.filter(
            mentor=self.request.user,
            batch_id=batch_id,
            is_active=True
        ).exists()

        if not is_assigned:
            return BatchStudent.objects.none()

        return BatchStudent.objects.filter(
            batch_id=batch_id,
            is_active=True
        ).select_related(
            'student',
            'student__user'
        ).order_by('student__user__full_name')


class MentorBatchRecordedSessionsView(generics.ListCreateAPIView):
    """
    List/create recorded sessions for a mentor's recorded batch.

    GET /api/mentor/batches/{batch_id}/recordings/
    POST /api/mentor/batches/{batch_id}/recordings/

    Access: BATCH_MENTOR only (must be assigned to this batch)
    """

    serializer_class = BatchRecordedSessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsBatchMentor]

    def get_queryset(self):
        batch_id = self.kwargs.get('batch_id')

        is_assigned = BatchMentorAssignment.objects.filter(
            mentor=self.request.user,
            batch_id=batch_id,
            is_active=True
        ).exists()

        if not is_assigned:
            return BatchRecordedSession.objects.none()

        return BatchRecordedSession.objects.filter(batch_id=batch_id).order_by('-session_date', '-created_at')

    def perform_create(self, serializer):
        batch_id = self.kwargs.get('batch_id')

        # Ensure mentor is assigned
        is_assigned = BatchMentorAssignment.objects.filter(
            mentor=self.request.user,
            batch_id=batch_id,
            is_active=True
        ).exists()

        if not is_assigned:
            raise PermissionDenied("You are not assigned to this batch.")

        batch = Batch.objects.get(id=batch_id)

        # Ensure batch is recorded mode
        if batch.template.mode != 'RECORDED':
            raise PermissionDenied(
                "Recordings are only allowed for recorded batches.")

        # Validate session date within batch duration
        session_date = serializer.validated_data.get('session_date')
        if session_date < batch.start_date or session_date > batch.end_date:
            raise serializers.ValidationError({
                'session_date': f"Session date must be within batch duration ({batch.start_date} to {batch.end_date})"
            })

        serializer.save(batch=batch, uploaded_by=self.request.user)
