from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FacultyAssignmentViewSet,
    FacultyEvaluateSubmissionView,
    FacultyBatchSkillsView,
    StudentAssignmentListView,
    StudentSubmitAssignmentView,
    StudentSubmissionListView,
    StudentSubmissionDetailView,
)

# Router for faculty assignment viewset
router = DefaultRouter()
router.register(r'faculty/assignments', FacultyAssignmentViewSet, basename='faculty-assignment')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Faculty URLs
    path('faculty/submissions/<int:pk>/evaluate/', 
         FacultyEvaluateSubmissionView.as_view(), 
         name='faculty-evaluate-submission'),
    
    path('faculty/batches/<int:batch_id>/skills/',
         FacultyBatchSkillsView.as_view(),
         name='faculty-batch-skills'),
    
    # Student URLs
    path('student/assignments/', 
         StudentAssignmentListView.as_view(), 
         name='student-assignment-list'),
    
    path('student/assignments/<int:pk>/submit/', 
         StudentSubmitAssignmentView.as_view(), 
         name='student-submit-assignment'),
    
    path('student/submissions/', 
         StudentSubmissionListView.as_view(), 
         name='student-submission-list'),
    
    path('student/submissions/<int:pk>/', 
         StudentSubmissionDetailView.as_view(), 
         name='student-submission-detail'),
]
