"""
Serializers for Timetable & Course Plan module.

Handles serialization/deserialization for:
- TimeSlot (recurring weekly schedules)
- ClassSession (actual class instances)
- CoursePlan (structured syllabus)

All serializers include proper validation and nested representations.
"""
from rest_framework import serializers
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from datetime import datetime, timedelta

from .models import TimeSlot, ClassSession, CoursePlan
from apps.batch_management.models import Batch
from apps.academics.models import Module
from apps.faculty.models import FacultyProfile


# ==========================================
# Nested Serializers (Read-Only)
# ==========================================

class BatchMinimalSerializer(serializers.ModelSerializer):
    """Minimal batch info for nested responses."""
    course_name = serializers.CharField(
        source='template.course.name', read_only=True)

    class Meta:
        model = Batch
        fields = ['id', 'code', 'course_name',
                  'start_date', 'end_date', 'status']


class ModuleMinimalSerializer(serializers.ModelSerializer):
    """Minimal module info for nested responses."""
    class Meta:
        model = Module
        fields = ['id', 'code', 'name']


class FacultyMinimalSerializer(serializers.ModelSerializer):
    """Minimal faculty info for nested responses."""
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = FacultyProfile
        fields = ['id', 'employee_code', 'full_name', 'email']


# ==========================================
# TimeSlot Serializers
# ==========================================

class TimeSlotListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing time slots.
    Includes nested batch, subject, and faculty info.
    """
    batch_detail = BatchMinimalSerializer(source='batch', read_only=True)
    module_detail = ModuleMinimalSerializer(source='module', read_only=True)
    faculty_detail = FacultyMinimalSerializer(source='faculty', read_only=True)
    day_name = serializers.SerializerMethodField()

    class Meta:
        model = TimeSlot
        fields = [
            'id',
            'batch',
            'batch_detail',
            'module',
            'module_detail',
            'faculty',
            'faculty_detail',
            'day_of_week',
            'day_name',
            'start_time',
            'end_time',
            'room_number',
            'default_meeting_link',
            'is_active',
            'created_at',
            'updated_at'
        ]

    def get_day_name(self, obj):
        """Return human-readable day name."""
        return dict(TimeSlot.WEEKDAY_CHOICES).get(obj.day_of_week, '')


class TimeSlotCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating time slots.
    Includes conflict detection validation (FR-FAC-04).
    """
    class Meta:
        model = TimeSlot
        fields = [
            'batch',
            'module',
            'faculty',
            'day_of_week',
            'start_time',
            'end_time',
            'room_number',
            'default_meeting_link'
        ]

    def validate(self, data):
        """
        Validate time slot:
        1. End time must be after start time
        2. Faculty must not have conflicts (FR-FAC-04)
        3. Module must be part of batch's course curriculum
        """
        # Time validation
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time.'
            })

        # Faculty conflict check (FR-FAC-04)
        has_conflict, conflicts = TimeSlot.check_faculty_conflict(
            faculty_id=data['faculty'].id,
            day_of_week=data['day_of_week'],
            start_time=data['start_time'],
            end_time=data['end_time']
        )

        if has_conflict:
            conflict = conflicts.first()
            day_name = dict(TimeSlot.WEEKDAY_CHOICES).get(
                conflict.day_of_week, '')
            raise serializers.ValidationError({
                'faculty': f"Faculty has a conflicting slot: {conflict.batch.code} on {day_name} {conflict.start_time.strftime('%H:%M')}-{conflict.end_time.strftime('%H:%M')}"
            })

        # Verify faculty is assigned to this batch
        faculty = data['faculty']
        batch = data['batch']
        if not faculty.batch_assignments.filter(batch=batch, is_active=True).exists():
            raise serializers.ValidationError({
                'faculty': f"Faculty {faculty.employee_code} is not assigned to batch {batch.code}. Please assign faculty to batch first."
            })

        return data

    def create(self, validated_data):
        """Create time slot with created_by tracking."""
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class TimeSlotUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating time slots.
    Limited fields can be updated.
    """
    class Meta:
        model = TimeSlot
        fields = [
            'faculty',
            'day_of_week',
            'start_time',
            'end_time',
            'room_number',
            'default_meeting_link',
            'is_active'
        ]

    def validate(self, data):
        """Validate updates with conflict detection."""
        instance = self.instance

        # Use provided values or existing ones
        start_time = data.get('start_time', instance.start_time)
        end_time = data.get('end_time', instance.end_time)
        day_of_week = data.get('day_of_week', instance.day_of_week)
        faculty = data.get('faculty', instance.faculty)

        # Time validation
        if start_time >= end_time:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time.'
            })

        # Faculty conflict check (excluding this slot)
        has_conflict, conflicts = TimeSlot.check_faculty_conflict(
            faculty_id=faculty.id,
            day_of_week=day_of_week,
            start_time=start_time,
            end_time=end_time,
            exclude_id=instance.id
        )

        if has_conflict:
            conflict = conflicts.first()
            day_name = dict(TimeSlot.WEEKDAY_CHOICES).get(
                conflict.day_of_week, '')
            raise serializers.ValidationError({
                'faculty': f"Faculty has a conflicting slot: {conflict.batch.code} on {day_name} {conflict.start_time.strftime('%H:%M')}-{conflict.end_time.strftime('%H:%M')}"
            })

        return data


class TimeSlotDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for a single time slot.
    Includes sessions count and next session info.
    """
    batch_detail = BatchMinimalSerializer(source='batch', read_only=True)
    module_detail = ModuleMinimalSerializer(source='module', read_only=True)
    faculty_detail = FacultyMinimalSerializer(source='faculty', read_only=True)
    day_name = serializers.SerializerMethodField()
    sessions_count = serializers.SerializerMethodField()
    upcoming_sessions = serializers.SerializerMethodField()

    class Meta:
        model = TimeSlot
        fields = [
            'id',
            'batch',
            'batch_detail',
            'module',
            'module_detail',
            'faculty',
            'faculty_detail',
            'day_of_week',
            'day_name',
            'start_time',
            'end_time',
            'room_number',
            'default_meeting_link',
            'is_active',
            'sessions_count',
            'upcoming_sessions',
            'created_at',
            'updated_at'
        ]

    def get_day_name(self, obj):
        return dict(TimeSlot.WEEKDAY_CHOICES).get(obj.day_of_week, '')

    def get_sessions_count(self, obj):
        return obj.sessions.count()

    def get_upcoming_sessions(self, obj):
        from django.utils import timezone
        upcoming = obj.sessions.filter(
            session_date__gte=timezone.now().date(),
            status=ClassSession.Status.SCHEDULED
        ).order_by('session_date')[:3]
        return ClassSessionMinimalSerializer(upcoming, many=True).data


