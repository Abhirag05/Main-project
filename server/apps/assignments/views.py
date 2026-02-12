from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from django.db.models import Q, Count, Case, When, IntegerField, Avg, Prefetch
import logging

from .models import Assignment, AssignmentSubmission
from .serializers import (
    AssignmentSerializer,
    FacultyAssignmentCreateSerializer,
    FacultyAssignmentListSerializer,
    FacultySubmissionListSerializer,
    FacultyEvaluateSubmissionSerializer,
    StudentAssignmentListSerializer,
    StudentSubmissionCreateSerializer,
    StudentSubmissionDetailSerializer,
)
from .permissions import (
    IsFaculty,
    IsStudent,
    CanManageAssignment,
    CanViewAssignmentSubmissions,
    CanEvaluateSubmission,
    CanSubmitAssignment,
    CanViewBatchAssignments,
    IsSubmissionOwner,
)
from apps.batch_management.models import BatchStudent, Batch
from apps.assessments.models import Skill

logger = logging.getLogger(__name__)


# ============================================================
# FACULTY VIEWS
# ============================================================

class FacultyAssignmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for faculty to manage assignments.

    Faculty can:
    - Create assignments for batches/modules they teach
    - View their created assignments
    - Update/delete their assignments
    - View submissions for their assignments
    """
    permission_classes = [IsAuthenticated, IsFaculty]

    def get_queryset(self):
        """Return only assignments created by the current faculty"""
        return Assignment.objects.filter(
            faculty=self.request.user
        ).select_related('batch', 'module', 'faculty').prefetch_related(
            'skill_mappings__skill'
        ).annotate(
            _total_submissions=Count('submissions'),
            _evaluated_submissions=Count('submissions', filter=Q(submissions__marks_obtained__isnull=False)),
            _pending_evaluations=Count('submissions', filter=Q(submissions__marks_obtained__isnull=True))
        )
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action in ['create', 'update', 'partial_update']:
            return FacultyAssignmentCreateSerializer
        elif self.action == 'list':
            return FacultyAssignmentListSerializer
        return AssignmentSerializer

    def perform_create(self, serializer):
        """Set the faculty to current user when creating assignment"""
        serializer.save(faculty=self.request.user)

    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), CanManageAssignment()]
        return [IsAuthenticated(), IsFaculty()]

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated, CanViewAssignmentSubmissions])
    def submissions(self, request, pk=None):
        """
        Get all submissions for a specific assignment.

        GET /api/faculty/assignments/{id}/submissions/
        """
        assignment = self.get_object()
        submissions = AssignmentSubmission.objects.filter(
            assignment=assignment
        ).select_related('student', 'student__user', 'evaluated_by')

        # Filter by evaluation status if requested
        eval_status = request.query_params.get('evaluated', None)
        if eval_status == 'true':
            submissions = submissions.filter(marks_obtained__isnull=False)
        elif eval_status == 'false':
            submissions = submissions.filter(marks_obtained__isnull=True)

        serializer = FacultySubmissionListSerializer(submissions, many=True)
        return Response({
            'assignment': {
                'id': assignment.id,
                'title': assignment.title,
                'max_marks': assignment.max_marks,
                'due_date': assignment.due_date,
            },
            'total_submissions': submissions.count(),
            'submissions': serializer.data
        })

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """
        Get statistics for an assignment.

        GET /api/faculty/assignments/{id}/statistics/
        """
        assignment = self.get_object()
        submissions = assignment.submissions.all()

        total_students = assignment.batch.students.filter(
            is_active=True).count()
        total_submissions = submissions.count()
        evaluated_count = submissions.filter(
            marks_obtained__isnull=False).count()
        pending_count = submissions.filter(marks_obtained__isnull=True).count()
        not_submitted_count = total_students - total_submissions

        # Calculate average marks
        evaluated_submissions = submissions.filter(
            marks_obtained__isnull=False)
        avg_marks = None
        if evaluated_submissions.exists():
            from django.db.models import Avg
            avg_marks = evaluated_submissions.aggregate(
                avg=Avg('marks_obtained')
            )['avg']

        return Response({
            'assignment_id': assignment.id,
            'assignment_title': assignment.title,
            'max_marks': assignment.max_marks,
            'total_students': total_students,
            'total_submissions': total_submissions,
            'evaluated_submissions': evaluated_count,
            'pending_evaluations': pending_count,
            'not_submitted': not_submitted_count,
            'submission_rate': round((total_submissions / total_students * 100), 2) if total_students > 0 else 0,
            'average_marks': round(float(avg_marks), 2) if avg_marks else None,
        })


class FacultyEvaluateSubmissionView(generics.UpdateAPIView):
    """
    View for faculty to evaluate student submissions.

    PATCH /api/faculty/submissions/{id}/evaluate/
    """
    queryset = AssignmentSubmission.objects.all()
    serializer_class = FacultyEvaluateSubmissionSerializer
    permission_classes = [IsAuthenticated, CanEvaluateSubmission]

    def get_queryset(self):
        """Return submissions for assignments created by current faculty"""
        return AssignmentSubmission.objects.filter(
            assignment__faculty=self.request.user
        ).select_related('assignment', 'student', 'student__user')

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Return detailed response
        return Response({
            'message': 'Submission evaluated successfully',
            'submission': {
                'id': instance.id,
                'student_name': instance.student.user.get_full_name(),
                'marks_obtained': instance.marks_obtained,
                'max_marks': instance.assignment.max_marks,
                'feedback': instance.feedback,
                'evaluated_at': instance.evaluated_at,
            }
        })


# ============================================================
# STUDENT VIEWS
# ============================================================

class StudentAssignmentListView(generics.ListAPIView):
    """
    View for students to list assignments for their batch.

    GET /api/student/assignments/

    Query params:
    - module: Filter by module ID
    - status: 'pending' | 'submitted' | 'overdue'
    """
    serializer_class = StudentAssignmentListSerializer
    permission_classes = [IsAuthenticated, IsStudent, CanViewBatchAssignments]

    def get_queryset(self):
        """Return active assignments for student's batches"""
        student = self.request.user.student_profile

        # Get all active batches for this student
        student_batches = BatchStudent.objects.filter(
            student=student,
            is_active=True
        ).values_list('batch_id', flat=True)

        if not student_batches:
            return Assignment.objects.none()

        queryset = Assignment.objects.filter(
            batch_id__in=student_batches,
            is_active=True,
            start_date__lte=timezone.now()
        ).select_related('module', 'faculty').prefetch_related(
            'skill_mappings__skill',
            Prefetch(
                'submissions',
                queryset=AssignmentSubmission.objects.filter(student=student),
                to_attr='_student_submissions'
            )
        ).order_by('-created_at')
        
        # Filter by module if requested
        module_id = self.request.query_params.get('module', None)
        if module_id:
            queryset = queryset.filter(module_id=module_id)

        # Filter by status if requested
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            now = timezone.now()
            if status_filter == 'overdue':
                queryset = queryset.filter(due_date__lt=now)
            elif status_filter == 'pending':
                # Assignments not yet submitted by this student
                submitted_ids = AssignmentSubmission.objects.filter(
                    student=student
                ).values_list('assignment_id', flat=True)
                queryset = queryset.exclude(
                    id__in=submitted_ids).filter(due_date__gte=now)
            elif status_filter == 'submitted':
                # Assignments submitted by this student
                submitted_ids = AssignmentSubmission.objects.filter(
                    student=student
                ).values_list('assignment_id', flat=True)
                queryset = queryset.filter(id__in=submitted_ids)

        return queryset


