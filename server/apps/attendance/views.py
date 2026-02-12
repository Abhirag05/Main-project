"""
API Views for Attendance module.

Implements RESTful endpoints for:
- Getting students for a session (with attendance status)
- Saving/updating attendance for a session

Access Control:
- Only FACULTY role can mark attendance
- Faculty must be assigned to the session's time slot
- Batch must be LIVE mode
- Time window restrictions apply
"""
from apps.batch_management.models import BatchMentorAssignment
from rest_framework import permissions as drf_permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from common.permissions import IsStudent
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import Attendance
from .serializers import (
    SessionStudentListSerializer,
    BulkAttendanceSerializer,
    AttendanceStatsSerializer,
    SessionAttendanceDetailSerializer,
)
from .permissions import IsFacultyForSession, CanMarkAttendance
from apps.timetable.models import ClassSession
from apps.batch_management.models import BatchStudent
from apps.audit.services import AuditService


class SessionStudentsAPIView(APIView):
    """
    GET /api/faculty/sessions/{session_id}/students/

    Returns list of students enrolled in the session's batch,
    along with their current attendance status (if already marked).

    Response:
    {
        "session_id": 1,
        "batch_code": "FSWD-2025-01",
        "module_name": "Python Fundamentals",
        "session_date": "2025-01-22",
        "start_time": "10:00:00",
        "end_time": "12:00:00",
        "is_marking_allowed": true,
        "marking_message": "Attendance marking is allowed",
        "stats": {
            "total_enrolled": 25,
            "present_count": 20,
            "absent_count": 3,
            "not_marked": 2,
            "attendance_percentage": 86.96
        },
        "students": [
            {
                "student_id": 1,
                "full_name": "John Doe",
                "email": "john@example.com",
                "roll_no": "STU-0001",
                "current_attendance_status": "PRESENT"
            },
            ...
        ]
    }
    """
    permission_classes = [IsAuthenticated, IsFacultyForSession]

    def get(self, request, session_id):
        """Get students for a session with attendance status."""
        # Get the session
        session = get_object_or_404(
            ClassSession.objects.select_related(
                'time_slot',
                'time_slot__batch',
                'time_slot__batch__template',
                'time_slot__module',
                'time_slot__faculty',
                'time_slot__faculty__user'
            ),
            id=session_id
        )

        # Check object-level permission (faculty assigned to session)
        self.check_object_permissions(request, session)

        batch = session.time_slot.batch

        # Check if batch is LIVE mode
        if batch.template.mode != 'LIVE':
            return Response(
                {
                    'error': f'Attendance is only available for LIVE batches. This batch is {batch.template.mode}.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get enrolled students
        enrolled_students = BatchStudent.objects.filter(
            batch=batch,
            is_active=True
        ).select_related('student', 'student__user').order_by('student__user__full_name')

        # Get existing attendance records for this session
        attendance_records = Attendance.objects.filter(
            session=session
        ).values('student_id', 'status')

        attendance_map = {
            record['student_id']: record['status']
            for record in attendance_records
        }

        # Build student list with attendance status
        students_data = []
        for enrollment in enrolled_students:
            student = enrollment.student
            students_data.append({
                'student_id': student.id,
                'full_name': student.user.full_name,
                'email': student.user.email,
                # Or use actual roll_no if available
                'roll_no': f"STU-{student.id:04d}",
                'current_attendance_status': attendance_map.get(student.id, None)
            })

        # Get marking status
        is_allowed, marking_message = Attendance.is_marking_allowed(session)

        # Calculate stats
        total_enrolled = len(students_data)
        present_count = sum(
            1 for s in students_data if s['current_attendance_status'] == 'PRESENT')
        absent_count = sum(
            1 for s in students_data if s['current_attendance_status'] == 'ABSENT')
        not_marked = total_enrolled - present_count - absent_count

        attendance_percentage = 0
        if present_count + absent_count > 0:
            attendance_percentage = round(
                (present_count / (present_count + absent_count)) * 100, 2)

        response_data = {
            'session_id': session.id,
            'batch_code': batch.code,
            'batch_id': batch.id,
            'module_name': session.time_slot.module.name if session.time_slot.module else 'N/A',
            'module_code': session.time_slot.module.code if session.time_slot.module else 'N/A',
            'session_date': session.session_date,
            'start_time': session.get_start_time(),
            'end_time': session.get_end_time(),
            'is_marking_allowed': is_allowed,
            'marking_message': marking_message,
            'stats': {
                'total_enrolled': total_enrolled,
                'present_count': present_count,
                'absent_count': absent_count,
                'not_marked': not_marked,
                'attendance_percentage': attendance_percentage
            },
            'students': students_data
        }

        return Response(response_data)


class SessionAttendanceAPIView(APIView):
    """
    POST /api/faculty/sessions/{session_id}/attendance/

    Save or update attendance for a session.

    Request Body:
    {
        "attendance": [
            {"student_id": 1, "status": "PRESENT"},
            {"student_id": 2, "status": "ABSENT"},
            ...
        ]
    }

    Response:
    {
        "message": "Attendance saved successfully",
        "created": 20,
        "updated": 5,
        "records": [
            {"student_id": 1, "status": "PRESENT", "is_new": true},
            ...
        ]
    }
    """
    permission_classes = [IsAuthenticated, CanMarkAttendance]

    def post(self, request, session_id):
        """Save or update attendance for a session."""
        # Get the session
        session = get_object_or_404(
            ClassSession.objects.select_related(
                'time_slot',
                'time_slot__batch',
                'time_slot__batch__template',
                'time_slot__module',
                'time_slot__faculty',
                'time_slot__faculty__user'
            ),
            id=session_id
        )

        # Check object-level permission
        self.check_object_permissions(request, session)

        # Validate and save attendance
        serializer = BulkAttendanceSerializer(
            data=request.data,
            context={
                'session': session,
                'request': request
            }
        )

        if serializer.is_valid():
            result = serializer.save()

            # Create audit log
            AuditService.log(
                action='ATTENDANCE_MARKED',
                entity='BatchSession',
                entity_id=session.id,
                performed_by=request.user,
                details={
                    'batch_code': session.time_slot.batch.code,
                    'module_name': session.time_slot.module.name if session.time_slot.module else 'N/A',
                    'session_date': str(session.session_date),
                    'records_created': result['created'],
                    'records_updated': result['updated'],
                    'total_records': len(result['records'])
                }
            )

            return Response({
                'message': 'Attendance saved successfully',
                'created': result['created'],
                'updated': result['updated'],
                'records': result['records']
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SessionAttendanceStatsAPIView(APIView):
    """
    GET /api/faculty/sessions/{session_id}/attendance/stats/

    Get attendance statistics for a session.

    Response:
    {
        "total_enrolled": 25,
        "present_count": 20,
        "absent_count": 3,
        "not_marked": 2,
        "attendance_percentage": 86.96
    }
    """
    permission_classes = [IsAuthenticated, IsFacultyForSession]

    def get(self, request, session_id):
        """Get attendance statistics for a session."""
        session = get_object_or_404(ClassSession, id=session_id)
        self.check_object_permissions(request, session)

        stats = Attendance.get_session_attendance_stats(session)

        # Calculate attendance percentage
        marked_count = stats['present_count'] + stats['absent_count']
        if marked_count > 0:
            stats['attendance_percentage'] = round(
                (stats['present_count'] / marked_count) * 100, 2
            )
        else:
            stats['attendance_percentage'] = 0

        return Response(stats)


# ==========================================
# Batch Mentor Attendance Views (Read-Only)
# ==========================================


class IsBatchMentorForSession(drf_permissions.BasePermission):
    """
    Permission class for Batch Mentor to view session attendance.
    Mentor must be assigned to the session's batch.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, 'role') or not request.user.role:
            return False

        return request.user.role.code == 'BATCH_MENTOR'

    def has_object_permission(self, request, view, obj):
        """Check if mentor is assigned to session's batch."""
        batch = obj.time_slot.batch
        return BatchMentorAssignment.objects.filter(
            mentor=request.user,
            batch=batch,
            is_active=True
        ).exists()


class MentorSessionAttendanceAPIView(APIView):
    """
    GET /api/mentor/sessions/{session_id}/attendance/

    Get attendance details for a session (batch mentor view).

    Response:
    {
        "session_id": 1,
        "batch_code": "FSWD-2025-01",
        "module_name": "Python Fundamentals",
        "faculty_name": "John Faculty",
        "session_date": "2025-01-22",
        "start_time": "10:00:00",
        "end_time": "12:00:00",
        "stats": {
            "total_enrolled": 25,
            "present_count": 20,
            "absent_count": 3,
            "not_marked": 2,
            "attendance_percentage": 86.96
        },
        "students": [
            {
                "student_id": 1,
                "full_name": "John Doe",
                "email": "john@example.com",
                "status": "PRESENT"
            },
            ...
        ]
    }
    """
    permission_classes = [IsAuthenticated, IsBatchMentorForSession]

    def get(self, request, session_id):
        """Get attendance for a session."""
        session = get_object_or_404(
            ClassSession.objects.select_related(
                'time_slot',
                'time_slot__batch',
                'time_slot__module',
                'time_slot__faculty',
                'time_slot__faculty__user'
            ),
            id=session_id
        )

        self.check_object_permissions(request, session)

        batch = session.time_slot.batch

        # Get enrolled students
        enrolled_students = BatchStudent.objects.filter(
            batch=batch,
            is_active=True
        ).select_related('student', 'student__user').order_by('student__user__full_name')

        # Get existing attendance records
        attendance_records = Attendance.objects.filter(
            session=session
        ).values('student_id', 'status')

        attendance_map = {
            record['student_id']: record['status']
            for record in attendance_records
        }

        # Build student list with attendance
        students_data = []
        for enrollment in enrolled_students:
            student = enrollment.student
            students_data.append({
                'student_id': student.id,
                'full_name': student.user.full_name,
                'email': student.user.email,
                'status': attendance_map.get(student.id, None)
            })

        # Calculate stats
        total_enrolled = len(students_data)
        present_count = sum(
            1 for s in students_data if s['status'] == 'PRESENT')
        absent_count = sum(1 for s in students_data if s['status'] == 'ABSENT')
        not_marked = total_enrolled - present_count - absent_count

        attendance_percentage = 0
        if present_count + absent_count > 0:
            attendance_percentage = round(
                (present_count / (present_count + absent_count)) * 100, 2)

        response_data = {
            'session_id': session.id,
            'batch_code': batch.code,
            'module_name': session.time_slot.module.name if session.time_slot.module else 'N/A',
            'faculty_name': session.time_slot.faculty.user.full_name if session.time_slot.faculty else 'N/A',
            'session_date': session.session_date,
            'start_time': session.get_start_time(),
            'end_time': session.get_end_time(),
            'stats': {
                'total_enrolled': total_enrolled,
                'present_count': present_count,
                'absent_count': absent_count,
                'not_marked': not_marked,
                'attendance_percentage': attendance_percentage
            },
            'students': students_data
        }

        return Response(response_data)


class StudentAttendanceAPIView(APIView):
    """
    GET /api/student/attendance/

    Returns a list of class sessions for the student's active batch(es)
    with the student's attendance status for each session.
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request):
        # Get student profile
        user = request.user
        if not hasattr(user, 'student_profile'):
            return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

        student_profile = user.student_profile

        # Get active enrollments
        enrollments = BatchStudent.objects.filter(
            student=student_profile, is_active=True).select_related('batch')

        if not enrollments.exists():
            return Response({'attendance': []})

        attendance_list = []

        # Batch-fetch all sessions and attendance to avoid N+1 queries
        batch_ids = list(enrollments.values_list('batch_id', flat=True))

        sessions = ClassSession.objects.filter(
            time_slot__batch_id__in=batch_ids
        ).select_related(
            'time_slot', 'time_slot__module', 'time_slot__batch'
        ).order_by('session_date')

        # Fetch all attendance records for this student in one query
        session_ids = [s.id for s in sessions]
        attendance_records = Attendance.objects.filter(
            session_id__in=session_ids,
            student=student_profile
        ).values('session_id', 'status')
        attendance_map = {r['session_id']: r['status'] for r in attendance_records}

        for session in sessions:
            batch = session.time_slot.batch
            attendance_list.append({
                'session_id': session.id,
                'batch_code': batch.code,
                'module_name': session.time_slot.module.name if session.time_slot.module else 'N/A',
                'session_date': session.session_date,
                'scheduled_start': session.get_start_time(),
                'scheduled_end': session.get_end_time(),
                'status': session.status,
                'topic': session.topic,
                'attendance_status': attendance_map.get(session.id, None),
            })

        return Response({'attendance': attendance_list})