# ==========================================
# ClassSession Serializers
# ==========================================

class ClassSessionMinimalSerializer(serializers.ModelSerializer):
    """Minimal session info for nested responses."""
    class Meta:
        model = ClassSession
        fields = ['id', 'session_date', 'status', 'topic']


class ClassSessionListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing class sessions.
    """
    batch_code = serializers.CharField(
        source='time_slot.batch.code', read_only=True)
    module_name = serializers.CharField(
        source='time_slot.module.name', read_only=True)
    faculty_name = serializers.CharField(
        source='time_slot.faculty.user.full_name', read_only=True)
    scheduled_start = serializers.TimeField(
        source='time_slot.start_time', read_only=True)
    scheduled_end = serializers.TimeField(
        source='time_slot.end_time', read_only=True)
    effective_meeting_link = serializers.SerializerMethodField()
    attendance_marked = serializers.SerializerMethodField()

    class Meta:
        model = ClassSession
        fields = [
            'id',
            'time_slot',
            'batch_code',
            'module_name',
            'faculty_name',
            'session_date',
            'scheduled_start',
            'scheduled_end',
            'actual_start_time',
            'actual_end_time',
            'status',
            'topic',
            'effective_meeting_link',
            'recording_link',
            'attendance_marked'
        ]

    def get_effective_meeting_link(self, obj):
        return obj.get_meeting_link()

    def get_attendance_marked(self, obj):
        """Check if attendance has been marked for this session."""
        return obj.attendance_records.exists()


class ClassSessionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating class sessions.
    Can create single session or bulk sessions for a date range.
    """
    class Meta:
        model = ClassSession
        fields = [
            'time_slot',
            'session_date',
            'topic',
            'course_plan',
            'meeting_link',
            'notes'
        ]

    def validate(self, data):
        """Validate session date is within batch duration."""
        time_slot = data['time_slot']
        session_date = data['session_date']
        batch = time_slot.batch

        # Check if session date is within batch duration
        if session_date < batch.start_date or session_date > batch.end_date:
            raise serializers.ValidationError({
                'session_date': f"Session date must be within batch duration ({batch.start_date} to {batch.end_date})"
            })

        # Check if session date matches time slot day
        if session_date.isoweekday() != time_slot.day_of_week:
            expected_day = dict(TimeSlot.WEEKDAY_CHOICES).get(
                time_slot.day_of_week, '')
            actual_day = session_date.strftime('%A')
            raise serializers.ValidationError({
                'session_date': f"Session date ({actual_day}) doesn't match time slot day ({expected_day})"
            })

        return data


class ClassSessionUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating class sessions.
    """
    class Meta:
        model = ClassSession
        fields = [
            'actual_start_time',
            'actual_end_time',
            'status',
            'topic',
            'course_plan',
            'meeting_link',
            'recording_link',
            'notes',
            'cancellation_reason'
        ]

    def validate(self, data):
        """Validate status transitions and cancellation reasons."""
        instance = self.instance
        new_status = data.get('status', instance.status)

        # If cancelling, require cancellation reason
        if new_status == ClassSession.Status.CANCELLED:
            if not data.get('cancellation_reason') and not instance.cancellation_reason:
                raise serializers.ValidationError({
                    'cancellation_reason': 'Cancellation reason is required when cancelling a session.'
                })

        return data


class ClassSessionDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for a single class session.
    """
    time_slot_detail = TimeSlotListSerializer(
        source='time_slot', read_only=True)
    course_plan_detail = serializers.SerializerMethodField()
    effective_meeting_link = serializers.SerializerMethodField()
    effective_start_time = serializers.SerializerMethodField()
    effective_end_time = serializers.SerializerMethodField()

    class Meta:
        model = ClassSession
        fields = [
            'id',
            'time_slot',
            'time_slot_detail',
            'session_date',
            'actual_start_time',
            'actual_end_time',
            'effective_start_time',
            'effective_end_time',
            'status',
            'topic',
            'course_plan',
            'course_plan_detail',
            'meeting_link',
            'effective_meeting_link',
            'recording_link',
            'notes',
            'cancellation_reason',
            'created_at',
            'updated_at'
        ]

    def get_course_plan_detail(self, obj):
        if obj.course_plan:
            return CoursePlanMinimalSerializer(obj.course_plan).data
        return None

    def get_effective_meeting_link(self, obj):
        return obj.get_meeting_link()

    def get_effective_start_time(self, obj):
        return obj.get_start_time()

    def get_effective_end_time(self, obj):
        return obj.get_end_time()


class BulkSessionCreateSerializer(serializers.Serializer):
    """
    Serializer for bulk creating sessions for a time slot.
    Generates sessions for all matching days in a date range.
    """
    time_slot = serializers.PrimaryKeyRelatedField(
        queryset=TimeSlot.objects.all())
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    auto_generate = serializers.BooleanField(
        default=False,
        help_text="If True, use batch's full duration automatically"
    )

    def validate(self, data):
        """Validate date range."""
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })

        time_slot = data['time_slot']
        batch = time_slot.batch

        # Constrain to batch duration
        if data['start_date'] < batch.start_date:
            data['start_date'] = batch.start_date
        if data['end_date'] > batch.end_date:
            data['end_date'] = batch.end_date

        return data

    def create(self, validated_data):
        """Generate sessions for all matching days."""
        time_slot = validated_data['time_slot']
        start_date = validated_data['start_date']
        end_date = validated_data['end_date']

        sessions_created = []
        current_date = start_date

        while current_date <= end_date:
            # Check if this date matches the time slot's day
            if current_date.isoweekday() == time_slot.day_of_week:
                # Create session if it doesn't exist
                session, created = ClassSession.objects.get_or_create(
                    time_slot=time_slot,
                    session_date=current_date,
                    defaults={'status': ClassSession.Status.SCHEDULED}
                )
                if created:
                    sessions_created.append(session)

            current_date += timedelta(days=1)

        return sessions_created


