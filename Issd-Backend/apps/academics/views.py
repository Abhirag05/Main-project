"""
API views for Academic Master Data (PHASE 1A).
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q

from apps.academics.models import Course, Module, CourseModule
from apps.academics.serializers import (
    CourseCreateSerializer,
    CourseListSerializer,
    ModuleCreateSerializer,
    ModuleListSerializer,
    CourseModuleCreateSerializer,
    CourseModuleListSerializer,
)
from apps.audit.services import AuditService
from common.permissions import permission_required


class CourseListCreateAPIView(APIView):
    """
    API endpoint for creating and listing courses.

    POST /api/academics/courses/ - Create new course (requires academic.create)
    GET /api/academics/courses/ - List all courses (requires academic.view)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Create a new course.

        Request body:
        {
            "code": "BCA",
            "name": "Bachelor of Computer Applications",
            "description": "3-year undergraduate program",
            "is_active": true
        }
        """
        # Check permission
        if not request.user.has_permission("academic.create"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to create courses'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CourseCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    'status': 'error',
                    'message': 'Validation failed',
                    'errors': serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        course = serializer.save()

        # Audit logging
        AuditService.log(
            action='course.created',
            entity='Course',
            entity_id=course.id,
            performed_by=request.user,
            details={
                'course_code': course.code,
                'course_name': course.name,
                'skills': course.skills if course.skills else [],
            }
        )

        return Response(
            {
                'status': 'success',
                'message': 'Course created successfully',
                'data': CourseListSerializer(course).data
            },
            status=status.HTTP_201_CREATED
        )

    def get(self, request):
        """
        List all courses.

        Query parameters:
        - is_active: Filter by active status (true/false)
        - search: Search in code or name
        """
        # Check permission
        if not request.user.has_permission("academic.view"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to view courses'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        queryset = Course.objects.all()

        # Filter by active status
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)

        # Search filter
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search) | Q(name__icontains=search)
            )

        queryset = queryset.order_by('code')
        serializer = CourseListSerializer(queryset, many=True)

        return Response(
            {
                'status': 'success',
                'count': queryset.count(),
                'data': serializer.data
            },
            status=status.HTTP_200_OK
        )


class CourseDetailAPIView(APIView):
    """
    API endpoint for retrieving, updating, and managing individual courses.

    PATCH /api/academics/courses/{pk}/ - Update course (requires academic.edit)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        """
        Update an existing course.

        Request body (all fields optional):
        {
            "code": "BCA",
            "name": "Bachelor of Computer Applications",
            "description": "Updated description",
            "duration_months": 36,
            "is_active": true
        }
        """
        # Check permission
        if not request.user.has_permission("academic.edit"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to update courses'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response(
                {
                    'status': 'error',
                    'message': f'Course with ID {pk} not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = CourseCreateSerializer(
            course, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {
                    'status': 'error',
                    'message': 'Validation failed',
                    'errors': serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        updated_course = serializer.save()

        # Audit logging
        AuditService.log(
            action='course.updated',
            entity='Course',
            entity_id=updated_course.id,
            performed_by=request.user,
            details={
                'course_code': updated_course.code,
                'course_name': updated_course.name,
                'skills': updated_course.skills if updated_course.skills else [],
                'changes': request.data
            }
        )

        return Response(
            {
                'status': 'success',
                'message': 'Course updated successfully',
                'data': CourseListSerializer(updated_course).data
            },
            status=status.HTTP_200_OK
        )


class CourseStatusAPIView(APIView):
    """
    API endpoint for updating course active status.

    PATCH /api/academics/courses/{pk}/status/ - Toggle course status (requires academic.edit)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        """
        Update course active status.

        Request body:
        {
            "is_active": false
        }
        """
        # Check permission
        if not request.user.has_permission("academic.edit"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to update course status'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response(
                {
                    'status': 'error',
                    'message': f'Course with ID {pk} not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        is_active = request.data.get('is_active')
        if is_active is None:
            return Response(
                {
                    'status': 'error',
                    'message': 'is_active field is required'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        course.is_active = is_active
        course.save()

        # Audit logging
        AuditService.log(
            action='course.status_changed',
            entity='Course',
            entity_id=course.id,
            performed_by=request.user,
            details={
                'course_code': course.code,
                'course_name': course.name,
                'is_active': is_active
            }
        )

        return Response(
            {
                'status': 'success',
                'message': f'Course {"activated" if is_active else "deactivated"} successfully',
                'data': CourseListSerializer(course).data
            },
            status=status.HTTP_200_OK
        )


class CourseDeleteAPIView(APIView):
    """
    API endpoint for deleting a course.

    DELETE /api/academics/courses/{pk}/ - Delete course (requires academic.delete)
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        """
        Delete a course.

        Note: This performs a hard delete. Consider using status API for soft delete.
        """
        # Check permission
        if not request.user.has_permission("academic.delete"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to delete courses'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            course = Course.objects.get(id=pk)
        except Course.DoesNotExist:
            return Response(
                {
                    'status': 'error',
                    'message': f'Course with ID {pk} not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Store course details for audit log before deletion
        course_code = course.code
        course_name = course.name

        # Delete the course
        course.delete()

        # Audit logging
        AuditService.log(
            action='course.deleted',
            entity='Course',
            entity_id=pk,
            performed_by=request.user,
            details={
                'course_code': course_code,
                'course_name': course_name
            }
        )

        return Response(
            {
                'status': 'success',
                'message': 'Course deleted successfully'
            },
            status=status.HTTP_200_OK
        )


class ModuleListCreateAPIView(APIView):
    """
    API endpoint for creating and listing modules.

    POST /api/academics/modules/ - Create new subject (requires academic.create)
    GET /api/academics/modules/ - List all modules (requires academic.view)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Create a new subject.

        Request body:
        {
            "code": "CS101",
            "name": "Introduction to Programming",
            "description": "Basic programming concepts",
            "is_active": true
        }
        """
        # Check permission
        if not request.user.has_permission("academic.create"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to create modules'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ModuleCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    'status': 'error',
                    'message': 'Validation failed',
                    'errors': serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        module = serializer.save()

        # Audit logging
        AuditService.log(
            action='subject.created',
            entity='Module',
            entity_id=module.id,
            performed_by=request.user,
            details={
                'module_code': module.code,
                'module_name': module.name,
            }
        )

        return Response(
            {
                'status': 'success',
                'message': 'Module created successfully',
                'data': ModuleListSerializer(module).data
            },
            status=status.HTTP_201_CREATED
        )

    def get(self, request):
        """
        List all modules.

        Query parameters:
        - is_active: Filter by active status (true/false)
        - search: Search in code or name
        """
        # Check permission
        if not request.user.has_permission("academic.view"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to view modules'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        queryset = Module.objects.all()

        # Filter by active status
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)

        # Search filter
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(code__icontains=search) | Q(name__icontains=search)
            )

        queryset = queryset.order_by('name')
        serializer = ModuleListSerializer(queryset, many=True)

        return Response(
            {
                'status': 'success',
                'count': queryset.count(),
                'data': serializer.data
            },
            status=status.HTTP_200_OK
        )


class ModuleDetailAPIView(APIView):
    """
    API endpoint for retrieving, updating, and managing individual modules.

    PATCH /api/academics/modules/{pk}/ - Update subject (requires academic.edit)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        """
        Update an existing subject.

        Request body (all fields optional):
        {
            "code": "CS101",
            "name": "Introduction to Programming",
            "description": "Updated description",
            "is_active": true
        }
        """
        # Check permission
        if not request.user.has_permission("academic.edit"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to update modules'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            module = Module.objects.get(id=pk)
        except Module.DoesNotExist:
            return Response(
                {
                    'status': 'error',
                    'message': f'Module with ID {pk} not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ModuleCreateSerializer(
            module, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {
                    'status': 'error',
                    'message': 'Validation failed',
                    'errors': serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        updated_module = serializer.save()

        # Audit logging
        AuditService.log(
            action='subject.updated',
            entity='Module',
            entity_id=updated_module.id,
            performed_by=request.user,
            details={
                'module_code': updated_module.code,
                'module_name': updated_module.name,
                'changes': request.data
            }
        )

        return Response(
            {
                'status': 'success',
                'message': 'Module updated successfully',
                'data': ModuleListSerializer(updated_module).data
            },
            status=status.HTTP_200_OK
        )


class ModuleStatusAPIView(APIView):
    """
    API endpoint for updating subject active status.

    PATCH /api/academics/modules/{pk}/status/ - Toggle subject status (requires academic.edit)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        """
        Update subject active status.

        Request body:
        {
            "is_active": false
        }
        """
        # Check permission
        if not request.user.has_permission("academic.edit"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to update subject status'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            module = Module.objects.get(id=pk)
        except Module.DoesNotExist:
            return Response(
                {
                    'status': 'error',
                    'message': f'Module with ID {pk} not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        is_active = request.data.get('is_active')
        if is_active is None:
            return Response(
                {
                    'status': 'error',
                    'message': 'is_active field is required'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        module.is_active = is_active
        module.save()

        # Audit logging
        AuditService.log(
            action='subject.status_changed',
            entity='Module',
            entity_id=module.id,
            performed_by=request.user,
            details={
                'module_code': module.code,
                'module_name': module.name,
                'is_active': is_active
            }
        )

        return Response(
            {
                'status': 'success',
                'message': f'Module {"activated" if is_active else "deactivated"} successfully',
                'data': ModuleListSerializer(module).data
            },
            status=status.HTTP_200_OK
        )


class ModuleDeleteAPIView(APIView):
    """
    API endpoint for deleting a subject.

    DELETE /api/academics/modules/{pk}/ - Delete subject (requires academic.delete)
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        """
        Delete a subject.

        Note: This performs a hard delete. Consider using status API for soft delete.
        """
        # Check permission
        if not request.user.has_permission("academic.delete"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to delete modules'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            module = Module.objects.get(id=pk)
        except Module.DoesNotExist:
            return Response(
                {
                    'status': 'error',
                    'message': f'Module with ID {pk} not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Store module details for audit log before deletion
        module_code = module.code
        module_name = module.name

        # Delete the module
        module.delete()

        # Audit logging
        AuditService.log(
            action='subject.deleted',
            entity='Module',
            entity_id=pk,
            performed_by=request.user,
            details={
                'module_code': module_code,
                'module_name': module_name
            }
        )

        return Response(
            {
                'status': 'success',
                'message': 'Module deleted successfully'
            },
            status=status.HTTP_200_OK
        )


class CourseModuleCreateAPIView(APIView):
    """
    API endpoint for assigning modules to courses.

    POST /api/academics/course-modules/ - Assign subject to course (requires academic.create)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Assign a subject to a course.

        Request body:
        {
            "course": 1,
            "subject": 5,
            "sequence_order": 1,
            "is_active": true
        }
        """
        # Check permission
        if not request.user.has_permission("academic.create"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to assign modules to courses'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = CourseModuleCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    'status': 'error',
                    'message': 'Validation failed',
                    'errors': serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        course_module = serializer.save()

        # Audit logging
        AuditService.log(
            action='course_subject.assigned',
            entity='CourseModule',
            entity_id=course_module.id,
            performed_by=request.user,
            details={
                'course_code': course_module.course.code,
                'module_code': course_module.module.code,
                'sequence_order': course_module.sequence_order,
            }
        )

        return Response(
            {
                'status': 'success',
                'message': 'Module assigned to course successfully',
                'data': CourseModuleListSerializer(course_module).data
            },
            status=status.HTTP_201_CREATED
        )


class CourseModulesAPIView(APIView):
    """
    API endpoint for retrieving modules for a specific course.

    GET /api/academics/courses/{course_id}/modules/ - Get all modules for a course (requires academic.view)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        """
        Retrieve all modules assigned to a specific course.

        Query parameters:
        - is_active: Filter by active status (true/false)
        """
        # Check permission
        if not request.user.has_permission("academic.view"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to view course modules'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {
                    'status': 'error',
                    'message': f'Course with ID {course_id} not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        queryset = CourseModule.objects.filter(
            course=course).select_related('module', 'course')

        # Filter by active status
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)

        queryset = queryset.order_by('sequence_order')
        serializer = CourseModuleListSerializer(queryset, many=True)

        return Response(
            {
                'status': 'success',
                'course': {
                    'id': course.id,
                    'code': course.code,
                    'name': course.name,
                },
                'count': queryset.count(),
                'modules': serializer.data
            },
            status=status.HTTP_200_OK
        )


class CourseModuleDetailAPIView(APIView):
    """
    API endpoint for updating individual course-module assignments.

    PATCH /api/academics/course-modules/{pk}/ - Update sequence or is_active (requires academic.edit)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        """
        Update a course-module assignment.

        Request body (all fields optional):
        {
            "sequence_order": 2,
            "is_active": true
        }
        """
        # Check permission - academic.edit permission for course builder operations
        if not request.user.has_permission("academic.edit"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to update course modules'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            course_module = CourseModule.objects.select_related(
                'course', 'module').get(id=pk)
        except CourseModule.DoesNotExist:
            return Response(
                {
                    'status': 'error',
                    'message': f'CourseModule with ID {pk} not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Only allow updating sequence_order and is_active
        allowed_fields = {'sequence_order', 'is_active'}
        update_data = {k: v for k, v in request.data.items()
                       if k in allowed_fields}

        if not update_data:
            return Response(
                {
                    'status': 'error',
                    'message': 'No valid fields to update. Allowed: sequence_order, is_active'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate sequence_order if provided
        if 'sequence_order' in update_data:
            try:
                seq = int(update_data['sequence_order'])
                if seq < 1:
                    return Response(
                        {
                            'status': 'error',
                            'message': 'Sequence order must be at least 1'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                update_data['sequence_order'] = seq
            except (ValueError, TypeError):
                return Response(
                    {
                        'status': 'error',
                        'message': 'Sequence order must be a positive integer'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Store old values for audit
        old_sequence = course_module.sequence_order
        old_is_active = course_module.is_active

        # Apply updates
        for field, value in update_data.items():
            setattr(course_module, field, value)
        course_module.save()

        # Audit logging
        AuditService.log(
            action='course.subject_updated',
            entity='CourseModule',
            entity_id=course_module.id,
            performed_by=request.user,
            details={
                'course_code': course_module.course.code,
                'module_code': course_module.module.code,
                'old_sequence_order': old_sequence,
                'new_sequence_order': course_module.sequence_order,
                'old_is_active': old_is_active,
                'new_is_active': course_module.is_active,
            }
        )

        return Response(
            {
                'status': 'success',
                'message': 'Course subject updated successfully',
                'data': CourseModuleListSerializer(course_module).data
            },
            status=status.HTTP_200_OK
        )

    def delete(self, request, pk):
        """
        Delete a course-module assignment (hard delete).

        DELETE /api/academics/course-modules/{pk}/ - Delete assignment (requires academic.delete)
        """
        # Check permission
        if not request.user.has_permission("academic.delete"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to delete course modules'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            course_module = CourseModule.objects.select_related(
                'course', 'module').get(id=pk)
        except CourseModule.DoesNotExist:
            return Response(
                {
                    'status': 'error',
                    'message': f'CourseModule with ID {pk} not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Audit before delete
        AuditService.log(
            action='course.subject_deleted',
            entity='CourseModule',
            entity_id=course_module.id,
            performed_by=request.user,
            details={
                'course_code': course_module.course.code,
                'module_code': course_module.module.code,
                'sequence_order': course_module.sequence_order,
            }
        )

        course_module.delete()

        return Response(
            {
                'status': 'success',
                'message': 'Module removed from course successfully'
            },
            status=status.HTTP_204_NO_CONTENT
        )


class CourseModuleStatusAPIView(APIView):
    """
    API endpoint for soft deactivating/reactivating course-module assignments.

    PATCH /api/academics/course-modules/{pk}/status/ - Toggle status (requires academic.edit)
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        """
        Toggle or set active status of a course-module assignment.

        Request body:
        {
            "is_active": false
        }
        """
        # Check permission - academic.edit permission for course builder operations
        if not request.user.has_permission("academic.edit"):
            return Response(
                {
                    'status': 'error',
                    'message': 'You do not have permission to modify course subject status'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            course_module = CourseModule.objects.select_related(
                'course', 'module').get(id=pk)
        except CourseModule.DoesNotExist:
            return Response(
                {
                    'status': 'error',
                    'message': f'CourseModule with ID {pk} not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        is_active = request.data.get('is_active')
        if is_active is None:
            return Response(
                {
                    'status': 'error',
                    'message': 'is_active field is required'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Store old value for audit
        old_is_active = course_module.is_active

        # Update status
        course_module.is_active = is_active
        course_module.save()

        # Determine action for audit
        action = 'course.subject_removed' if not is_active else 'course.subject_reactivated'

        # Audit logging
        AuditService.log(
            action=action,
            entity='CourseModule',
            entity_id=course_module.id,
            performed_by=request.user,
            details={
                'course_code': course_module.course.code,
                'module_code': course_module.module.code,
                'old_is_active': old_is_active,
                'new_is_active': course_module.is_active,
            }
        )

        status_msg = 'activated' if is_active else 'deactivated'
        return Response(
            {
                'status': 'success',
                'message': f'Module {status_msg} for course successfully',
                'data': CourseModuleListSerializer(course_module).data
            },
            status=status.HTTP_200_OK
        )


class PublicCoursesListAPIView(APIView):
    """
    Public API endpoint for listing active courses.

    GET /api/public/courses/ - List all active courses (no authentication required)

    This endpoint is used for registration forms and other public-facing features
    where users need to see available courses without being authenticated.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """
        List all active courses.

        Response:
        {
            "status": "success",
            "count": 3,
            "data": [
                {
                    "id": 1,
                    "code": "FSWD",
                    "name": "Full Stack Web Development",
                    "description": "...",
                    "duration_months": 6,
                    "skills": ["React", "Node.js", "MongoDB"],
                    "is_active": true
                }
            ]
        }
        """
        # Only return active courses
        queryset = Course.objects.filter(is_active=True).order_by('code')
        serializer = CourseListSerializer(queryset, many=True)

        return Response(
            {
                'status': 'success',
                'count': queryset.count(),
                'data': serializer.data
            },
            status=status.HTTP_200_OK
        )
