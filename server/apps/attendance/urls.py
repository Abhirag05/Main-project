"""
URL configuration for Attendance module.

API Endpoints:
==============

Session Attendance:
- GET  /api/faculty/sessions/{session_id}/students/    - Get students with attendance status
- POST /api/faculty/sessions/{session_id}/attendance/  - Save/update attendance
- GET  /api/faculty/sessions/{session_id}/attendance/stats/ - Get attendance stats

Note: These URLs are included under the /api/faculty/ prefix in the main urls.py
"""
from django.urls import path
from .views import (
    SessionStudentsAPIView,
    SessionAttendanceAPIView,
    SessionAttendanceStatsAPIView,
)

app_name = 'attendance'

urlpatterns = [
    # Session attendance endpoints
    path('sessions/<int:session_id>/students/',
         SessionStudentsAPIView.as_view(),
         name='session-students'),
    path('sessions/<int:session_id>/attendance/',
         SessionAttendanceAPIView.as_view(),
         name='session-attendance'),
    path('sessions/<int:session_id>/attendance/stats/',
         SessionAttendanceStatsAPIView.as_view(),
         name='session-attendance-stats'),
]
