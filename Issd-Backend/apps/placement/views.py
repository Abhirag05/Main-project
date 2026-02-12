"""
Placement views.

ViewSets for managing placement lists and adding/removing students.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404

from apps.placement.models import PlacementList, PlacementListStudent, StudentPlacementLink
from apps.placement.serializers import (
    PlacementListSerializer,
    PlacementListDetailSerializer,
    PlacementListStudentSerializer,
    AddStudentToListSerializer,
    RemoveStudentFromListSerializer,
    StudentPlacementLinkSerializer,
)
from apps.students.models import StudentProfile


class PlacementListViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing placement lists.

    Endpoints:
    - GET /api/placement/lists/ - List all placement lists
    - POST /api/placement/lists/ - Create a new placement list
    - GET /api/placement/lists/{id}/ - Get a specific placement list with all students
    - PUT/PATCH /api/placement/lists/{id}/ - Update a placement list
    - DELETE /api/placement/lists/{id}/ - Delete a placement list
    - POST /api/placement/lists/{id}/add_student/ - Add a student to the list
    - POST /api/placement/lists/{id}/remove_student/ - Remove a student from the list
    """
    queryset = PlacementList.objects.filter(is_active=True)
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """
        Use detailed serializer for retrieve action, basic for list.
        """
        if self.action == 'retrieve':
            return PlacementListDetailSerializer
        return PlacementListSerializer

    def get_queryset(self):
        """
        Filter placement lists and prefetch related data for efficiency.
        """
        queryset = PlacementList.objects.filter(is_active=True)

        if self.action == 'retrieve':
            # Prefetch students and their skills for detail view
            queryset = queryset.prefetch_related(
                'students__student__user',
                'students__student__skills__skill',
                'students__added_by'
            )

        return queryset.select_related('created_by')

    def perform_create(self, serializer):
        """
        Set the created_by field to the current user.
        """
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='add-student')
    def add_student(self, request, pk=None):
        """
        Add a student to a placement list.

        Request Body:
        {
            "student_id": 123,
            "notes": "Excellent Python skills"  // optional
        }
        """
        placement_list = self.get_object()
        serializer = AddStudentToListSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        student_id = serializer.validated_data['student_id']
        notes = serializer.validated_data.get('notes', '')

        try:
            student = StudentProfile.objects.select_related(
                'user').get(id=student_id)
        except StudentProfile.DoesNotExist:
            return Response(
                {'error': 'Student not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if student is already in the list
        existing = PlacementListStudent.objects.filter(
            placement_list=placement_list,
            student=student
        ).first()

        if existing:
            if existing.is_active:
                return Response(
                    {'error': 'Student is already in this placement list.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                # Reactivate previously removed student
                existing.is_active = True
                existing.added_by = request.user
                existing.notes = notes
                existing.save(update_fields=['is_active', 'added_by', 'notes'])

                return Response(
                    {
                        'message': f'Student {student.user.full_name} re-added to {placement_list.name}.',
                        'data': PlacementListStudentSerializer(existing).data
                    },
                    status=status.HTTP_200_OK
                )

        # Add student to the list (new student)
        with transaction.atomic():
            placement_student = PlacementListStudent.objects.create(
                placement_list=placement_list,
                student=student,
                added_by=request.user,
                notes=notes
            )

        return Response(
            {
                'message': f'Student {student.user.full_name} added to {placement_list.name}.',
                'data': PlacementListStudentSerializer(placement_student).data
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='remove-student')
    def remove_student(self, request, pk=None):
        """
        Remove a student from a placement list.

        Request Body:
        {
            "student_id": 123
        }
        """
        placement_list = self.get_object()
        serializer = RemoveStudentFromListSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        student_id = serializer.validated_data['student_id']

        try:
            student = StudentProfile.objects.get(id=student_id)
        except StudentProfile.DoesNotExist:
            return Response(
                {'error': 'Student not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Find the placement list student entry
        placement_student = PlacementListStudent.objects.filter(
            placement_list=placement_list,
            student=student,
            is_active=True
        ).first()

        if not placement_student:
            return Response(
                {'error': 'Student is not in this placement list.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Soft delete by setting is_active to False
        placement_student.is_active = False
        placement_student.save(update_fields=['is_active'])

        return Response(
            {
                'message': f'Student {student.user.full_name} removed from {placement_list.name}.'
            },
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], url_path='student-lists')
    def student_lists(self, request):
        """
        Get all placement lists for a specific student.

        Query Params:
        - student_id: ID of the student
        """
        student_id = request.query_params.get('student_id')

        if not student_id:
            return Response(
                {'error': 'student_id query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            student = StudentProfile.objects.get(id=student_id)
        except StudentProfile.DoesNotExist:
            return Response(
                {'error': 'Student not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get all placement lists containing this student
        placement_students = PlacementListStudent.objects.filter(
            student=student,
            is_active=True
        ).select_related('placement_list', 'added_by')

        lists_data = [
            {
                'placement_list': PlacementListSerializer(ps.placement_list).data,
                'added_at': ps.added_at,
                'notes': ps.notes
            }
            for ps in placement_students
        ]

        return Response(
            {
                'student': {
                    'id': student.id,
                    'name': student.user.full_name,
                    'email': student.user.email
                },
                'placement_lists': lists_data
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='send-registration-link')
    def send_registration_link(self, request, pk=None):
        """
        Send registration link to all students in the placement list.

        This creates StudentPlacementLink entries for each active student
        in the placement list, storing the registration link.
        """
        placement_list = self.get_object()

        if not placement_list.placement_link:
            return Response(
                {'error': 'Placement list does not have a registration link set.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get all active students in this placement list
        placement_students = PlacementListStudent.objects.filter(
            placement_list=placement_list,
            is_active=True
        ).select_related('student')

        if not placement_students.exists():
            return Response(
                {'error': 'No active students in this placement list.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create StudentPlacementLink for each student
        created_count = 0
        skipped_count = 0

        for placement_student in placement_students:
            # Check if link already sent to this student
            existing = StudentPlacementLink.objects.filter(
                student=placement_student.student,
                placement_list=placement_list
            ).exists()

            if existing:
                skipped_count += 1
                continue

            StudentPlacementLink.objects.create(
                student=placement_student.student,
                placement_list=placement_list,
                placement_link=placement_list.placement_link
            )
            created_count += 1

        return Response(
            {
                'message': f'Registration links sent to {created_count} students.',
                'created': created_count,
                'skipped': skipped_count,
                'total_students': len(list(placement_students))
            },
            status=status.HTTP_200_OK
        )


class StudentPlacementLinkViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for students to view their placement registration links.

    Endpoints:
    - GET /api/placement/student-links/ - Get all placement links for logged-in student
    """
    serializer_class = StudentPlacementLinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return only placement links for the logged-in student.
        """
        user = self.request.user
        try:
            student = StudentProfile.objects.get(user=user)
            return StudentPlacementLink.objects.filter(
                student=student
            ).select_related('placement_list').order_by('-sent_at')
        except StudentProfile.DoesNotExist:
            return StudentPlacementLink.objects.none()
