"""
API Views for Timetable & Course Plan module.

Implements RESTful endpoints for:
- TimeSlot management (recurring schedules)
- ClassSession management (actual class instances)
- CoursePlan management (structured syllabus)
- Conflict detection (FR-FAC-04)

Role-Based Access Control:
- SUPER_ADMIN: Read-only access to all timetables
- CENTRE_ADMIN: Full CRUD for their centre's batches
- ACADEMIC_COORDINATOR: Full CRUD for assigned batches
- COURSE_COORDINATOR: Full CRUD for assigned course batches
- BATCH_MENTOR: Read + limited edit for their batch
- FACULTY: Read own schedule, update session status
- STUDENT: Read own batch timetable

SRS Requirements:
- FR-TIM-01: Create batch timetables
- FR-TIM-02: Set recurring schedules
- FR-TIM-03: Notify faculty & students (status tracking)
- FR-TIM-04: Store structured course plans
- FR-TIM-05: Link classes to topics
- FR-TIM-06: Add meeting links
- FR-FAC-04: Detect timetable conflicts
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q, Count, Prefetch
from django.utils import timezone
from datetime import datetime, timedelta

from .models import TimeSlot, ClassSession, CoursePlan
from .serializers import (
    # TimeSlot
    TimeSlotListSerializer,
    TimeSlotCreateSerializer,
    TimeSlotUpdateSerializer,
    TimeSlotDetailSerializer,
    # ClassSession
    ClassSessionListSerializer,
    ClassSessionCreateSerializer,
    ClassSessionUpdateSerializer,
    ClassSessionDetailSerializer,
    BulkSessionCreateSerializer,
    BatchSessionsGenerateSerializer,
    # CoursePlan
    CoursePlanListSerializer,
    CoursePlanCreateSerializer,
    CoursePlanUpdateSerializer,
    CoursePlanDetailSerializer,
    BulkCoursePlanCreateSerializer,
    # Utilities
    FacultyConflictCheckSerializer,
    FacultyScheduleSerializer,
)
from apps.batch_management.models import Batch
from apps.faculty.models import FacultyProfile
from common.permissions import permission_required
from common.role_constants import ADMIN_ROLE_CODES, is_admin_role
from apps.audit.services import AuditService


# ==========================================
# Permission Classes
# ==========================================

class TimetablePermission:
    """
    Permission helper for timetable operations.
    """

    @staticmethod
    def can_manage_batch(user, batch):
        """Check if user can manage a specific batch's timetable."""
        if not user or not user.is_authenticated:
            return False

        # Superuser can do anything
        if user.is_superuser:
            return True

        role_code = getattr(user.role, 'code', None)

        # Super Admin: read-only
        if role_code == 'SUPER_ADMIN':
            return False  # Can view but not manage

        # Admin roles (CENTRE_ADMIN, ADMIN, FINANCE, PLACEMENT): manage their centre's batches
        if is_admin_role(role_code):
            return batch.centre_id == user.centre_id

        # Academic/Course Coordinator: manage assigned batches
        if role_code in ['ACADEMIC_COORDINATOR', 'COURSE_COORDINATOR']:
            # TODO: Add coordinator batch assignment logic
            return batch.centre_id == user.centre_id

        # Batch Mentor: manage their assigned batch
        if role_code == 'BATCH_MENTOR':
            if batch.mentor_id == user.id:
                return True
            try:
                from apps.batch_management.models import BatchMentorAssignment
                return BatchMentorAssignment.objects.filter(
                    batch=batch,
                    mentor=user,
                    is_active=True
                ).exists()
            except Exception:
                return False

        # Faculty: can update sessions for their time slots
        if role_code == 'FACULTY':
            return TimeSlot.objects.filter(
                batch=batch,
                faculty__user=user,
                is_active=True
            ).exists()

        return False

    @staticmethod
    def can_view_batch(user, batch):
        """Check if user can view a specific batch's timetable."""
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        role_code = getattr(user.role, 'code', None)

        # Admin roles can view all
        if role_code in ['SUPER_ADMIN', 'CENTRE_ADMIN', 'ADMIN', 'ACADEMIC_COORDINATOR', 'COURSE_COORDINATOR'] or is_admin_role(role_code):
            if role_code in ('SUPER_ADMIN', 'ADMIN'):
                return True
            return batch.centre_id == user.centre_id

        # Batch Mentor can view their batch
        if role_code == 'BATCH_MENTOR':
            if batch.mentor_id == user.id:
                return True
            try:
                from apps.batch_management.models import BatchMentorAssignment
                return BatchMentorAssignment.objects.filter(
                    batch=batch,
                    mentor=user,
                    is_active=True
                ).exists()
            except Exception:
                return False

        # Faculty can view batches they teach or are assigned to
        if role_code == 'FACULTY':
            from apps.faculty.models import FacultyBatchAssignment
            # Check if faculty has time slots for this batch
            has_timeslot = TimeSlot.objects.filter(
                batch=batch,
                faculty__user=user,
                is_active=True
            ).exists()
            # Also check if faculty is assigned to this batch
            try:
                faculty_profile = user.faculty_profile
                has_assignment = FacultyBatchAssignment.objects.filter(
                    faculty=faculty_profile,
                    batch=batch,
                    is_active=True
                ).exists()
                return has_timeslot or has_assignment
            except Exception:
                return has_timeslot

        # Student can view their enrolled batch
        if role_code == 'STUDENT':
            from apps.students.models import StudentProfile
            try:
                profile = StudentProfile.objects.get(user=user)
                return batch.students.filter(student=profile, is_active=True).exists()
            except StudentProfile.DoesNotExist:
                return False

        return False


