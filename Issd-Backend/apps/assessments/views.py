"""
Assessment views.

API views and viewsets for the assessment module.
Includes both Faculty and Student endpoints.
"""
from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction, models
from django.db.models import Count, Prefetch
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import (
    Assessment,
    AssessmentQuestion,
    AssessmentOption,
    Skill,
    AssessmentSkillMapping,
    StudentAssessmentAttempt,
    StudentAnswer,
    StudentSkill,
    QuestionBank,
    BankQuestion,
)
from .utils.aiken_parser import parse_aiken_file
from .serializers import (
    AssessmentListSerializer,
    StudentAssessmentListSerializer,
    AssessmentDetailSerializer,
    AssessmentCreateSerializer,
    AssessmentUpdateSerializer,
    AssessmentStudentSerializer,
    AssessmentQuestionSerializer,
    AssessmentQuestionCreateSerializer,
    AssessmentOptionSerializer,
    SkillSerializer,
    SkillCreateSerializer,
    AssessmentSkillMappingSerializer,
    AssessmentSkillMappingCreateSerializer,
    StudentAssessmentAttemptSerializer,
    StudentAssessmentAttemptDetailSerializer,
    StudentSkillSerializer,
    SubmitAssessmentSerializer,
)
from .permissions import (
    IsFaculty,
    IsStudent,
    IsAssessmentOwner,
    IsAssessmentEditable,
    CanAttemptAssessment,
    CanViewAssessmentResults,
)
from .services import (
    AssessmentEvaluationService,
    SkillComputationService,
    AssessmentResultsService,
    AssessmentStatusService,
)


# ==================== Faculty Views ====================

class FacultyAssessmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for faculty to manage assessments.

    Endpoints:
    - GET /api/faculty/assessments/ - List faculty's assessments
    - POST /api/faculty/assessments/ - Create assessment
    - GET /api/faculty/assessments/{id}/ - Get assessment details
    - PATCH /api/faculty/assessments/{id}/ - Update assessment (DRAFT only)
    - DELETE /api/faculty/assessments/{id}/ - Soft delete assessment (any status)
    - POST /api/faculty/assessments/{id}/publish/ - Publish assessment
    - GET /api/faculty/assessments/{id}/results/ - Get assessment results
    """
    permission_classes = [IsAuthenticated, IsFaculty]

    def get_queryset(self):
        """Filter assessments by logged-in faculty."""
        faculty_profile = self.request.user.faculty_profile
        queryset = Assessment.objects.filter(
            faculty=faculty_profile,
            is_active=True
        ).select_related(
            'batch', 'batch__template__course', 'batch__centre', 'subject', 'faculty__user'
        ).prefetch_related(
            'skill_mappings__skill'
        ).order_by('-created_at')

        # Optional filters
        batch_id = self.request.query_params.get('batch_id')
        status_filter = self.request.query_params.get('status')

        if batch_id:
            queryset = queryset.filter(batch_id=batch_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return AssessmentListSerializer
        elif self.action == 'create':
            return AssessmentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return AssessmentUpdateSerializer
        return AssessmentDetailSerializer

    def get_permissions(self):
        """Add object-level permissions for update/delete."""
        permissions = super().get_permissions()
        # Owner permission for update/partial_update/destroy
        if self.action in ['update', 'partial_update', 'destroy']:
            permissions.append(IsAssessmentOwner())

        # Editable permission should only apply to update operations,
        # not to destroy — we allow owners to delete regardless of status.
        if self.action in ['update', 'partial_update']:
            permissions.append(IsAssessmentEditable())
        return permissions

    def perform_destroy(self, instance):
        """Soft delete the assessment (regardless of status)."""
        # Allow deletion in any state - soft delete by setting is_active=False
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """
        Publish an assessment.

        Transitions from DRAFT to SCHEDULED status.
        Validates questions and marks.
        """
        assessment = self.get_object()

        try:
            assessment = AssessmentStatusService.publish_assessment(assessment)
            return Response({
                'message': 'Assessment published successfully',
                'status': assessment.status
            })
        except ValueError as e:
            raise ValidationError(str(e))

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """
        Get assessment results.

        Returns summary statistics and all student results.
        """
        assessment = self.get_object()

        summary = AssessmentResultsService.get_assessment_results_summary(
            assessment)
        students = AssessmentResultsService.get_all_student_results(assessment)

        return Response({
            'summary': summary,
            'students': students
        })


class FacultyQuestionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for faculty to manage assessment questions.

    Endpoints:
    - GET /api/faculty/assessments/{assessment_id}/questions/ - List questions
    - POST /api/faculty/assessments/{assessment_id}/questions/ - Create question
    - GET /api/faculty/assessments/{assessment_id}/questions/{id}/ - Get question
    - PATCH /api/faculty/assessments/{assessment_id}/questions/{id}/ - Update question
    - DELETE /api/faculty/assessments/{assessment_id}/questions/{id}/ - Delete question
    """
    permission_classes = [IsAuthenticated, IsFaculty, IsAssessmentOwner]

    def get_queryset(self):
        """Filter questions by assessment."""
        assessment_id = self.kwargs.get('assessment_id')
        return AssessmentQuestion.objects.filter(
            assessment_id=assessment_id,
            is_active=True
        ).prefetch_related('options').order_by('order')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AssessmentQuestionCreateSerializer
        return AssessmentQuestionSerializer

    def get_assessment(self):
        """Get and validate the parent assessment."""
        assessment_id = self.kwargs.get('assessment_id')
        assessment = get_object_or_404(
            Assessment, id=assessment_id, is_active=True)

        # Check ownership
        if assessment.faculty != self.request.user.faculty_profile:
            raise PermissionDenied("You don't own this assessment")

        # Check status for write operations
        if self.request.method not in ['GET', 'HEAD', 'OPTIONS']:
            if assessment.status != Assessment.Status.DRAFT:
                raise ValidationError(
                    "Cannot modify questions for non-draft assessment")

        return assessment

    def perform_create(self, serializer):
        """Create question and attach to assessment."""
        assessment = self.get_assessment()

        # Auto-set order if not provided
        max_order = assessment.questions.filter(is_active=True).count()

        serializer.save(
            assessment=assessment,
            order=serializer.validated_data.get('order', max_order + 1)
        )

    def perform_update(self, serializer):
        """Validate assessment before update."""
        self.get_assessment()
        serializer.save()

    def perform_destroy(self, instance):
        """Soft delete the question."""
        self.get_assessment()
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class FacultySkillMappingView(generics.ListCreateAPIView):
    """
    View for managing skill mappings for an assessment.

    Endpoints:
    - GET /api/faculty/assessments/{assessment_id}/skills/ - List skill mappings
    - POST /api/faculty/assessments/{assessment_id}/skills/ - Add skill mapping
    """
    permission_classes = [IsAuthenticated, IsFaculty]
    serializer_class = AssessmentSkillMappingSerializer

    def get_queryset(self):
        assessment_id = self.kwargs.get('assessment_id')
        return AssessmentSkillMapping.objects.filter(
            assessment_id=assessment_id
        ).select_related('skill')

    def get_assessment(self):
        """Get and validate the parent assessment."""
        assessment_id = self.kwargs.get('assessment_id')
        assessment = get_object_or_404(
            Assessment, id=assessment_id, is_active=True)

        if assessment.faculty != self.request.user.faculty_profile:
            raise PermissionDenied("You don't own this assessment")

        if self.request.method == 'POST' and assessment.status != Assessment.Status.DRAFT:
            raise ValidationError(
                "Cannot modify skills for non-draft assessment")

        return assessment

    def perform_create(self, serializer):
        """Create skill mapping."""
        assessment = self.get_assessment()

        # Check if mapping already exists
        skill_id = serializer.validated_data.get('skill').id
        if AssessmentSkillMapping.objects.filter(
            assessment=assessment,
            skill_id=skill_id
        ).exists():
            raise ValidationError(
                "This skill is already mapped to this assessment")

        serializer.save(assessment=assessment)