class BatchSessionsGenerateSerializer(serializers.Serializer):
    """
    Serializer for generating all sessions for a batch's entire duration.
    Uses all active time slots of the batch.
    """
    batch = serializers.PrimaryKeyRelatedField(
        queryset=Batch.objects.all(),
        help_text="Batch to generate sessions for"
    )
    start_date = serializers.DateField(
        required=False,
        help_text="Start date (defaults to batch start date or today)"
    )
    end_date = serializers.DateField(
        required=False,
        help_text="End date (defaults to batch end date)"
    )

    def validate(self, data):
        """Validate and set default dates."""
        batch = data['batch']
        today = timezone.now().date()

        # Default to batch dates
        if 'start_date' not in data or data['start_date'] is None:
            # Use today if batch has already started
            data['start_date'] = max(batch.start_date, today)
        if 'end_date' not in data or data['end_date'] is None:
            data['end_date'] = batch.end_date

        # Validate date range
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })

        # Constrain to batch duration
        if data['start_date'] < batch.start_date:
            data['start_date'] = batch.start_date
        if data['end_date'] > batch.end_date:
            data['end_date'] = batch.end_date

        return data

    def create(self, validated_data):
        """Generate sessions for all time slots in the batch."""
        batch = validated_data['batch']
        start_date = validated_data['start_date']
        end_date = validated_data['end_date']

        # Get all active time slots for the batch
        time_slots = TimeSlot.objects.filter(
            batch=batch,
            is_active=True
        )

        all_sessions = []
        for time_slot in time_slots:
            current_date = start_date
            while current_date <= end_date:
                # Check if this date matches the time slot's day
                if current_date.isoweekday() == time_slot.day_of_week:
                    session, created = ClassSession.objects.get_or_create(
                        time_slot=time_slot,
                        session_date=current_date,
                        defaults={'status': ClassSession.Status.SCHEDULED}
                    )
                    if created:
                        all_sessions.append(session)
                current_date += timedelta(days=1)

        return all_sessions


# ==========================================
# CoursePlan Serializers
# ==========================================

class CoursePlanMinimalSerializer(serializers.ModelSerializer):
    """Minimal course plan info for nested responses."""
    class Meta:
        model = CoursePlan
        fields = ['id', 'topic_title', 'sequence_order', 'is_completed']


class CoursePlanListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing course plans.
    """
    batch_code = serializers.CharField(source='batch.code', read_only=True)
    module_name = serializers.CharField(source='module.name', read_only=True)
    sessions_count = serializers.SerializerMethodField()

    class Meta:
        model = CoursePlan
        fields = [
            'id',
            'batch',
            'batch_code',
            'module',
            'module_name',
            'topic_title',
            'topic_description',
            'sequence_order',
            'estimated_hours',
            'planned_date',
            'actual_date',
            'is_completed',
            'sessions_count'
        ]

    def get_sessions_count(self, obj):
        return obj.class_sessions.count()


class CoursePlanCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating course plan entries.
    """
    class Meta:
        model = CoursePlan
        fields = [
            'batch',
            'module',
            'topic_title',
            'topic_description',
            'sequence_order',
            'estimated_hours',
            'planned_date',
            'resources'
        ]

    def validate(self, data):
        """Validate module belongs to batch's course."""
        batch = data['batch']
        module = data['module']

        # Check if module is part of batch's course curriculum
        course = batch.template.course
        if not course.course_modules.filter(module=module, is_active=True).exists():
            raise serializers.ValidationError({
                'module': f"Module {module.name} is not part of course {course.name}"
            })

        return data

    def create(self, validated_data):
        """Create with created_by tracking."""
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class CoursePlanUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating course plan entries.
    """
    class Meta:
        model = CoursePlan
        fields = [
            'topic_title',
            'topic_description',
            'sequence_order',
            'estimated_hours',
            'planned_date',
            'actual_date',
            'is_completed',
            'resources'
        ]


class CoursePlanDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for a single course plan entry.
    """
    batch_detail = BatchMinimalSerializer(source='batch', read_only=True)
    module_detail = ModuleMinimalSerializer(source='module', read_only=True)
    linked_sessions = serializers.SerializerMethodField()

    class Meta:
        model = CoursePlan
        fields = [
            'id',
            'batch',
            'batch_detail',
            'module',
            'module_detail',
            'topic_title',
            'topic_description',
            'sequence_order',
            'estimated_hours',
            'planned_date',
            'actual_date',
            'is_completed',
            'resources',
            'linked_sessions',
            'created_at',
            'updated_at'
        ]

    def get_linked_sessions(self, obj):
        return ClassSessionMinimalSerializer(obj.class_sessions.all(), many=True).data