class StudentSubmitAssignmentView(generics.CreateAPIView):
    """
    View for students to submit assignments.

    POST /api/student/assignments/{id}/submit/

    If submission already exists, it will be updated (re-upload).
    """
    serializer_class = StudentSubmissionCreateSerializer
    permission_classes = [IsAuthenticated, IsStudent, CanSubmitAssignment]

    def create(self, request, *args, **kwargs):
        assignment_id = kwargs.get('pk')
        assignment = get_object_or_404(
            Assignment, id=assignment_id, is_active=True)
        student = request.user.student_profile

        # Check if student is enrolled in the assignment's batch
        batch_student = BatchStudent.objects.filter(
            student=student,
            batch=assignment.batch,
            is_active=True
        ).first()

        if not batch_student:
            return Response(
                {'error': 'This assignment is not for your batch'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check permissions
        self.check_object_permissions(request, assignment)

        # Prepare serializer with context
        serializer = self.get_serializer(
            data=request.data,
            context={
                'request': request,
                'assignment': assignment,
                'student': student
            }
        )
        serializer.is_valid(raise_exception=True)

        # Check if submission already exists (allow re-upload)
        try:
            existing_submission = AssignmentSubmission.objects.get(
                assignment=assignment,
                student=student
            )
            # Update existing submission
            existing_submission.submission_file = serializer.validated_data['submission_file']
            existing_submission.save()

            return Response({
                'message': 'Assignment re-submitted successfully',
                'submission': {
                    'id': existing_submission.id,
                    'assignment': assignment.title,
                    'submitted_at': existing_submission.updated_at,
                    'is_late_submission': existing_submission.is_late_submission
                }
            }, status=status.HTTP_200_OK)

        except AssignmentSubmission.DoesNotExist:
            # Create new submission
            submission = AssignmentSubmission.objects.create(
                assignment=assignment,
                student=student,
                submission_file=serializer.validated_data['submission_file']
            )

            return Response({
                'message': 'Assignment submitted successfully',
                'submission': {
                    'id': submission.id,
                    'assignment': assignment.title,
                    'submitted_at': submission.submitted_at,
                    'is_late_submission': submission.is_late_submission
                }
            }, status=status.HTTP_201_CREATED)


class StudentSubmissionListView(generics.ListAPIView):
    """
    View for students to list their own submissions.

    GET /api/student/submissions/

    Query params:
    - evaluated: 'true' | 'false'
    - module: Filter by module ID
    """
    serializer_class = StudentSubmissionDetailSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        """Return only submissions by the current student"""
        student = self.request.user.student_profile
        queryset = AssignmentSubmission.objects.filter(
            student=student
        ).select_related('assignment', 'assignment__module').order_by('-submitted_at')

        # Filter by evaluation status if requested
        evaluated = self.request.query_params.get('evaluated', None)
        if evaluated == 'true':
            queryset = queryset.filter(marks_obtained__isnull=False)
        elif evaluated == 'false':
            queryset = queryset.filter(marks_obtained__isnull=True)

        # Filter by module if requested
        module_id = self.request.query_params.get('module', None)
        if module_id:
            queryset = queryset.filter(assignment__module_id=module_id)

        return queryset


class StudentSubmissionDetailView(generics.RetrieveAPIView):
    """
    View for students to view their own submission details.

    GET /api/student/submissions/{id}/
    """
    serializer_class = StudentSubmissionDetailSerializer
    permission_classes = [IsAuthenticated, IsStudent, IsSubmissionOwner]

    def get_queryset(self):
        """Return only submissions by the current student"""
        return AssignmentSubmission.objects.filter(
            student=self.request.user.student_profile
        ).select_related('assignment', 'assignment__module', 'evaluated_by')


class FacultyBatchSkillsView(generics.ListAPIView):
    """
    View to get available skills for a batch's course.

    GET /api/faculty/batches/{batch_id}/skills/
    """
    permission_classes = [IsAuthenticated, IsFaculty]

    def get(self, request, *args, **kwargs):
        """Get skills for a specific batch"""
        batch_id = self.kwargs.get('batch_id')

        try:
            # Get the batch with its template and course
            batch = Batch.objects.select_related(
                'template__course').get(id=batch_id)

            # Validate batch has a course
            if not batch.template or not batch.template.course:
                return Response(
                    {'error': 'Batch does not have a course template'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            course = batch.template.course

            # Get skills for this course
            skills = Skill.objects.filter(
                course=course,
                is_active=True
            ).order_by('name')

            # Return skill data
            skills_data = [
                {'id': skill.id, 'name': skill.name,
                    'description': skill.description}
                for skill in skills
            ]

            return Response(skills_data, status=status.HTTP_200_OK)

        except Batch.DoesNotExist:
            return Response(
                {'error': f'Batch with id {batch_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.exception("Error fetching batch skills")
            return Response(
                {'error': 'Unable to fetch skills. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