class FacultyBatchesView(generics.ListAPIView):
    """
    Get batches assigned to the faculty.

    GET /api/faculty/me/batches/
    """
    permission_classes = [IsAuthenticated, IsFaculty]

    def get(self, request):
        """Return batches assigned to the logged-in faculty."""
        from apps.faculty.models import FacultyBatchAssignment
        from apps.batch_management.models import Batch

        faculty_profile = request.user.faculty_profile

        assignments = FacultyBatchAssignment.objects.filter(
            faculty=faculty_profile,
            is_active=True
        ).select_related(
            'batch', 'batch__template__course'
        )

        batches = []
        for assignment in assignments:
            batch = assignment.batch
            batches.append({
                'id': batch.id,
                'code': batch.code,
                'course_id': batch.template.course.id,
                'course_name': batch.template.course.name,
                'status': batch.status,
                'start_date': batch.start_date.isoformat(),
                'end_date': batch.end_date.isoformat(),
            })

        return Response(batches)


class FacultyBatchSubjectsView(generics.ListAPIView):
    """
    Get modules for a specific batch that the faculty is assigned to.

    GET /api/batch/{batch_id}/subjects/
    """
    permission_classes = [IsAuthenticated, IsFaculty]

    def get(self, request, batch_id):
        """Return modules for the batch that the faculty is assigned to teach."""
        from apps.batch_management.models import Batch
        from apps.faculty.models import FacultyModuleAssignment

        try:
            batch = Batch.objects.select_related(
                'template__course').get(id=batch_id)
        except Batch.DoesNotExist:
            return Response({'error': 'Batch not found'}, status=404)

        faculty_profile = request.user.faculty_profile

        # Get modules the faculty is assigned to teach (for any batch)
        faculty_module_ids = FacultyModuleAssignment.objects.filter(
            faculty=faculty_profile,
            is_active=True
        ).values_list('module_id', flat=True)

        # Get modules from the course curriculum that the faculty is assigned to
        from apps.academics.models import CourseModule
        course_modules = CourseModule.objects.filter(
            course=batch.template.course,
            module_id__in=faculty_module_ids,
            is_active=True
        ).select_related('module').order_by('sequence_order')

        modules = []
        for cm in course_modules:
            modules.append({
                'id': cm.module.id,
                'code': cm.module.code,
                'name': cm.module.name,
            })

        return Response(modules)


class CourseSkillsView(generics.ListAPIView):
    """
    Get skills for a specific course.

    GET /api/academics/courses/{course_id}/skills/

    This view syncs skills from Course.skills JSONField to the Skill table
    and returns them for selection in assessments.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SkillSerializer

    def get(self, request, course_id):
        """Return skills for the course, syncing from Course.skills JSONField if needed."""
        from apps.academics.models import Course

        try:
            course = Course.objects.get(id=course_id, is_active=True)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found'}, status=404)

        # Sync skills from Course.skills JSONField to Skill table
        course_skill_names = course.skills or []

        # Create any missing skills
        for skill_name in course_skill_names:
            Skill.objects.get_or_create(
                course=course,
                name=skill_name,
                defaults={'description': f'Skill: {skill_name}',
                          'is_active': True}
            )

        # Deactivate skills that are no longer in Course.skills
        Skill.objects.filter(course=course).exclude(
            name__in=course_skill_names).update(is_active=False)

        # Return active skills for this course
        skills = Skill.objects.filter(course=course, is_active=True)
        serializer = SkillSerializer(skills, many=True)
        return Response(serializer.data)


# ==================== Student Views ====================

class StudentAvailableAssessmentsView(generics.ListAPIView):
    """
    List assessments available to the student.

    GET /api/student/assessments/
    """
    permission_classes = [IsAuthenticated, IsStudent]
    serializer_class = StudentAssessmentListSerializer

    def get_queryset(self):
        """Get assessments for student's active batch."""
        from apps.batch_management.models import BatchStudent

        student = self.request.user.student_profile

        # Get student's active batch
        batch_student = BatchStudent.objects.filter(
            student=student,
            is_active=True
        ).select_related('batch').first()

        if not batch_student:
            return Assessment.objects.none()

        assessments = Assessment.objects.filter(
            batch=batch_student.batch,
            status__in=[
                Assessment.Status.SCHEDULED,
                Assessment.Status.ACTIVE,
                Assessment.Status.COMPLETED,
            ],
            is_active=True
        ).select_related(
            'batch', 'subject', 'faculty__user'
        ).order_by('start_time')

        # Update status for assessments based on current time
        for assessment in assessments:
            assessment.update_status_based_on_time()

        return assessments


