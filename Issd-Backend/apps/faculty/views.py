"""
Faculty management API views.
All views are JWT-protected and use permission-based authorization.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import FacultyProfile, FacultyAvailability, FacultyModuleAssignment, FacultyBatchAssignment
from .serializers import (
    CreateFacultySerializer,
    FacultyListSerializer,
    FacultyDetailSerializer,
    UpdateFacultySerializer,
    FacultyStatusSerializer,
    CreateAvailabilitySerializer,
    AvailabilityListSerializer,
    UpdateAvailabilitySerializer,
    UpdateFacultyPhoneSerializer,
    FacultyModuleAssignmentCreateSerializer,
    FacultyModuleAssignmentListSerializer,
    FacultyModuleAssignmentUpdateSerializer,
    FacultyBatchAssignmentCreateSerializer,
    FacultyBatchAssignmentListSerializer,
    FacultyBatchAssignmentUpdateSerializer,
    CheckConflictSerializer,
    FacultySelfProfileSerializer,
    UpdateFacultySelfProfileSerializer
)
from common.permissions import permission_required
from apps.audit.services import AuditService


class FacultyListCreateAPIView(APIView):
    """
    GET /api/faculty/ - List all faculty profiles
    POST /api/faculty/ - Create a new faculty profile

    Permissions:
    - GET: faculty.view
    - POST: faculty.create
    """

    def get_permissions(self):
        """Return different permissions based on request method."""
        if self.request.method == 'POST':
            return [IsAuthenticated(), permission_required("faculty.create")()]
        return [IsAuthenticated(), permission_required("faculty.view")()]

    def get(self, request):
        """
        List all faculty profiles with optional filtering.
        Query parameters:
        - is_active: Filter by active status (e.g., ?is_active=true)
        """
        # Start with all faculty, optimize with select_related
        queryset = FacultyProfile.objects.select_related('user').all()

        # Filter by is_active if provided
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            # Convert string to boolean
            is_active_bool = is_active.lower() in ['true', '1', 'yes']
            queryset = queryset.filter(is_active=is_active_bool)

        # Serialize and return
        serializer = FacultyListSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        """
        Create a new faculty profile.
        Request body:
        {
            "email": "faculty@issd.edu",
            "full_name": "Dr. Smith",
            "phone": "9876543210",
            "employee_code": "FAC001",
            "designation": "Assistant Professor",
            "joining_date": "2025-01-10"
        }
        """
        serializer = CreateFacultySerializer(data=request.data)

        if serializer.is_valid():
            # Create faculty (includes user creation)
            faculty = serializer.save()

            # Log the creation
            AuditService.log(
                action='faculty.created',
                entity='Faculty',
                entity_id=faculty.id,
                performed_by=request.user,
                details={
                    'employee_code': faculty.employee_code,
                    'email': faculty.user.email,
                    'full_name': faculty.user.full_name,
                    'created_via': 'api'
                }
            )

            # Return created faculty
            response_serializer = FacultyDetailSerializer(faculty)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class FacultyDetailUpdateAPIView(APIView):
    """
    GET /api/faculty/{id}/ - Get faculty detail
    PATCH /api/faculty/{id}/ - Update faculty profile

    Permissions:
    - GET: faculty.view
    - PATCH: faculty.update
    """

    def get_permissions(self):
        """Return different permissions based on request method."""
        if self.request.method == 'PATCH':
            return [IsAuthenticated(), permission_required("faculty.update")()]
        return [IsAuthenticated(), permission_required("faculty.view")()]

    def get(self, request, faculty_id):
        """Get detailed information about a specific faculty member."""
        faculty = get_object_or_404(
            FacultyProfile.objects.select_related('user'),
            id=faculty_id
        )

        serializer = FacultyDetailSerializer(faculty)
        return Response(serializer.data)

    def patch(self, request, faculty_id):
        faculty = get_object_or_404(
            FacultyProfile.objects.select_related('user'),
            id=faculty_id
        )

        # Track what changed for audit log
        changes = {}

        # Handle phone update separately (it's on User model)
        phone = request.data.get('phone')
        if phone is not None:
            old_phone = faculty.user.phone
            phone_serializer = UpdateFacultyPhoneSerializer(
                faculty, data={'phone': phone}
            )
            if phone_serializer.is_valid():
                phone_serializer.save()
                if old_phone != phone:
                    changes['phone'] = {'old': old_phone, 'new': phone}
            else:
                return Response(
                    phone_serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Handle FacultyProfile updates
        profile_data = {
            k: v for k, v in request.data.items()
            if k in ['designation', 'joining_date']
        }

        if profile_data:
            # Track old values
            if 'designation' in profile_data:
                old_designation = faculty.designation
            if 'joining_date' in profile_data:
                old_joining_date = str(faculty.joining_date)

            serializer = UpdateFacultySerializer(
                faculty, data=profile_data, partial=True
            )

            if serializer.is_valid():
                serializer.save()

                # Track changes
                if 'designation' in profile_data and old_designation != profile_data['designation']:
                    changes['designation'] = {
                        'old': old_designation,
                        'new': profile_data['designation']
                    }
                if 'joining_date' in profile_data and old_joining_date != str(profile_data['joining_date']):
                    changes['joining_date'] = {
                        'old': old_joining_date,
                        'new': str(profile_data['joining_date'])
                    }
            else:
                return Response(
                    serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Log if anything changed
        if changes:
            AuditService.log(
                action='faculty.updated',
                entity='Faculty',
                entity_id=faculty.id,
                performed_by=request.user,
                details={
                    'employee_code': faculty.employee_code,
                    'changes': changes,
                    'updated_via': 'api'
                }
            )

        # Refresh from DB and return updated faculty
        faculty.refresh_from_db()
        faculty.user.refresh_from_db()
        response_serializer = FacultyDetailSerializer(faculty)
        return Response(response_serializer.data)


class UpdateFacultyStatusAPIView(APIView):
    """
    PATCH /api/faculty/{id}/status/

    Activate or deactivate a faculty member.
    Permission required: faculty.update

    Request body:
    {
        "is_active": false
    }
    """
    permission_classes = [IsAuthenticated,
                          permission_required("faculty.update")]

    def patch(self, request, faculty_id):
        faculty = get_object_or_404(FacultyProfile, id=faculty_id)

        # Store old status for audit log
        old_status = faculty.is_active

        # Validate and update
        serializer = FacultyStatusSerializer(
            faculty, data=request.data, partial=True
        )

        if serializer.is_valid():
            updated_faculty = serializer.save()

            # Log the status change (only if it actually changed)
            if old_status != updated_faculty.is_active:
                AuditService.log(
                    action='faculty.status_changed',
                    entity='Faculty',
                    entity_id=updated_faculty.id,
                    performed_by=request.user,
                    details={
                        'employee_code': updated_faculty.employee_code,
                        'old_status': 'active' if old_status else 'inactive',
                        'new_status': 'active' if updated_faculty.is_active else 'inactive',
                        'changed_via': 'api'
                    }
                )

            # Return updated faculty
            response_serializer = FacultyDetailSerializer(updated_faculty)
            return Response(response_serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class FacultyAvailabilityListCreateAPIView(APIView):
    """
    GET /api/faculty/{faculty_id}/availability/ - List availability slots
    POST /api/faculty/{faculty_id}/availability/ - Add availability slot

    Permissions:
    - GET: faculty.view
    - POST: faculty.manage_availability
    """

    def get_permissions(self):
        """Return different permissions based on request method."""
        if self.request.method == 'POST':
            return [IsAuthenticated(), permission_required("faculty.manage_availability")()]
        return [IsAuthenticated(), permission_required("faculty.view")()]

    def get(self, request, faculty_id):
        """List all availability slots for a faculty member. Returns only active slots."""
        faculty = get_object_or_404(FacultyProfile, id=faculty_id)

        # Get only active availability slots
        availabilities = FacultyAvailability.objects.filter(
            faculty=faculty,
            is_active=True
        ).order_by('day_of_week', 'start_time')

        serializer = AvailabilityListSerializer(availabilities, many=True)
        return Response(serializer.data)

    def post(self, request, faculty_id):
        """
        Add availability slot for a faculty member.
        Request body:
        {
            "day_of_week": 1,
            "start_time": "09:00",
            "end_time": "12:00"
        }
        """
        faculty = get_object_or_404(FacultyProfile, id=faculty_id)

        # Validate faculty is active
        if not faculty.is_active:
            return Response(
                {'error': 'Cannot add availability for inactive faculty.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for duplicate availability slot
        day_of_week = request.data.get('day_of_week')
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')

        if day_of_week and start_time and end_time:
            # Check for overlapping slots
            overlapping = FacultyAvailability.objects.filter(
                faculty=faculty,
                day_of_week=day_of_week,
                is_active=True
            ).filter(
                # Check if new slot overlaps with existing
                start_time__lt=end_time,
                end_time__gt=start_time
            ).exists()

            if overlapping:
                return Response(
                    {'error': 'This availability slot overlaps with an existing slot.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = CreateAvailabilitySerializer(data=request.data)

        if serializer.is_valid():
            # Create availability with faculty reference
            availability = serializer.save(faculty=faculty)

            # Log the creation
            AuditService.log(
                action='faculty.availability_added',
                entity='Faculty',
                entity_id=faculty.id,
                performed_by=request.user,
                details={
                    'employee_code': faculty.employee_code,
                    'availability_id': availability.id,
                    'day_of_week': availability.day_of_week,
                    'start_time': str(availability.start_time),
                    'end_time': str(availability.end_time),
                    'created_via': 'api'
                }
            )

            # Return created availability
            response_serializer = AvailabilityListSerializer(availability)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class AvailabilityUpdateDeleteAPIView(APIView):
    """
    PATCH /api/availability/{id}/ - Update an availability slot
    DELETE /api/availability/{id}/ - Soft delete an availability slot

    Permission required: faculty.manage_availability
    """
    permission_classes = [IsAuthenticated,
                          permission_required("faculty.manage_availability")]

    def patch(self, request, availability_id):
        """
        Update an availability slot.
        Allowed fields: start_time, end_time, is_active
        Request body:
        {
            "start_time": "10:00",
            "end_time": "13:00",
            "is_active": true
        }
        """
        availability = get_object_or_404(
            FacultyAvailability.objects.select_related('faculty'),
            id=availability_id
        )

        # Track changes for audit
        changes = {}
        if 'start_time' in request.data:
            changes['start_time'] = {
                'old': str(availability.start_time),
                'new': str(request.data['start_time'])
            }
        if 'end_time' in request.data:
            changes['end_time'] = {
                'old': str(availability.end_time),
                'new': str(request.data['end_time'])
            }
        if 'is_active' in request.data:
            changes['is_active'] = {
                'old': availability.is_active,
                'new': request.data['is_active']
            }

        serializer = UpdateAvailabilitySerializer(
            availability, data=request.data, partial=True
        )

        if serializer.is_valid():
            updated_availability = serializer.save()

            # Log the update
            if changes:
                AuditService.log(
                    action='faculty.availability_updated',
                    entity='Faculty',
                    entity_id=availability.faculty.id,
                    performed_by=request.user,
                    details={
                        'employee_code': availability.faculty.employee_code,
                        'availability_id': availability.id,
                        'changes': changes,
                        'updated_via': 'api'
                    }
                )

            # Return updated availability
            response_serializer = AvailabilityListSerializer(
                updated_availability)
            return Response(response_serializer.data)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, availability_id):
        """Soft delete an availability slot (set is_active = False)."""
        availability = get_object_or_404(
            FacultyAvailability.objects.select_related('faculty'),
            id=availability_id
        )

        # Soft delete
        availability.is_active = False
        availability.save()

        # Log the deletion
        AuditService.log(
            action='faculty.availability_removed',
            entity='Faculty',
            entity_id=availability.faculty.id,
            performed_by=request.user,
            details={
                'employee_code': availability.faculty.employee_code,
                'availability_id': availability.id,
                'day_of_week': availability.day_of_week,
                'deleted_via': 'api'
            }
        )

        return Response(
            {'message': 'Availability slot removed successfully.'},
            status=status.HTTP_200_OK
        )


# ==================== FACULTY SUBJECT ASSIGNMENT VIEWS ====================

class FacultyModuleAssignmentListCreateAPIView(APIView):
    """
    GET /api/faculty/module-assignments/ - List all module assignments
    POST /api/faculty/module-assignments/ - Create new module assignment

    Permissions:
    - GET: faculty.view (or authenticated if faculty=me)
    - POST: faculty.assign
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), permission_required("faculty.assign")()]
        # GET: If faculty=me, only require authentication
        # Otherwise, require faculty.view permission
        if self.request.query_params.get('faculty') == 'me':
            return [IsAuthenticated()]
        return [IsAuthenticated(), permission_required("faculty.view")()]

    def get(self, request):
        """List module assignments with optional filters."""
        assignments = FacultyModuleAssignment.objects.select_related(
            'faculty__user', 'module'
        ).prefetch_related('module__course_modules__course').all()

        # Apply filters
        faculty_id = request.query_params.get('faculty_id')
        faculty_param = request.query_params.get('faculty')

        # Handle faculty=me parameter
        if faculty_param == 'me':
            try:
                faculty = request.user.faculty_profile
                assignments = assignments.filter(faculty=faculty)
            except FacultyProfile.DoesNotExist:
                return Response(
                    {"error": "User is not a faculty member."},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif faculty_id:
            assignments = assignments.filter(faculty_id=faculty_id)

        module_id = request.query_params.get('module_id')
        if module_id:
            assignments = assignments.filter(module_id=module_id)

        is_active = request.query_params.get('is_active')
        if is_active is not None:
            assignments = assignments.filter(
                is_active=is_active.lower() == 'true')

        serializer = FacultyModuleAssignmentListSerializer(
            assignments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """Create a new faculty module assignment."""
        serializer = FacultyModuleAssignmentCreateSerializer(
            data=request.data)
        if serializer.is_valid():
            assignment = serializer.save()
            assignment.assigned_by = request.user
            assignment.save()

            # Audit log (use module.code; fall back to legacy subject.code)
            _module = getattr(assignment, 'module', None)
            _legacy_subject = getattr(assignment, 'subject', None)
            module_code = _module.code if _module else (
                _legacy_subject.code if _legacy_subject else None)

            AuditService.log(
                action='faculty.module_assigned',
                entity='FacultyModuleAssignment',
                entity_id=assignment.id,
                performed_by=request.user,
                details={
                    'faculty_employee_code': assignment.faculty.employee_code,
                    'module_code': module_code,
                    'assigned_via': 'api'
                }
            )

            response_serializer = FacultyModuleAssignmentListSerializer(
                assignment)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FacultyModuleAssignmentDetailAPIView(APIView):
    """
    GET /api/faculty/module-assignments/{id}/ - Get assignment details
    PUT /api/faculty/module-assignments/{id}/ - Update assignment
    PATCH /api/faculty/module-assignments/{id}/ - Partial update assignment
    DELETE /api/faculty/module-assignments/{id}/ - Delete assignment

    Permissions:
    - GET: faculty.view
    - PUT/PATCH: faculty.assign
    - DELETE: faculty.assign
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), permission_required("faculty.view")()]
        return [IsAuthenticated(), permission_required("faculty.assign")()]

    def get(self, request, assignment_id):
        """Get assignment details."""
        assignment = get_object_or_404(
            FacultyModuleAssignment.objects.select_related(
                'faculty__user', 'module'
            ).prefetch_related(
                'module__course_modules__course'
            ),
            id=assignment_id
        )
        serializer = FacultyModuleAssignmentListSerializer(assignment)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, assignment_id):
        """Update assignment."""
        return self._update(request, assignment_id, partial=False)

    def patch(self, request, assignment_id):
        """Partial update assignment."""
        return self._update(request, assignment_id, partial=True)

    def _update(self, request, assignment_id, partial):
        """Update assignment (subject or status)."""
        assignment = get_object_or_404(
            FacultyModuleAssignment, id=assignment_id)
        serializer = FacultyModuleAssignmentUpdateSerializer(
            assignment, data=request.data, partial=partial
        )

        if serializer.is_valid():
            updated_assignment = serializer.save()

            # Audit log (module assignment updated)
            _module = getattr(updated_assignment, 'module', None)
            _legacy_subject = getattr(updated_assignment, 'subject', None)
            module_code = _module.code if _module else (
                _legacy_subject.code if _legacy_subject else None)

            AuditService.log(
                action='faculty.module_assignment_updated',
                entity='FacultyModuleAssignment',
                entity_id=updated_assignment.id,
                performed_by=request.user,
                details={
                    'faculty_employee_code': updated_assignment.faculty.employee_code,
                    'module_code': module_code,
                    'changes': request.data,
                    'updated_via': 'api'
                }
            )

            response_serializer = FacultyModuleAssignmentListSerializer(
                updated_assignment)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, assignment_id):
        """Delete assignment."""
        assignment = get_object_or_404(
            FacultyModuleAssignment, id=assignment_id)

        # Audit log before deletion (use module.code; fall back to legacy subject.code)
        _module = getattr(assignment, 'module', None)
        _legacy_subject = getattr(assignment, 'subject', None)
        module_code = _module.code if _module else (
            _legacy_subject.code if _legacy_subject else None)

        AuditService.log(
            action='faculty.module_assignment_deleted',
            entity='FacultyModuleAssignment',
            entity_id=assignment.id,
            performed_by=request.user,
            details={
                'faculty_employee_code': assignment.faculty.employee_code,
                'module_code': module_code,
                'deleted_via': 'api'
            }
        )

        assignment.delete()
        return Response(
            {"message": "Faculty module assignment deleted successfully."},
            status=status.HTTP_200_OK
        )


# ==================== FACULTY BATCH ASSIGNMENT VIEWS ====================

class FacultyBatchAssignmentListCreateAPIView(APIView):
    """
    GET /api/faculty/batch-assignments/ - List all batch assignments
    POST /api/faculty/batch-assignments/ - Create new batch assignment

    Permissions:
    - GET: faculty.view (or authenticated if faculty=me)
    - POST: faculty.assign
    """

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), permission_required("faculty.assign")()]
        # GET: If faculty=me, only require authentication
        # Otherwise, require faculty.view permission
        if self.request.query_params.get('faculty') == 'me':
            return [IsAuthenticated()]
        return [IsAuthenticated(), permission_required("faculty.view")()]

    def get(self, request):
        """List batch assignments with optional filters."""
        assignments = FacultyBatchAssignment.objects.select_related(
            'faculty__user', 'batch', 'batch__template', 'batch__template__course'
        ).all()

        # Apply filters
        faculty_id = request.query_params.get('faculty_id')
        faculty_param = request.query_params.get('faculty')

        # Handle faculty=me parameter
        if faculty_param == 'me':
            try:
                faculty = request.user.faculty_profile
                assignments = assignments.filter(faculty=faculty)
            except FacultyProfile.DoesNotExist:
                return Response(
                    {"error": "User is not a faculty member."},
                    status=status.HTTP_403_FORBIDDEN
                )
        elif faculty_id:
            assignments = assignments.filter(faculty_id=faculty_id)

        batch_id = request.query_params.get('batch_id')
        if batch_id:
            assignments = assignments.filter(batch_id=batch_id)

        is_active = request.query_params.get('is_active')
        if is_active is not None:
            assignments = assignments.filter(
                is_active=is_active.lower() == 'true')

        serializer = FacultyBatchAssignmentListSerializer(
            assignments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """Create a new faculty batch assignment."""
        serializer = FacultyBatchAssignmentCreateSerializer(data=request.data)
        if serializer.is_valid():
            assignment = serializer.save()
            assignment.assigned_by = request.user
            assignment.save()

            # Audit log
            AuditService.log(
                action='faculty.batch_assigned',
                entity='FacultyBatchAssignment',
                entity_id=assignment.id,
                performed_by=request.user,
                details={
                    'faculty_employee_code': assignment.faculty.employee_code,
                    'batch_code': assignment.batch.code,
                    'assigned_via': 'api'
                }
            )

            response_serializer = FacultyBatchAssignmentListSerializer(
                assignment)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FacultyBatchAssignmentDetailAPIView(APIView):
    """
    GET /api/faculty/batch-assignments/{id}/ - Get assignment details
    PUT /api/faculty/batch-assignments/{id}/ - Update assignment
    PATCH /api/faculty/batch-assignments/{id}/ - Partial update assignment
    DELETE /api/faculty/batch-assignments/{id}/ - Delete assignment

    Permissions:
    - GET: faculty.view
    - PUT/PATCH: faculty.assign
    - DELETE: faculty.assign
    """

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), permission_required("faculty.view")()]
        return [IsAuthenticated(), permission_required("faculty.assign")()]

    def get(self, request, assignment_id):
        """Get assignment details."""
        assignment = get_object_or_404(
            FacultyBatchAssignment.objects.select_related(
                'faculty__user',
                'batch',
                'batch__template',
                'batch__template__course',
                'batch__centre',
            ),
            id=assignment_id
        )
        serializer = FacultyBatchAssignmentListSerializer(assignment)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, assignment_id):
        """Update assignment."""
        return self._update(request, assignment_id, partial=False)

    def patch(self, request, assignment_id):
        """Partial update assignment."""
        return self._update(request, assignment_id, partial=True)

    def _update(self, request, assignment_id, partial):
        """Update assignment (batch or status)."""
        assignment = get_object_or_404(
            FacultyBatchAssignment, id=assignment_id)
        serializer = FacultyBatchAssignmentUpdateSerializer(
            assignment, data=request.data, partial=partial
        )

        if serializer.is_valid():
            updated_assignment = serializer.save()

            # Audit log
            AuditService.log(
                action='faculty.batch_assignment_updated',
                entity='FacultyBatchAssignment',
                entity_id=updated_assignment.id,
                performed_by=request.user,
                details={
                    'faculty_employee_code': updated_assignment.faculty.employee_code,
                    'changes': request.data,
                    'updated_via': 'api'
                }
            )

            response_serializer = FacultyBatchAssignmentListSerializer(
                updated_assignment)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, assignment_id):
        """Delete assignment."""
        assignment = get_object_or_404(
            FacultyBatchAssignment, id=assignment_id)

        # Audit log before deletion
        AuditService.log(
            action='faculty.batch_assignment_deleted',
            entity='FacultyBatchAssignment',
            entity_id=assignment.id,
            performed_by=request.user,
            details={
                'faculty_employee_code': assignment.faculty.employee_code,
                'batch_code': assignment.batch.code,
                'deleted_via': 'api'
            }
        )

        assignment.delete()
        return Response(
            {"message": "Faculty batch assignment deleted successfully."},
            status=status.HTTP_200_OK
        )


# ==================== FACULTY ASSIGNMENT SUMMARY VIEW ====================

class FacultyAssignmentSummaryAPIView(APIView):
    """
    GET /api/faculty/{faculty_id}/assignment-summary/ - Get faculty assignment summary

    Returns all modules and batches assigned to a faculty member.

    Permission: faculty.view
    """
    permission_classes = [IsAuthenticated, permission_required("faculty.view")]

    def get(self, request, faculty_id):
        """Get summary of all assignments for a faculty member."""
        faculty = get_object_or_404(
            FacultyProfile.objects.select_related('user'),
            id=faculty_id
        )

        # Get all module assignments
        module_assignments = FacultyModuleAssignment.objects.filter(
            faculty=faculty
        ).select_related('module')

        modules = [
            {
                'id': assignment.module.id,
                'code': assignment.module.code,
                'name': assignment.module.name
            }
            for assignment in module_assignments
        ]

        # Get all batch assignments
        batch_assignments = FacultyBatchAssignment.objects.filter(
            faculty=faculty
        ).select_related('batch')

        batches = [
            {
                'id': assignment.batch.id,
                'code': assignment.batch.code,
                'status': assignment.batch.status,
                'start_date': assignment.batch.start_date
            }
            for assignment in batch_assignments
        ]

        # Build response
        response_data = {
            'faculty': {
                'id': faculty.id,
                'employee_code': faculty.employee_code,
                'full_name': faculty.user.full_name,
                'email': faculty.user.email
            },
            'modules': modules,
            'batches': batches
        }

        return Response(response_data, status=status.HTTP_200_OK)


# ==================== TIMETABLE CONFLICT CHECK VIEW ====================

class CheckConflictAPIView(APIView):
    """
    POST /api/faculty/{faculty_id}/check-conflict/ - Check timetable conflict

    Validates whether a proposed time slot conflicts with faculty availability.

    This is a PRE-TIMETABLE validation API. It does NOT create or store
    timetable data. It only checks if the requested time slot is valid
    for the given faculty member based on their availability.

    Permission: faculty.view
    """
    permission_classes = [IsAuthenticated, permission_required("faculty.view")]

    def post(self, request, faculty_id):
        """
        Check if proposed time slot conflicts with faculty availability.

        Request body:
        {
            "day_of_week": 1,  # 1=Monday, 7=Sunday
            "start_time": "10:00",
            "end_time": "12:00"
        }

        Returns:
        {
            "conflict": false,
            "message": "No timetable conflict detected."
        }
        OR
        {
            "conflict": true,
            "reason": "Faculty is not available during the requested time slot."
        }
        """
        # Validate faculty exists and is active
        faculty = get_object_or_404(
            FacultyProfile.objects.prefetch_related('availabilities'),
            id=faculty_id
        )

        if not faculty.is_active:
            return Response(
                {
                    "conflict": True,
                    "reason": "Faculty is not active."
                },
                status=status.HTTP_200_OK
            )

        # Validate request data
        serializer = CheckConflictSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        day_of_week = validated_data['day_of_week']
        requested_start = validated_data['start_time']
        requested_end = validated_data['end_time']

        # Get active availability slots for the requested day
        availability_slots = FacultyAvailability.objects.filter(
            faculty=faculty,
            day_of_week=day_of_week,
            is_active=True
        )

        # Check if faculty has any availability on this day
        if not availability_slots.exists():
            return Response(
                {
                    "conflict": True,
                    "reason": f"Faculty has no availability on this day."
                },
                status=status.HTTP_200_OK
            )

        # Check if requested time falls FULLY within any availability slot
        for slot in availability_slots:
            # Requested time must be fully inside the availability slot
            if slot.start_time <= requested_start and requested_end <= slot.end_time:
                # No conflict found - time is within availability
                return Response(
                    {
                        "conflict": False,
                        "message": "No timetable conflict detected."
                    },
                    status=status.HTTP_200_OK
                )

        # No matching availability slot found
        return Response(
            {
                "conflict": True,
                "reason": "Faculty is not available during the requested time slot."
            },
            status=status.HTTP_200_OK
        )


# ==================== FACULTY SELF-PROFILE API ====================

class FacultySelfProfileAPIView(APIView):
    """
    GET /api/faculty/me/ - Get logged-in faculty's profile
    PATCH /api/faculty/me/ - Update logged-in faculty's profile

    Permission: IsAuthenticated (faculty role)
    Faculty can only access and update their own profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get logged-in faculty's profile.
        """
        # Ensure user is faculty
        try:
            faculty = FacultyProfile.objects.select_related(
                'user', 'user__role', 'user__centre'
            ).get(user=request.user)
        except FacultyProfile.DoesNotExist:
            return Response(
                {"error": "User is not a faculty member."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = FacultySelfProfileSerializer(faculty)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        """
        Update logged-in faculty's profile.
        Only phone and designation can be updated.
        """
        # Ensure user is faculty
        try:
            faculty = FacultyProfile.objects.select_related(
                'user', 'user__role', 'user__centre'
            ).get(user=request.user)
        except FacultyProfile.DoesNotExist:
            return Response(
                {"error": "User is not a faculty member."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = UpdateFacultySelfProfileSerializer(
            faculty, data=request.data, partial=True
        )

        if serializer.is_valid():
            serializer.save()

            # Log the update
            AuditService.log(
                action='faculty.profile_updated',
                entity='FacultyProfile',
                entity_id=faculty.id,
                performed_by=request.user,
                details={
                    'employee_code': faculty.employee_code,
                    'updated_fields': list(request.data.keys()),
                    'updated_via': 'self_service'
                }
            )

            # Return updated profile
            response_serializer = FacultySelfProfileSerializer(faculty)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