class BulkCoursePlanCreateSerializer(serializers.Serializer):
    """
    Serializer for bulk creating course plan from template.
    Copies topics from another batch's course plan.
    """
    source_batch = serializers.PrimaryKeyRelatedField(
        queryset=Batch.objects.all())
    target_batch = serializers.PrimaryKeyRelatedField(
        queryset=Batch.objects.all())
    module = serializers.PrimaryKeyRelatedField(
        queryset=Module.objects.all())

    def validate(self, data):
        """Validate source batch has course plans."""
        source = data['source_batch']
        module = data['module']

        if not CoursePlan.objects.filter(batch=source, module=module).exists():
            raise serializers.ValidationError({
                'source_batch': f"Source batch {source.code} has no course plans for {module.name}"
            })

        # Check target doesn't already have plans
        target = data['target_batch']
        if CoursePlan.objects.filter(batch=target, module=module).exists():
            raise serializers.ValidationError({
                'target_batch': f"Target batch {target.code} already has course plans for {module.name}"
            })

        return data

    def create(self, validated_data):
        """Copy course plans from source to target."""
        source = validated_data['source_batch']
        target = validated_data['target_batch']
        module = validated_data['module']

        request = self.context.get('request')
        created_by = request.user if request else None

        source_plans = CoursePlan.objects.filter(batch=source, module=module)
        created_plans = []

        for plan in source_plans:
            new_plan = CoursePlan.objects.create(
                batch=target,
                module=module,
                topic_title=plan.topic_title,
                topic_description=plan.topic_description,
                sequence_order=plan.sequence_order,
                estimated_hours=plan.estimated_hours,
                resources=plan.resources,
                created_by=created_by
            )
            created_plans.append(new_plan)

        return created_plans


# ==========================================
# Conflict Check Serializers
# ==========================================

class FacultyConflictCheckSerializer(serializers.Serializer):
    """
    Serializer for checking faculty and batch conflicts.
    Used before creating time slots.
    """
    faculty = serializers.PrimaryKeyRelatedField(
        queryset=FacultyProfile.objects.all())
    batch = serializers.PrimaryKeyRelatedField(
        queryset=Batch.objects.all(),
        required=False,
        allow_null=True
    )
    day_of_week = serializers.IntegerField(min_value=1, max_value=7)
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    exclude_time_slot = serializers.PrimaryKeyRelatedField(
        queryset=TimeSlot.objects.all(),
        required=False,
        allow_null=True
    )

    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time.'
            })
        return data


class FacultyScheduleSerializer(serializers.Serializer):
    """
    Serializer for faculty weekly schedule view.
    Returns all time slots for a faculty organized by day.
    """
    faculty_id = serializers.IntegerField()

    def to_representation(self, instance):
        faculty = FacultyProfile.objects.select_related('user').get(
            id=instance['faculty_id']
        )
        time_slots = TimeSlot.objects.filter(
            faculty=faculty,
            is_active=True
        ).select_related('batch', 'module')

        # Organize by day
        schedule = {i: [] for i in range(1, 8)}
        for slot in time_slots:
            schedule[slot.day_of_week].append({
                'id': slot.id,
                'batch_code': slot.batch.code,
                'module_name': slot.module.name,
                'start_time': slot.start_time.strftime('%H:%M'),
                'end_time': slot.end_time.strftime('%H:%M'),
                'room': slot.room_number
            })

        day_names = dict(TimeSlot.WEEKDAY_CHOICES)
        return {
            'faculty_id': faculty.id,
            'faculty_name': faculty.user.full_name,
            'employee_code': faculty.employee_code,
            'schedule': [
                {
                    'day': day_num,
                    'day_name': day_names[day_num],
                    'slots': schedule[day_num]
                }
                for day_num in range(1, 8)
            ]
        }
