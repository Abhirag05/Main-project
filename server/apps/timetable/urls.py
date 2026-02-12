"""
URL configuration for Timetable & Course Plan module.

API Endpoints:
==============

TimeSlot (Recurring Schedules):
- GET/POST    /api/timetable/time-slots/              - List/Create time slots
- GET/PUT/DEL /api/timetable/time-slots/{id}/         - Detail/Update/Delete

ClassSession (Actual Classes):
- GET/POST    /api/timetable/sessions/                - List/Create sessions
- GET/PUT/DEL /api/timetable/sessions/{id}/           - Detail/Update/Delete
- POST        /api/timetable/sessions/bulk/           - Bulk create sessions

CoursePlan (Syllabus):
- GET/POST    /api/timetable/course-plans/            - List/Create plans
- GET/PUT/DEL /api/timetable/course-plans/{id}/       - Detail/Update/Delete
- POST        /api/timetable/course-plans/copy/       - Copy plans between batches

Utilities:
- POST        /api/timetable/check-conflict/          - Check faculty conflicts
- GET         /api/timetable/faculty/{id}/schedule/   - Faculty weekly schedule
- GET         /api/timetable/batch/{id}/timetable/    - Batch timetable view
- GET         /api/timetable/today/                   - Today's sessions
"""
from django.urls import path
from .views import (
    # TimeSlot
    TimeSlotListCreateAPIView,
    TimeSlotDetailAPIView,
    # ClassSession
    ClassSessionListCreateAPIView,
    ClassSessionDetailAPIView,
    BulkSessionCreateAPIView,
    BatchSessionsGenerateAPIView,
    # CoursePlan
    CoursePlanListCreateAPIView,
    CoursePlanDetailAPIView,
    BulkCoursePlanCreateAPIView,
    # Utilities
    FacultyConflictCheckAPIView,
    FacultyScheduleAPIView,
    BatchTimetableAPIView,
    TodaySessionsAPIView,
)

app_name = 'timetable'

urlpatterns = [
    # TimeSlot endpoints
    path('time-slots/', TimeSlotListCreateAPIView.as_view(),
         name='timeslot-list-create'),
    path('time-slots/<int:pk>/', TimeSlotDetailAPIView.as_view(),
         name='timeslot-detail'),

    # ClassSession endpoints
    path('sessions/', ClassSessionListCreateAPIView.as_view(),
         name='session-list-create'),
    path('sessions/<int:pk>/', ClassSessionDetailAPIView.as_view(),
         name='session-detail'),
    path('sessions/bulk/', BulkSessionCreateAPIView.as_view(),
         name='session-bulk-create'),
    path('batch/<int:batch_id>/generate-sessions/',
         BatchSessionsGenerateAPIView.as_view(), name='batch-generate-sessions'),

    # CoursePlan endpoints
    path('course-plans/', CoursePlanListCreateAPIView.as_view(),
         name='courseplan-list-create'),
    path('course-plans/<int:pk>/', CoursePlanDetailAPIView.as_view(),
         name='courseplan-detail'),
    path('course-plans/copy/', BulkCoursePlanCreateAPIView.as_view(),
         name='courseplan-copy'),

    # Utility endpoints
    path('check-conflict/', FacultyConflictCheckAPIView.as_view(),
         name='check-conflict'),
    path('faculty/me/schedule/',
         FacultyScheduleAPIView.as_view(), {'faculty_id': 'me'}, name='faculty-schedule-me'),
    path('faculty/<int:faculty_id>/schedule/',
         FacultyScheduleAPIView.as_view(), name='faculty-schedule'),
    path('batch/<int:batch_id>/timetable/',
         BatchTimetableAPIView.as_view(), name='batch-timetable'),
    path('today/', TodaySessionsAPIView.as_view(), name='today-sessions'),
]
