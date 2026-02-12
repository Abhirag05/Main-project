"""
Assessment URLs configuration.

URL patterns for both Faculty and Student assessment endpoints.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    # Faculty views
    FacultyAssessmentViewSet,
    FacultyQuestionViewSet,
    FacultyBatchesView,
    FacultyBatchSubjectsView,
    CourseSkillsView,
    QuestionBankViewSet,
    AikenImportView,
    ImportFromBankView,
    # Student views
    StudentAvailableAssessmentsView,
    StudentAssessmentDetailView,
    StudentStartAssessmentView,
    StudentSubmitAssessmentView,
    StudentMyAttemptsView,
    StudentAttemptDetailView,
    StudentMySkillsView,
    StudentSkillBreakdownView,
)

# Router for faculty assessment management
faculty_router = DefaultRouter()
faculty_router.register(
    r'assessments', FacultyAssessmentViewSet, basename='faculty-assessments')
faculty_router.register(
    r'question-banks', QuestionBankViewSet, basename='faculty-question-banks')

# Faculty URL patterns
faculty_urlpatterns = [
    # Question bank import - MUST be before router to avoid conflict
    path(
        'question-banks/import-aiken/',
        AikenImportView.as_view(),
        name='question-bank-import-aiken'
    ),

    # Import questions from bank to assessment - MUST be before router
    path(
        'assessments/<int:assessment_id>/import-from-bank/',
        ImportFromBankView.as_view(),
        name='assessment-import-from-bank'
    ),

    # Faculty assessment CRUD (router)
    path('', include(faculty_router.urls)),

    # Faculty batches
    path('me/batches/', FacultyBatchesView.as_view(), name='faculty-batches'),

    # Assessment questions (nested under assessment)
    path(
        'assessments/<int:assessment_id>/questions/',
        FacultyQuestionViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='assessment-questions-list'
    ),
    path(
        'assessments/<int:assessment_id>/questions/<int:pk>/',
        FacultyQuestionViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='assessment-questions-detail'
    ),
]

# Student URL patterns
student_urlpatterns = [
    # Available assessments
    path('assessments/', StudentAvailableAssessmentsView.as_view(),
         name='student-assessments'),
    path('assessments/<int:pk>/', StudentAssessmentDetailView.as_view(),
         name='student-assessment-detail'),

    # Assessment operations
    path('assessments/<int:pk>/start/',
         StudentStartAssessmentView.as_view(), name='student-assessment-start'),
    path('assessments/<int:pk>/submit/',
         StudentSubmitAssessmentView.as_view(), name='student-assessment-submit'),

    # My attempts and results
    path('my-attempts/', StudentMyAttemptsView.as_view(),
         name='student-my-attempts'),
    path('attempts/<int:pk>/', StudentAttemptDetailView.as_view(),
         name='student-attempt-detail'),
    # Student skills
    path('my-skills/', StudentMySkillsView.as_view(), name='student-my-skills'),
    path('my-skills/<int:skill_id>/breakdown/',
         StudentSkillBreakdownView.as_view(), name='student-skill-breakdown'),
]

# Batch URL patterns
batch_urlpatterns = [
    path('<int:batch_id>/subjects/',
         FacultyBatchSubjectsView.as_view(), name='batch-subjects'),
]

# Academic URL patterns
academic_urlpatterns = [
    # Course skills (fetched from Course.skills JSONField)
    path('courses/<int:course_id>/skills/',
         CourseSkillsView.as_view(), name='course-skills'),
]

# Main URL patterns to be included in config/urls.py
urlpatterns = [
    path('faculty/', include(faculty_urlpatterns)),
    path('student/', include(student_urlpatterns)),
    path('batch/', include(batch_urlpatterns)),
    path('academics/', include(academic_urlpatterns)),
]