class StudentAssessmentDetailView(generics.RetrieveAPIView):
    """
    Get assessment details for a student (without correct answers).

    GET /api/student/assessments/{id}/
    """
    permission_classes = [IsAuthenticated, IsStudent]
    serializer_class = AssessmentStudentSerializer

    def get_object(self):
        """Get assessment and validate student access."""
        from apps.batch_management.models import BatchStudent

        assessment_id = self.kwargs.get('pk')
        assessment = get_object_or_404(
            Assessment, id=assessment_id, is_active=True
        )

        # Update assessment status based on current time
        assessment.update_status_based_on_time()

        student = self.request.user.student_profile

        # Check if student is in the batch
        if not BatchStudent.objects.filter(
            student=student,
            batch=assessment.batch,
            is_active=True
        ).exists():
            raise PermissionDenied("You are not enrolled in this batch")

        return assessment


class StudentStartAssessmentView(generics.CreateAPIView):
    """
    Start an assessment attempt.

    POST /api/student/assessments/{id}/start/
    """
    permission_classes = [IsAuthenticated, IsStudent]

    @transaction.atomic
    def post(self, request, pk):
        """Create a new attempt for the assessment."""
        assessment = get_object_or_404(Assessment, id=pk, is_active=True)

        # Update assessment status based on current time
        assessment.update_status_based_on_time()

        student = request.user.student_profile

        # Validate can attempt
        permission = CanAttemptAssessment()
        if not permission.has_object_permission(request, self, assessment):
            raise PermissionDenied(permission.message)

        # Create attempt
        attempt = StudentAssessmentAttempt.objects.create(
            student=student,
            assessment=assessment,
            status=StudentAssessmentAttempt.AttemptStatus.IN_PROGRESS
        )

        # Return assessment with questions (without answers)
        serializer = AssessmentStudentSerializer(assessment)

        return Response({
            'attempt_id': attempt.id,
            'assessment': serializer.data,
            'started_at': attempt.started_at.isoformat(),
            'time_limit_minutes': assessment.duration_minutes,
        }, status=status.HTTP_201_CREATED)


class StudentSubmitAssessmentView(generics.CreateAPIView):
    """
    Submit answers for an assessment.

    POST /api/student/assessments/{id}/submit/
    """
    permission_classes = [IsAuthenticated, IsStudent]
    serializer_class = SubmitAssessmentSerializer

    @transaction.atomic
    def post(self, request, pk):
        """Submit answers and trigger evaluation."""
        assessment = get_object_or_404(Assessment, id=pk, is_active=True)
        student = request.user.student_profile

        # Get the attempt
        try:
            attempt = StudentAssessmentAttempt.objects.get(
                student=student,
                assessment=assessment,
                status=StudentAssessmentAttempt.AttemptStatus.IN_PROGRESS
            )
        except StudentAssessmentAttempt.DoesNotExist:
            raise ValidationError(
                "No active attempt found for this assessment")

        # Validate request
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answers_data = serializer.validated_data['answers']

        # Save answers
        for answer_data in answers_data:
            question_id = answer_data['question_id']
            selected_option_id = answer_data.get('selected_option_id')

            # Validate question belongs to assessment
            try:
                question = AssessmentQuestion.objects.get(
                    id=question_id,
                    assessment=assessment,
                    is_active=True
                )
            except AssessmentQuestion.DoesNotExist:
                continue  # Skip invalid questions

            # Validate option belongs to question
            selected_option = None
            if selected_option_id:
                try:
                    selected_option = AssessmentOption.objects.get(
                        id=selected_option_id,
                        question=question
                    )
                except AssessmentOption.DoesNotExist:
                    continue  # Skip invalid options

            # Create or update answer
            StudentAnswer.objects.update_or_create(
                attempt=attempt,
                question=question,
                defaults={'selected_option': selected_option}
            )

        # Evaluate the attempt
        attempt = AssessmentEvaluationService.evaluate_attempt(attempt)

        # Compute skills
        updated_skills = SkillComputationService.compute_skills_for_attempt(
            attempt)

        # Get detailed result
        result = AssessmentEvaluationService.get_attempt_details(attempt)

        return Response({
            'message': 'Assessment submitted successfully',
            'result': result,
            'skills_updated': len(updated_skills)
        })