# ==========================================
# TimeSlot Views
# ==========================================

class TimeSlotListCreateAPIView(APIView):
    """
    GET /api/timetable/time-slots/ - List time slots
    POST /api/timetable/time-slots/ - Create time slot

    Query Parameters:
    - batch: Filter by batch ID
    - faculty: Filter by faculty ID
    - day_of_week: Filter by day (1-7)
    - is_active: Filter by active status

    Permissions:
    - GET: timetable.view
    - POST: timetable.create
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), permission_required("timetable.create")()]
        return [IsAuthenticated(), permission_required("timetable.view")()]

    def get(self, request):
        """List time slots with optional filtering."""
        queryset = TimeSlot.objects.select_related(
            'batch', 'batch__template__course', 'module', 'faculty', 'faculty__user'
        )

        # Filter by batch
        batch_id = request.query_params.get('batch')
        if batch_id:
            queryset = queryset.filter(batch_id=batch_id)

        # Filter by faculty
        faculty_id = request.query_params.get('faculty')
        if faculty_id:
            queryset = queryset.filter(faculty_id=faculty_id)

        # Filter by day
        day = request.query_params.get('day_of_week')
        if day:
            queryset = queryset.filter(day_of_week=int(day))

        # Filter by active status
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Role-based filtering
        user = request.user
        role_code = getattr(user.role, 'code', None)

        if is_admin_role(role_code):
            queryset = queryset.filter(batch__centre=user.centre)
        elif role_code == 'FACULTY':
            queryset = queryset.filter(faculty__user=user)
        elif role_code == 'BATCH_MENTOR':
            queryset = queryset.filter(batch__mentor=user)
        elif role_code == 'STUDENT':
            from apps.students.models import StudentProfile
            try:
                profile = StudentProfile.objects.get(user=user)
                enrolled_batches = profile.batch_memberships.filter(
                    is_active=True
                ).values_list('batch_id', flat=True)
                queryset = queryset.filter(batch_id__in=enrolled_batches)
            except StudentProfile.DoesNotExist:
                queryset = queryset.none()

        serializer = TimeSlotListSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Create a new time slot."""
        serializer = TimeSlotCreateSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            # Check batch management permission
            batch = serializer.validated_data['batch']
            if not TimetablePermission.can_manage_batch(request.user, batch):
                return Response(
                    {'error': 'You do not have permission to manage this batch.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            time_slot = serializer.save()

            # Audit log
            AuditService.log(
                action='timetable.timeslot.created',
                entity='TimeSlot',
                entity_id=time_slot.id,
                performed_by=request.user,
                details={
                    'batch': batch.code,
                    'module': (time_slot.module.code if getattr(time_slot, 'module', None) else
                               (time_slot.subject.code if getattr(time_slot, 'subject', None) else None)),
                    'faculty': time_slot.faculty.employee_code,
                    'day': time_slot.day_of_week,
                    'time': f"{time_slot.start_time}-{time_slot.end_time}"
                }
            )

            return Response(
                TimeSlotDetailSerializer(time_slot).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TimeSlotDetailAPIView(APIView):
    """
    GET /api/timetable/time-slots/{id}/ - Get time slot details
    PUT /api/timetable/time-slots/{id}/ - Update time slot
    DELETE /api/timetable/time-slots/{id}/ - Delete time slot

    Permissions:
    - GET: timetable.view
    - PUT: timetable.edit
    - DELETE: timetable.delete
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), permission_required("timetable.view")()]
        elif self.request.method == 'PUT':
            return [IsAuthenticated(), permission_required("timetable.edit")()]
        return [IsAuthenticated(), permission_required("timetable.delete")()]

    def get_object(self, pk):
        return get_object_or_404(
            TimeSlot.objects.select_related(
                'batch', 'module', 'faculty', 'faculty__user'
            ),
            pk=pk
        )

    def get(self, request, pk):
        """Get time slot details."""
        time_slot = self.get_object(pk)

        if not TimetablePermission.can_view_batch(request.user, time_slot.batch):
            return Response(
                {'error': 'You do not have permission to view this timetable.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = TimeSlotDetailSerializer(time_slot)
        return Response(serializer.data)

    def put(self, request, pk):
        """Update time slot."""
        time_slot = self.get_object(pk)

        if not TimetablePermission.can_manage_batch(request.user, time_slot.batch):
            return Response(
                {'error': 'You do not have permission to manage this batch.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = TimeSlotUpdateSerializer(
            time_slot,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            updated = serializer.save()

            AuditService.log(
                action='timetable.timeslot.updated',
                entity='TimeSlot',
                entity_id=updated.id,
                performed_by=request.user,
                details={'changes': request.data}
            )

            return Response(TimeSlotDetailSerializer(updated).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Delete time slot (soft delete - set inactive)."""
        time_slot = self.get_object(pk)

        if not TimetablePermission.can_manage_batch(request.user, time_slot.batch):
            return Response(
                {'error': 'You do not have permission to manage this batch.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if there are future sessions
        future_sessions = time_slot.sessions.filter(
            session_date__gte=timezone.now().date(),
            status=ClassSession.Status.SCHEDULED
        ).count()

        if future_sessions > 0:
            return Response(
                {'error': f'Cannot delete time slot with {future_sessions} future sessions. Cancel sessions first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Soft delete
        time_slot.is_active = False
        time_slot.save()

        AuditService.log(
            action='timetable.timeslot.deleted',
            entity='TimeSlot',
            entity_id=time_slot.id,
            performed_by=request.user,
            details={'batch': time_slot.batch.code}
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


# ==========================================
# ClassSession Views
# ==========================================

class ClassSessionListCreateAPIView(APIView):
    """
    GET /api/timetable/sessions/ - List class sessions
    POST /api/timetable/sessions/ - Create class session

    Query Parameters:
    - batch: Filter by batch ID
    - time_slot: Filter by time slot ID
    - date_from: Filter sessions from date
    - date_to: Filter sessions until date
    - status: Filter by status

    Permissions:
    - GET: timetable.view
    - POST: timetable.create
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), permission_required("timetable.create")()]
        return [IsAuthenticated(), permission_required("timetable.view")()]

    def get(self, request):
        """List class sessions with filtering."""
        queryset = ClassSession.objects.select_related(
            'time_slot', 'time_slot__batch', 'time_slot__module',
            'time_slot__faculty', 'time_slot__faculty__user', 'course_plan'
        )

        # Filter by batch
        batch_id = request.query_params.get('batch')
        if batch_id:
            queryset = queryset.filter(time_slot__batch_id=batch_id)

        # Filter by time slot
        time_slot_id = request.query_params.get('time_slot')
        if time_slot_id:
            queryset = queryset.filter(time_slot_id=time_slot_id)

        # Filter by date range
        date_from = request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(session_date__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(session_date__lte=date_to)

        # Filter by status
        session_status = request.query_params.get('status')
        if session_status:
            queryset = queryset.filter(status=session_status)

        # Faculty filter
        faculty_id = request.query_params.get('faculty')
        if faculty_id:
            queryset = queryset.filter(time_slot__faculty_id=faculty_id)

        # Role-based filtering
        user = request.user
        role_code = getattr(user.role, 'code', None)

        if is_admin_role(role_code):
            queryset = queryset.filter(time_slot__batch__centre=user.centre)
        elif role_code == 'FACULTY':
            queryset = queryset.filter(time_slot__faculty__user=user)
        elif role_code == 'BATCH_MENTOR':
            # Get batch IDs where this user is assigned as mentor
            from apps.batch_management.models import BatchMentorAssignment
            mentor_batch_ids = BatchMentorAssignment.objects.filter(
                mentor=user, is_active=True
            ).values_list('batch_id', flat=True)
            queryset = queryset.filter(
                time_slot__batch_id__in=mentor_batch_ids)
        elif role_code == 'STUDENT':
            from apps.students.models import StudentProfile
            try:
                profile = StudentProfile.objects.get(user=user)
                enrolled_batches = profile.batch_memberships.filter(
                    is_active=True
                ).values_list('batch_id', flat=True)
                queryset = queryset.filter(
                    time_slot__batch_id__in=enrolled_batches)
            except StudentProfile.DoesNotExist:
                queryset = queryset.none()

        # Order by date
        queryset = queryset.order_by('session_date', 'time_slot__start_time')

        serializer = ClassSessionListSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Create a new class session."""
        serializer = ClassSessionCreateSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            time_slot = serializer.validated_data['time_slot']

            if not TimetablePermission.can_manage_batch(request.user, time_slot.batch):
                return Response(
                    {'error': 'You do not have permission to manage this batch.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            session = serializer.save()

            AuditService.log(
                action='timetable.session.created',
                entity='ClassSession',
                entity_id=session.id,
                performed_by=request.user,
                details={
                    'batch': time_slot.batch.code,
                    'date': str(session.session_date),
                    'module': (time_slot.module.code if getattr(time_slot, 'module', None) else
                               (time_slot.subject.code if getattr(time_slot, 'subject', None) else None))
                }
            )

            return Response(
                ClassSessionDetailSerializer(session).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ClassSessionDetailAPIView(APIView):
    """
    GET /api/timetable/sessions/{id}/ - Get session details
    PUT /api/timetable/sessions/{id}/ - Update session
    DELETE /api/timetable/sessions/{id}/ - Delete session
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), permission_required("timetable.view")()]
        elif self.request.method == 'PUT':
            # Allow faculty with timetable.view to access PUT (they can update their own sessions)
            # The put() method handles fine-grained authorization
            return [IsAuthenticated(), permission_required("timetable.view")()]
        return [IsAuthenticated(), permission_required("timetable.delete")()]

    def get_object(self, pk):
        return get_object_or_404(
            ClassSession.objects.select_related(
                'time_slot', 'time_slot__batch', 'time_slot__module',
                'time_slot__faculty', 'time_slot__faculty__user', 'course_plan'
            ),
            pk=pk
        )

    def get(self, request, pk):
        """Get session details."""
        session = self.get_object(pk)

        if not TimetablePermission.can_view_batch(request.user, session.time_slot.batch):
            return Response(
                {'error': 'You do not have permission to view this session.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ClassSessionDetailSerializer(session)
        return Response(serializer.data)

    def put(self, request, pk):
        """Update session."""
        session = self.get_object(pk)
        batch = session.time_slot.batch

        # Faculty can update their own sessions (status, notes, recording)
        user = request.user
        role_code = getattr(user.role, 'code', None)

        can_update = TimetablePermission.can_manage_batch(user, batch)

        # Faculty special case
        if role_code == 'FACULTY' and session.time_slot.faculty.user == user:
            can_update = True

        if not can_update:
            return Response(
                {'error': 'You do not have permission to update this session.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ClassSessionUpdateSerializer(
            session,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            updated = serializer.save()

            AuditService.log(
                action='timetable.session.updated',
                entity='ClassSession',
                entity_id=updated.id,
                performed_by=request.user,
                details={'changes': request.data}
            )

            return Response(ClassSessionDetailSerializer(updated).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Delete session."""
        session = self.get_object(pk)
        batch = session.time_slot.batch

        # Debug logging
        print(
            f"Delete session - User: {request.user.id}, Role: {getattr(request.user.role, 'code', None)}")
        print(
            f"Delete session - Batch: {batch.id}, Batch mentor_id: {batch.mentor_id}")
        print(
            f"Delete session - User ID: {request.user.id}, Batch Mentor ID: {batch.mentor_id}")

        if not TimetablePermission.can_manage_batch(request.user, batch):
            # Try to get batch mentor assignments
            try:
                from apps.batch_management.models import BatchMentorAssignment
                assignments = BatchMentorAssignment.objects.filter(
                    batch=batch,
                    mentor=request.user,
                    is_active=True
                )
                print(
                    f"Delete session - BatchMentorAssignment count: {assignments.count()}")
            except Exception as e:
                print(f"Delete session - Error checking assignments: {e}")

            return Response(
                {'error': 'You do not have permission to delete this session.'},
                status=status.HTTP_403_FORBIDDEN
            )

        session_info = {
            'batch': session.time_slot.batch.code,
            'date': str(session.session_date),
            'module': (session.time_slot.module.code if getattr(session.time_slot, 'module', None) else
                       (session.time_slot.subject.code if getattr(session.time_slot, 'subject', None) else None))
        }

        session.delete()

        AuditService.log(
            action='timetable.session.deleted',
            entity='ClassSession',
            entity_id=pk,
            performed_by=request.user,
            details=session_info
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class BulkSessionCreateAPIView(APIView):
    """
    POST /api/timetable/sessions/bulk/ - Generate sessions for date range

    Creates class sessions for all matching days in a date range.
    Useful for generating a semester's worth of sessions.
    """
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return [IsAuthenticated(), permission_required("timetable.create")()]

    def post(self, request):
        """Bulk create sessions."""
        serializer = BulkSessionCreateSerializer(data=request.data)

        if serializer.is_valid():
            time_slot = serializer.validated_data['time_slot']

            if not TimetablePermission.can_manage_batch(request.user, time_slot.batch):
                return Response(
                    {'error': 'You do not have permission to manage this batch.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            sessions = serializer.save()

            AuditService.log(
                action='timetable.sessions.bulk_created',
                entity='ClassSession',
                entity_id=time_slot.id,
                performed_by=request.user,
                details={
                    'batch': time_slot.batch.code,
                    'sessions_created': len(sessions),
                    'date_range': f"{serializer.validated_data['start_date']} to {serializer.validated_data['end_date']}"
                }
            )

            return Response({
                'message': f'Created {len(sessions)} sessions',
                'sessions': ClassSessionListSerializer(sessions, many=True).data
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BatchSessionsGenerateAPIView(APIView):
    """
    POST /api/timetable/batch/<batch_id>/generate-sessions/ - Generate all sessions for batch

    Generates class sessions for all active time slots of a batch
    for the entire batch duration (or specified date range).
    This is the recommended way to set up recurring sessions for a batch.

    Request Body:
    - start_date (optional): Start date (defaults to today or batch start)
    - end_date (optional): End date (defaults to batch end date)
    """
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return [IsAuthenticated(), permission_required("timetable.create")()]

    def post(self, request, batch_id):
        """Generate all sessions for a batch."""
        batch = get_object_or_404(Batch, pk=batch_id)

        if not TimetablePermission.can_manage_batch(request.user, batch):
            return Response(
                {'error': 'You do not have permission to manage this batch.'},
                status=status.HTTP_403_FORBIDDEN
            )

        data = request.data.copy()
        data['batch'] = batch_id

        serializer = BatchSessionsGenerateSerializer(data=data)

        if serializer.is_valid():
            sessions = serializer.save()

            AuditService.log(
                action='timetable.batch.sessions_generated',
                entity='Batch',
                entity_id=batch_id,
                performed_by=request.user,
                details={
                    'batch': batch.code,
                    'sessions_created': len(sessions),
                    'start_date': str(serializer.validated_data['start_date']),
                    'end_date': str(serializer.validated_data['end_date']),
                    'time_slots_count': batch.time_slots.filter(is_active=True).count()
                }
            )

            return Response({
                'message': f'Generated {len(sessions)} sessions for batch {batch.code}',
                'batch_code': batch.code,
                'sessions_count': len(sessions),
                'date_range': {
                    'start': str(serializer.validated_data['start_date']),
                    'end': str(serializer.validated_data['end_date'])
                },
                # Return first 20 for preview
                'sessions': ClassSessionListSerializer(sessions[:20], many=True).data
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# CoursePlan Views
# ==========================================

class CoursePlanListCreateAPIView(APIView):
    """
    GET /api/timetable/course-plans/ - List course plans
    POST /api/timetable/course-plans/ - Create course plan entry

    Query Parameters:
    - batch: Filter by batch ID
    - subject: Filter by subject ID
    - is_completed: Filter by completion status
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), permission_required("timetable.create")()]
        return [IsAuthenticated(), permission_required("timetable.view")()]

    def get(self, request):
        """List course plans."""
        queryset = CoursePlan.objects.select_related('batch', 'module')

        # Filter by batch
        batch_id = request.query_params.get('batch')
        if batch_id:
            queryset = queryset.filter(batch_id=batch_id)

        # Filter by subject
        module_id = request.query_params.get('subject')
        if module_id:
            queryset = queryset.filter(module_id=module_id)

        # Filter by completion
        is_completed = request.query_params.get('is_completed')
        if is_completed is not None:
            queryset = queryset.filter(
                is_completed=is_completed.lower() == 'true')

        # Role-based filtering
        user = request.user
        role_code = getattr(user.role, 'code', None)

        if is_admin_role(role_code):
            queryset = queryset.filter(batch__centre=user.centre)
        elif role_code == 'FACULTY':
            # Faculty can see plans for batches they teach
            taught_batches = TimeSlot.objects.filter(
                faculty__user=user, is_active=True
            ).values_list('batch_id', flat=True)
            queryset = queryset.filter(batch_id__in=taught_batches)

        serializer = CoursePlanListSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Create course plan entry."""
        serializer = CoursePlanCreateSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            batch = serializer.validated_data['batch']

            if not TimetablePermission.can_manage_batch(request.user, batch):
                return Response(
                    {'error': 'You do not have permission to manage this batch.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            plan = serializer.save()

            AuditService.log(
                action='timetable.courseplan.created',
                entity='CoursePlan',
                entity_id=plan.id,
                performed_by=request.user,
                details={
                    'batch': batch.code,
                    'module': (plan.module.code if getattr(plan, 'module', None) else
                               (plan.subject.code if getattr(plan, 'subject', None) else None)),
                    'topic': plan.topic_title
                }
            )

            return Response(
                CoursePlanDetailSerializer(plan).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CoursePlanDetailAPIView(APIView):
    """
    GET /api/timetable/course-plans/{id}/ - Get course plan details
    PUT /api/timetable/course-plans/{id}/ - Update course plan
    DELETE /api/timetable/course-plans/{id}/ - Delete course plan
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), permission_required("timetable.view")()]
        elif self.request.method == 'PUT':
            return [IsAuthenticated(), permission_required("timetable.edit")()]
        return [IsAuthenticated(), permission_required("timetable.delete")()]

    def get_object(self, pk):
        return get_object_or_404(
            CoursePlan.objects.select_related('batch', 'module'),
            pk=pk
        )

    def get(self, request, pk):
        """Get course plan details."""
        plan = self.get_object(pk)

        if not TimetablePermission.can_view_batch(request.user, plan.batch):
            return Response(
                {'error': 'You do not have permission to view this course plan.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CoursePlanDetailSerializer(plan)
        return Response(serializer.data)

    def put(self, request, pk):
        """Update course plan."""
        plan = self.get_object(pk)

        if not TimetablePermission.can_manage_batch(request.user, plan.batch):
            return Response(
                {'error': 'You do not have permission to manage this batch.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CoursePlanUpdateSerializer(
            plan,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            updated = serializer.save()

            AuditService.log(
                action='timetable.courseplan.updated',
                entity='CoursePlan',
                entity_id=updated.id,
                performed_by=request.user,
                details={'changes': request.data}
            )

            return Response(CoursePlanDetailSerializer(updated).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Delete course plan."""
        plan = self.get_object(pk)

        if not TimetablePermission.can_manage_batch(request.user, plan.batch):
            return Response(
                {'error': 'You do not have permission to manage this batch.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if linked to sessions
        if plan.class_sessions.exists():
            return Response(
                {'error': 'Cannot delete course plan linked to class sessions.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        plan_info = {
            'batch': plan.batch.code,
            'module': (plan.module.code if getattr(plan, 'module', None) else
                       (plan.subject.code if getattr(plan, 'subject', None) else None)),
            'topic': plan.topic_title
        }

        plan.delete()

        AuditService.log(
            action='timetable.courseplan.deleted',
            entity='CoursePlan',
            entity_id=pk,
            performed_by=request.user,
            details=plan_info
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


class BulkCoursePlanCreateAPIView(APIView):
    """
    POST /api/timetable/course-plans/copy/ - Copy course plans from another batch

    Useful for duplicating syllabus structure to new batches.
    """
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return [IsAuthenticated(), permission_required("timetable.create")()]

    def post(self, request):
        """Copy course plans between batches."""
        serializer = BulkCoursePlanCreateSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            target_batch = serializer.validated_data['target_batch']

            if not TimetablePermission.can_manage_batch(request.user, target_batch):
                return Response(
                    {'error': 'You do not have permission to manage the target batch.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            plans = serializer.save()

            AuditService.log(
                action='timetable.courseplan.bulk_copied',
                entity='CoursePlan',
                entity_id=target_batch.id,
                performed_by=request.user,
                details={
                    'source_batch': serializer.validated_data['source_batch'].code,
                    'target_batch': target_batch.code,
                    'plans_created': len(plans)
                }
            )

            return Response({
                'message': f'Copied {len(plans)} course plan entries',
                'plans': CoursePlanListSerializer(plans, many=True).data
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# Conflict & Schedule Views
# ==========================================

class FacultyConflictCheckAPIView(APIView):
    """
    POST /api/timetable/check-conflict/ - Check faculty schedule conflicts

    Used before creating time slots to verify no overlaps.
    Implements FR-FAC-04: Detect timetable conflicts.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Check for faculty and batch conflicts."""
        serializer = FacultyConflictCheckSerializer(data=request.data)

        if serializer.is_valid():
            data = serializer.validated_data
            exclude_id = data.get('exclude_time_slot')
            exclude_id = exclude_id.id if exclude_id else None

            conflict_data = []

            # Check faculty conflict
            has_faculty_conflict, faculty_conflicts = TimeSlot.check_faculty_conflict(
                faculty_id=data['faculty'].id,
                day_of_week=data['day_of_week'],
                start_time=data['start_time'],
                end_time=data['end_time'],
                exclude_id=exclude_id
            )

            if has_faculty_conflict:
                for c in faculty_conflicts:
                    module_name = c.module.name if c.module else 'Unknown Module'
                    conflict_data.append({
                        'id': c.id,
                        'batch': c.batch.code,
                        'module': module_name,
                        'time': f"{c.start_time.strftime('%H:%M')}-{c.end_time.strftime('%H:%M')}"
                    })

            # Check batch conflict if batch is provided
            if data.get('batch'):
                has_batch_conflict, batch_conflicts = TimeSlot.check_batch_conflict(
                    batch_id=data['batch'].id,
                    day_of_week=data['day_of_week'],
                    start_time=data['start_time'],
                    end_time=data['end_time'],
                    exclude_id=exclude_id
                )

                if has_batch_conflict:
                    for c in batch_conflicts:
                        module_name = c.module.name if c.module else 'Unknown Module'
                        faculty_name = c.faculty.user.full_name if (
                            c.faculty and hasattr(c.faculty, 'user')) else 'Unknown Faculty'
                        # Avoid duplicate entries
                        if not any(conf['id'] == c.id for conf in conflict_data):
                            conflict_data.append({
                                'id': c.id,
                                'batch': c.batch.code,
                                'module': module_name,
                                'time': f"{c.start_time.strftime('%H:%M')}-{c.end_time.strftime('%H:%M')}",
                                'faculty': faculty_name
                            })

            if conflict_data:
                return Response({
                    'has_conflict': True,
                    'conflicts': conflict_data
                })

            return Response({
                'has_conflict': False,
                'conflicts': []
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FacultyScheduleAPIView(APIView):
    """
    GET /api/timetable/faculty/{faculty_id}/schedule/ - Get faculty's weekly schedule
    GET /api/timetable/faculty/me/schedule/ - Get current faculty user's schedule

    Returns all time slots for a faculty organized by day.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, faculty_id=None):
        """Get faculty schedule."""
        # Handle 'me' parameter for current faculty user
        if faculty_id == 'me' or faculty_id is None:
            try:
                faculty = request.user.faculty_profile
            except AttributeError:
                return Response(
                    {'error': 'User is not a faculty member.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            faculty = get_object_or_404(FacultyProfile, id=faculty_id)

        # Check permission
        user = request.user
        role_code = getattr(user.role, 'code', None)

        # Faculty can view their own schedule
        can_view = (
            user.is_superuser or
            is_admin_role(role_code) or
            role_code in ['ACADEMIC_COORDINATOR'] or
            (role_code == 'FACULTY' and faculty.user == user)
        )

        if not can_view:
            return Response(
                {'error': 'You do not have permission to view this schedule.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = FacultyScheduleSerializer({'faculty_id': faculty.id})
        return Response(serializer.data)


class BatchTimetableAPIView(APIView):
    """
    GET /api/timetable/batch/{batch_id}/timetable/ - Get complete batch timetable

    Returns all time slots and upcoming sessions for a batch.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, batch_id):
        """Get batch timetable."""
        batch = get_object_or_404(Batch, id=batch_id)

        if not TimetablePermission.can_view_batch(request.user, batch):
            return Response(
                {'error': 'You do not have permission to view this batch.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get time slots
        time_slots = TimeSlot.objects.filter(
            batch=batch,
            is_active=True
        ).select_related('module', 'faculty', 'faculty__user')

        # Get upcoming sessions (next 2 weeks)
        today = timezone.now().date()
        two_weeks = today + timedelta(days=14)
        upcoming_sessions = ClassSession.objects.filter(
            time_slot__batch=batch,
            session_date__gte=today,
            session_date__lte=two_weeks
        ).select_related('time_slot', 'time_slot__module', 'time_slot__faculty').order_by('session_date')

        # Organize time slots by day
        schedule = {i: [] for i in range(1, 8)}
        for slot in time_slots:
            module_name = (slot.module.name if getattr(slot, 'module', None) else
                           (slot.subject.name if getattr(slot, 'subject', None) else None))
            module_code = (slot.module.code if getattr(slot, 'module', None) else
                           (slot.subject.code if getattr(slot, 'subject', None) else None))
            schedule[slot.day_of_week].append({
                'id': slot.id,
                'module': module_name,
                'module_code': module_code,
                'faculty': slot.faculty.user.full_name,
                'faculty_code': slot.faculty.employee_code,
                'start_time': slot.start_time.strftime('%H:%M'),
                'end_time': slot.end_time.strftime('%H:%M'),
                'room': slot.room_number,
                'meeting_link': slot.default_meeting_link or batch.meeting_link
            })

        day_names = dict(TimeSlot.WEEKDAY_CHOICES)
        weekly_schedule = [
            {
                'day': day_num,
                'day_name': day_names[day_num],
                'slots': sorted(schedule[day_num], key=lambda x: x['start_time'])
            }
            for day_num in range(1, 8)
        ]

        return Response({
            'batch_id': batch.id,
            'batch_code': batch.code,
            'course': batch.template.course.name,
            'start_date': str(batch.start_date),
            'end_date': str(batch.end_date),
            'meeting_link': batch.meeting_link,
            'weekly_schedule': weekly_schedule,
            'upcoming_sessions': ClassSessionListSerializer(upcoming_sessions, many=True).data
        })


class TodaySessionsAPIView(APIView):
    """
    GET /api/timetable/today/ - Get today's sessions for current user

    Returns sessions based on user role:
    - Faculty: Their teaching sessions
    - Student: Their batch sessions
    - Admin: All sessions for their centre
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get today's sessions."""
        today = timezone.now().date()
        user = request.user
        role_code = getattr(user.role, 'code', None)

        queryset = ClassSession.objects.filter(
            session_date=today
        ).select_related(
            'time_slot', 'time_slot__batch', 'time_slot__module',
            'time_slot__faculty', 'time_slot__faculty__user'
        ).order_by('time_slot__start_time')

        if role_code == 'FACULTY':
            queryset = queryset.filter(time_slot__faculty__user=user)
        elif role_code == 'STUDENT':
            from apps.students.models import StudentProfile
            try:
                profile = StudentProfile.objects.get(user=user)
                enrolled_batches = profile.batch_memberships.filter(
                    is_active=True
                ).values_list('batch_id', flat=True)
                queryset = queryset.filter(
                    time_slot__batch_id__in=enrolled_batches)
            except StudentProfile.DoesNotExist:
                queryset = queryset.none()
        elif role_code == 'BATCH_MENTOR':
            queryset = queryset.filter(time_slot__batch__mentor=user)
        elif is_admin_role(role_code):
            queryset = queryset.filter(time_slot__batch__centre=user.centre)

        serializer = ClassSessionListSerializer(queryset, many=True)
        return Response({
            'date': str(today),
            'sessions': serializer.data
        })
