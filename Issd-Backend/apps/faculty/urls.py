"""
URL configuration for faculty management APIs.
"""
from django.urls import path
from .views import (
    FacultyListCreateAPIView,
    FacultyDetailUpdateAPIView,
    UpdateFacultyStatusAPIView,
    FacultyAvailabilityListCreateAPIView,
    AvailabilityUpdateDeleteAPIView,
    FacultyModuleAssignmentListCreateAPIView,
    FacultyModuleAssignmentDetailAPIView,
    FacultyBatchAssignmentListCreateAPIView,
    FacultyBatchAssignmentDetailAPIView,
    FacultyAssignmentSummaryAPIView,
    CheckConflictAPIView,
    FacultySelfProfileAPIView
)

urlpatterns = [
    # Faculty self-profile endpoint (must be before <int:faculty_id>/)
    path('me/', FacultySelfProfileAPIView.as_view(), name='faculty-self-profile'),

    # Faculty profile endpoints
    path('', FacultyListCreateAPIView.as_view(), name='faculty-list-create'),
    path('<int:faculty_id>/', FacultyDetailUpdateAPIView.as_view(),
         name='faculty-detail-update'),
    path('<int:faculty_id>/status/', UpdateFacultyStatusAPIView.as_view(),
         name='update-faculty-status'),

    # Faculty availability endpoints
    path('<int:faculty_id>/availability/',
         FacultyAvailabilityListCreateAPIView.as_view(), name='faculty-availability'),

    # Availability management endpoints (by availability ID)
    path('availability/<int:availability_id>/',
         AvailabilityUpdateDeleteAPIView.as_view(), name='availability-detail'),

    # Faculty module assignment endpoints
    path('module-assignments/', FacultyModuleAssignmentListCreateAPIView.as_view(),
         name='faculty-module-assignment-list-create'),
    path('module-assignments/<int:assignment_id>/',
         FacultyModuleAssignmentDetailAPIView.as_view(),
         name='faculty-module-assignment-detail'),
    # Backwards-compatible alias: subject-assignments -> module-assignments
    path('subject-assignments/', FacultyModuleAssignmentListCreateAPIView.as_view(),
         name='faculty-subject-assignment-list-create'),
    path('subject-assignments/<int:assignment_id>/',
         FacultyModuleAssignmentDetailAPIView.as_view(),
         name='faculty-subject-assignment-detail'),

    # Faculty batch assignment endpoints
    path('batch-assignments/', FacultyBatchAssignmentListCreateAPIView.as_view(),
         name='faculty-batch-assignment-list-create'),
    path('batch-assignments/<int:assignment_id>/',
         FacultyBatchAssignmentDetailAPIView.as_view(),
         name='faculty-batch-assignment-detail'),

    # Faculty assignment summary endpoint
    path('<int:faculty_id>/assignment-summary/',
         FacultyAssignmentSummaryAPIView.as_view(),
         name='faculty-assignment-summary'),

    # Timetable conflict check endpoint
    path('<int:faculty_id>/check-conflict/',
         CheckConflictAPIView.as_view(),
         name='faculty-check-conflict'),
]