class StudentMyAttemptsView(generics.ListAPIView):
    """
    List student's assessment attempts.

    GET /api/student/my-attempts/
    """
    permission_classes = [IsAuthenticated, IsStudent]
    serializer_class = StudentAssessmentAttemptSerializer

    def get_queryset(self):
        """Get attempts for the logged-in student."""
        student = self.request.user.student_profile
        return StudentAssessmentAttempt.objects.filter(
            student=student
        ).select_related(
            'assessment', 'assessment__batch', 'assessment__subject'
        ).order_by('-started_at')


class StudentAttemptDetailView(generics.RetrieveAPIView):
    """
    Get detailed result of an attempt.

    GET /api/student/attempts/{id}/
    """
    permission_classes = [IsAuthenticated, IsStudent]
    serializer_class = StudentAssessmentAttemptDetailSerializer

    def get_object(self):
        """Get attempt and validate ownership."""
        attempt_id = self.kwargs.get('pk')
        student = self.request.user.student_profile

        attempt = get_object_or_404(
            StudentAssessmentAttempt,
            id=attempt_id,
            student=student
        )

        return attempt


class StudentMySkillsView(generics.ListAPIView):
    """
    List student's skills.

    GET /api/student/my-skills/
    """
    permission_classes = [IsAuthenticated, IsStudent]
    serializer_class = StudentSkillSerializer

    def get_queryset(self):
        """Get skills for the logged-in student."""
        student = self.request.user.student_profile
        return StudentSkill.objects.filter(
            student=student
        ).select_related('skill', 'skill__course')

    def list(self, request, *args, **kwargs):
        """Return skills with summary."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        # Get summary
        summary = SkillComputationService.get_student_skills_summary(
            request.user.student_profile
        )

        return Response({
            'summary': {
                'total_skills': summary['total_skills'],
                'by_level': summary['by_level'],
            },
            'skills': serializer.data
        })


class StudentSkillBreakdownView(APIView):
    """
    Get breakdown of a specific skill (assessments + assignments).

    GET /api/student/my-skills/{skill_id}/breakdown/
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request, skill_id):
        student = request.user.student_profile
        skill = get_object_or_404(Skill, id=skill_id)

        # 1. Get Assessments
        assessments = StudentAssessmentAttempt.objects.filter(
            student=student,
            assessment__skill_mappings__skill=skill,
            status=StudentAssessmentAttempt.AttemptStatus.EVALUATED
        ).select_related('assessment')

        assessment_data = []
        for attempt in assessments:
            # Find weight
            mapping = AssessmentSkillMapping.objects.filter(
                assessment=attempt.assessment, skill=skill).first()
            weight = mapping.weight_percentage if mapping else 0

            assessment_data.append({
                'type': 'Assessment',
                'name': attempt.assessment.title,
                'score': float(attempt.percentage or 0),
                'weight': weight,
                'date': attempt.submitted_at
            })

        # 2. Get Assignments
        try:
            from apps.assignments.models import AssignmentSubmission
            submissions = AssignmentSubmission.objects.filter(
                student=student,
                assignment__skill_mappings__skill=skill,
                marks_obtained__isnull=False
            ).select_related('assignment')

            for sub in submissions:
                # Find weight
                # Filter related manager
                mapping = sub.assignment.skill_mappings.filter(
                    skill=skill).first()
                weight = mapping.weight_percentage if mapping else 100

                percentage = 0
                if sub.assignment.max_marks > 0 and sub.marks_obtained is not None:
                    percentage = (float(sub.marks_obtained) /
                                  float(sub.assignment.max_marks)) * 100

                assessment_data.append({
                    'type': 'Assignment',
                    'name': sub.assignment.title,
                    'score': float(percentage),
                    'weight': weight,
                    'date': sub.submitted_at
                })
        except ImportError:
            pass  # Assignment app might not be available or circular import issue

        # Sort by date descending
        combined = sorted(
            assessment_data, key=lambda x: x['date'] or timezone.now(), reverse=True)

        return Response({
            'skill_id': skill.id,
            'skill_name': skill.name,
            'breakdown': combined
        })


# ==================== Admin/Skill Management Views ====================

class SkillViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing skills (admin/academic coordinator).

    Endpoints:
    - GET /api/academics/skills/ - List all skills
    - POST /api/academics/skills/ - Create skill
    - GET /api/academics/skills/{id}/ - Get skill
    - PATCH /api/academics/skills/{id}/ - Update skill
    - DELETE /api/academics/skills/{id}/ - Soft delete skill
    """
    permission_classes = [IsAuthenticated]  # Add proper admin permission
    queryset = Skill.objects.filter(is_active=True).select_related('course')

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SkillCreateSerializer
        return SkillSerializer

    def perform_destroy(self, instance):
        """Soft delete the skill."""
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


# ==================== Question Bank Views ====================

class QuestionBankViewSet(viewsets.ModelViewSet):
    """
    ViewSet for faculty to manage question banks.

    Endpoints:
    - GET /api/faculty/question-banks/ - List faculty's question banks
    - POST /api/faculty/question-banks/ - Create question bank
    - GET /api/faculty/question-banks/{id}/ - Get question bank details
    - DELETE /api/faculty/question-banks/{id}/ - Soft delete question bank
    """
    permission_classes = [IsAuthenticated, IsFaculty]

    def get_queryset(self):
        """Filter question banks by logged-in faculty."""
        from .models import QuestionBank
        faculty_profile = self.request.user.faculty_profile
        return QuestionBank.objects.filter(
            faculty=faculty_profile,
            is_active=True
        ).select_related('subject', 'faculty__user')

    def get_serializer_class(self):
        from .serializers import QuestionBankSerializer, QuestionBankDetailSerializer
        if self.action == 'retrieve':
            return QuestionBankDetailSerializer
        return QuestionBankSerializer

    def perform_create(self, serializer):
        """Set faculty from request user."""
        serializer.save(faculty=self.request.user.faculty_profile)

    def perform_destroy(self, instance):
        """Soft delete the question bank."""
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class AikenImportView(generics.CreateAPIView):
    """
    Import questions from AIKEN format file.

    POST /api/faculty/question-banks/import-aiken/

    Input (multipart/form-data):
    - bank_name: str
    - subject_id: int
    - file: .txt file in AIKEN format
    - description: str (optional)

    Response:
    - On success: { bank_id, bank_name, questions_imported, message }
    - On failure: { errors: [{ line_number, message }] }
    """
    permission_classes = [IsAuthenticated, IsFaculty]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        from .serializers import AikenImportSerializer
        return AikenImportSerializer

    def create(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        from django.apps import apps
        from .serializers import AikenImportSerializer

        # Lazy load models from other apps to avoid circular imports
        Module = apps.get_model('academics', 'Module')
        FacultyModuleAssignment = apps.get_model(
            'faculty', 'FacultyModuleAssignment')

        try:
            serializer = AikenImportSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            data = serializer.validated_data
            faculty = request.user.faculty_profile
            subject_id = data['subject_id']

            # Verify faculty teaches this subject
            subject = Module.objects.get(id=subject_id)
            is_assigned = FacultyModuleAssignment.objects.filter(
                faculty=faculty,
                module=subject,
                is_active=True
            ).exists()

            if not is_assigned:
                return Response(
                    {'error': 'You are not assigned to teach this subject'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Read and parse file content
            uploaded_file = data['file']
            try:
                content = uploaded_file.read().decode('utf-8')
            except UnicodeDecodeError:
                return Response(
                    {'error': 'File encoding error. Please use UTF-8 encoded text file.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Parse AIKEN format
            result = parse_aiken_file(content)

            if not result.is_successful:
                return Response({
                    'error': 'Invalid AIKEN format',
                    'errors': [
                        {'line_number': e.line_number, 'message': e.message}
                        for e in result.errors
                    ]
                }, status=status.HTTP_400_BAD_REQUEST)

            if result.questions_count == 0:
                return Response(
                    {'error': 'No valid questions found in the file'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create question bank and questions in a transaction
            with transaction.atomic():
                bank = QuestionBank.objects.create(
                    name=data['bank_name'],
                    subject=subject,
                    faculty=faculty,
                    description=data.get('description', '')
                )

                # Bulk create questions
                questions = [
                    BankQuestion(
                        bank=bank,
                        question_text=q.question_text,
                        option_a=q.option_a,
                        option_b=q.option_b,
                        option_c=q.option_c,
                        option_d=q.option_d,
                        correct_option=q.correct_option
                    )
                    for q in result.questions
                ]
                BankQuestion.objects.bulk_create(questions)

            return Response({
                'bank_id': bank.id,
                'bank_name': bank.name,
                'questions_imported': result.questions_count,
                'message': f'Successfully imported {result.questions_count} questions'
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.exception("Aiken import failed")
            return Response({
                'error': 'Failed to import questions. Please check the file format and try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ImportFromBankView(generics.CreateAPIView):
    """
    Import questions from a question bank into an assessment.

    POST /api/faculty/assessments/{assessment_id}/import-from-bank/

    Input:
    - bank_id: int
    - number_of_questions: int
    - randomize: bool (default: true)
    - marks_per_question: int (default: 1)

    Response:
    - On success: { questions_imported, message }
    """
    permission_classes = [IsAuthenticated, IsFaculty,
                          IsAssessmentOwner, IsAssessmentEditable]

    def get_serializer_class(self):
        from .serializers import ImportFromBankSerializer
        return ImportFromBankSerializer

    def get_assessment(self):
        """Get the assessment from URL."""
        assessment_id = self.kwargs.get('assessment_id')
        return get_object_or_404(Assessment, id=assessment_id, is_active=True)

    def get_object(self):
        """Return assessment for permission checks."""
        return self.get_assessment()

    def create(self, request, *args, **kwargs):
        from .serializers import ImportFromBankSerializer
        from .models import QuestionBank, BankQuestion, AssessmentQuestion, AssessmentOption
        import random

        assessment = self.get_assessment()
        self.check_object_permissions(request, assessment)

        serializer = ImportFromBankSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        bank_id = data['bank_id']
        num_questions = data['number_of_questions']
        randomize = data.get('randomize', True)
        marks_per_question = data.get('marks_per_question', 1)

        # Get question bank
        bank = QuestionBank.objects.get(id=bank_id, is_active=True)

        # Verify faculty owns this bank or teaches this subject
        faculty = request.user.faculty_profile
        if bank.faculty != faculty:
            return Response(
                {'error': 'You do not have access to this question bank'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get available questions
        available_questions = list(
            BankQuestion.objects.filter(bank=bank, is_active=True)
        )

        if len(available_questions) == 0:
            return Response(
                {'error': 'No questions available in this bank'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(available_questions) < num_questions:
            return Response({
                'error': f'Requested {num_questions} questions but only {len(available_questions)} available',
                'available': len(available_questions)
            }, status=status.HTTP_400_BAD_REQUEST)

        # Select questions
        if randomize:
            selected_questions = random.sample(
                available_questions, num_questions)
        else:
            selected_questions = available_questions[:num_questions]

        # Get current max order
        current_max_order = AssessmentQuestion.objects.filter(
            assessment=assessment
        ).aggregate(max_order=models.Max('order'))['max_order'] or 0

        # Import questions into assessment
        with transaction.atomic():
            for i, bank_q in enumerate(selected_questions):
                # Create assessment question
                assessment_q = AssessmentQuestion.objects.create(
                    assessment=assessment,
                    question_text=bank_q.question_text,
                    marks=marks_per_question,
                    order=current_max_order + i + 1
                )

                # Create options
                options = [
                    AssessmentOption(
                        question=assessment_q,
                        option_label='A',
                        option_text=bank_q.option_a,
                        is_correct=(bank_q.correct_option == 'A')
                    ),
                    AssessmentOption(
                        question=assessment_q,
                        option_label='B',
                        option_text=bank_q.option_b,
                        is_correct=(bank_q.correct_option == 'B')
                    ),
                    AssessmentOption(
                        question=assessment_q,
                        option_label='C',
                        option_text=bank_q.option_c,
                        is_correct=(bank_q.correct_option == 'C')
                    ),
                    AssessmentOption(
                        question=assessment_q,
                        option_label='D',
                        option_text=bank_q.option_d,
                        is_correct=(bank_q.correct_option == 'D')
                    ),
                ]
                AssessmentOption.objects.bulk_create(options)

        return Response({
            'questions_imported': len(selected_questions),
            'message': f'Successfully imported {len(selected_questions)} questions from "{bank.name}"'
        }, status=status.HTTP_201_CREATED)
