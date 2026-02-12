"""
Serializers for Attendance module.

Handles serialization/deserialization for attendance records.
"""
from rest_framework import serializers
from django.db import transaction
from django.utils import timezone

from .models import Attendance
from apps.timetable.models import ClassSession
from apps.students.models import StudentProfile
from apps.batch_management.models import BatchStudent


class StudentForAttendanceSerializer(serializers.ModelSerializer):
    """
    Serializer for student information in attendance context.
    """
    student_id = serializers.IntegerField(source='student.id', read_only=True)
    full_name = serializers.CharField(source='student.user.full_name', read_only=True)
    email = serializers.CharField(source='student.user.email', read_only=True)
    roll_no = serializers.SerializerMethodField()

    class Meta:
        model = BatchStudent
        fields = ['student_id', 'full_name', 'email', 'roll_no']

    def get_roll_no(self, obj):
        """
        Get roll number if available.
        Currently returns None - can be extended when roll_no is added to model.
        """
        # Roll number could be stored on BatchStudent or StudentProfile
        # For now, return the student profile ID as a fallback
        return f"STU-{obj.student.id:04d}"


class SessionStudentListSerializer(serializers.Serializer):
    """
    Serializer for listing students with their attendance status for a session.
    """
    student_id = serializers.IntegerField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    roll_no = serializers.CharField(allow_null=True)
    current_attendance_status = serializers.ChoiceField(
        choices=[('PRESENT', 'Present'), ('ABSENT', 'Absent'), (None, 'Not Marked')],
        allow_null=True
    )


class AttendanceRecordSerializer(serializers.ModelSerializer):
    """
    Serializer for individual attendance records.
    """
    student_name = serializers.CharField(source='student.user.full_name', read_only=True)
    marked_by_name = serializers.CharField(source='marked_by.full_name', read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id',
            'session',
            'student',
            'student_name',
            'status',
            'marked_by',
            'marked_by_name',
            'marked_at',
            'created_at'
        ]
        read_only_fields = ['id', 'marked_by', 'marked_at', 'created_at']


class AttendanceItemSerializer(serializers.Serializer):
    """
    Serializer for a single attendance item in the save payload.
    """
    student_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=['PRESENT', 'ABSENT'])


class BulkAttendanceSerializer(serializers.Serializer):
    """
    Serializer for bulk attendance save/update.
    
    Expects a list of {student_id, status} objects.
    """
    attendance = serializers.ListField(
        child=AttendanceItemSerializer(),
        allow_empty=False,
        help_text="List of attendance records to save"
    )

    def validate(self, data):
        """
        Validate the attendance data.
        
        Checks:
        1. All students belong to the session's batch
        2. No duplicate student IDs
        3. Session allows attendance marking (time window)
        4. Batch is LIVE mode
        """
        session = self.context.get('session')
        if not session:
            raise serializers.ValidationError("Session context is required")

        attendance_list = data['attendance']
        student_ids = [item['student_id'] for item in attendance_list]

        # Check for duplicates
        if len(student_ids) != len(set(student_ids)):
            raise serializers.ValidationError({
                'attendance': "Duplicate student IDs found in the request"
            })

        # Check time window
        is_allowed, reason = Attendance.is_marking_allowed(session)
        if not is_allowed:
            raise serializers.ValidationError({
                'session': reason
            })

        # Check batch mode is LIVE
        batch = session.time_slot.batch
        if batch.template.mode != 'LIVE':
            raise serializers.ValidationError({
                'session': f"Attendance can only be marked for LIVE batches. This batch is {batch.template.mode}."
            })

        # Verify all students belong to the batch
        enrolled_students = set(
            BatchStudent.objects.filter(
                batch=batch,
                is_active=True
            ).values_list('student_id', flat=True)
        )

        invalid_students = set(student_ids) - enrolled_students
        if invalid_students:
            raise serializers.ValidationError({
                'attendance': f"Students not enrolled in this batch: {list(invalid_students)}"
            })

        return data

    @transaction.atomic
    def create(self, validated_data):
        """
        Create or update attendance records.
        
        Uses upsert logic - creates new records or updates existing ones.
        """
        session = self.context['session']
        user = self.context['request'].user
        attendance_list = validated_data['attendance']
        
        results = {
            'created': 0,
            'updated': 0,
            'records': []
        }

        for item in attendance_list:
            student_id = item['student_id']
            status = item['status']

            attendance, created = Attendance.objects.update_or_create(
                session=session,
                student_id=student_id,
                defaults={
                    'status': status,
                    'marked_by': user
                }
            )

            if created:
                results['created'] += 1
            else:
                results['updated'] += 1

            results['records'].append({
                'student_id': student_id,
                'status': status,
                'is_new': created
            })

        return results


class AttendanceStatsSerializer(serializers.Serializer):
    """
    Serializer for attendance statistics.
    """
    total_enrolled = serializers.IntegerField()
    present_count = serializers.IntegerField()
    absent_count = serializers.IntegerField()
    not_marked = serializers.IntegerField()
    attendance_percentage = serializers.FloatField()


class SessionAttendanceDetailSerializer(serializers.Serializer):
    """
    Detailed serializer for session attendance view.
    """
    session_id = serializers.IntegerField()
    batch_code = serializers.CharField()
    module_name = serializers.CharField()
    session_date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    is_marking_allowed = serializers.BooleanField()
    marking_message = serializers.CharField()
    stats = AttendanceStatsSerializer()
    students = SessionStudentListSerializer(many=True)
