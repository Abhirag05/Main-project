"""
URL configuration for batch management APIs.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.batch_management.views import (
    BatchTemplateViewSet,
    BatchViewSet,
    CourseListView,
    MentorMyBatchesView,
    MentorBatchStudentsView,
    MentorBatchRecordedSessionsView,
)
from apps.attendance.views import MentorSessionAttendanceAPIView


app_name = 'batch_management'

# Create routers and register viewsets
template_router = DefaultRouter()
template_router.register(
    r'templates', BatchTemplateViewSet, basename='batch-template')

batch_router = DefaultRouter()
batch_router.register(r'', BatchViewSet, basename='batch')

urlpatterns = [
    # Batch Template URLs (Super Admin)
    # GET/POST    /api/batch/templates/
    # GET/PUT/DELETE /api/batch/templates/{id}/
    path('', include(template_router.urls)),

    # Additional endpoints
    # GET /api/batch/courses/
    path('courses/', CourseListView.as_view(), name='course-list'),
]

# Separate URL patterns for batch execution (Centre Admin)
batch_urlpatterns = [
    # GET /api/batches/
    # POST /api/batches/
    # GET /api/batches/{id}/
    # PATCH /api/batches/{id}/status/
    # GET /api/batches/templates/active/
    path('', include(batch_router.urls)),
]

# Mentor Dashboard URL patterns
mentor_urlpatterns = [
    # GET /api/mentor/my-batches/
    path('my-batches/', MentorMyBatchesView.as_view(), name='mentor-my-batches'),
    # GET /api/mentor/batches/{batch_id}/students/
    path('batches/<int:batch_id>/students/',
         MentorBatchStudentsView.as_view(), name='mentor-batch-students'),
    # GET /api/mentor/sessions/{session_id}/attendance/
    path('sessions/<int:session_id>/attendance/',
         MentorSessionAttendanceAPIView.as_view(), name='mentor-session-attendance'),
    # GET/POST /api/mentor/batches/{batch_id}/recordings/
    path('batches/<int:batch_id>/recordings/',
         MentorBatchRecordedSessionsView.as_view(), name='mentor-batch-recordings'),
]
