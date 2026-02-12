# Timetable Module Documentation

## Overview

The Timetable module provides comprehensive scheduling functionality for the ISSD Campus ERP system. It enables Centre Administrators to create and manage weekly class schedules, supports faculty assignment with conflict detection (FR-FAC-04), and allows generation of individual class sessions for tracking and attendance purposes.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [API Reference](#api-reference)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Conflict Detection (FR-FAC-04)](#conflict-detection-fr-fac-04)
7. [Testing Guide](#testing-guide)
8. [Database Schema](#database-schema)

---

## Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                          │
├─────────────────────────────────────────────────────────────────────┤
│  Components:                                                        │
│  ├── TimeSlotTable.tsx      → Display weekly slots in table view    │
│  ├── TimeSlotForm.tsx       → Create/Edit time slots with conflict  │
│  ├── WeeklyScheduleView.tsx → Calendar-style weekly view            │
│  ├── ClassSessionList.tsx   → List individual sessions              │
│  ├── SessionDetailModal.tsx → View/Edit session details             │
│  └── GenerateSessionsModal  → Bulk generate sessions                │
│                                                                     │
│  Pages:                                                             │
│  ├── /dashboards/centre-admin/timetable/  → Manage time slots       │
│  ├── /dashboards/centre-admin/sessions/   → Manage sessions         │
│  ├── /dashboards/faculty/schedule/        → Faculty's schedule      │
│  └── /dashboards/student/timetable/       → Student's timetable     │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │ HTTP/REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Backend (Django REST Framework)                  │
├─────────────────────────────────────────────────────────────────────┤
│  API Endpoints:                                                     │
│  ├── /api/timetable/time-slots/           → CRUD for time slots     │
│  ├── /api/timetable/sessions/             → CRUD for sessions       │
│  ├── /api/timetable/sessions/bulk/        → Bulk create sessions    │
│  ├── /api/timetable/check-conflict/       → Faculty conflict check  │
│  ├── /api/timetable/faculty/{id}/schedule/→ Faculty's schedule      │
│  ├── /api/timetable/batch/{id}/timetable/ → Batch timetable         │
│  └── /api/timetable/today/                → Today's sessions        │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Database (SQLite)                          │
├─────────────────────────────────────────────────────────────────────┤
│  Tables:                                                            │
│  ├── timetable_timeslot    → Recurring weekly schedule template     │
│  ├── timetable_classsession→ Individual class instances             │
│  └── timetable_courseplan  → Syllabus/Course plan entries           │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Concepts

| Concept          | Description                                                                   |
| ---------------- | ----------------------------------------------------------------------------- |
| **TimeSlot**     | A recurring weekly schedule entry (e.g., "Monday 9:00-10:00, CS101, Batch A") |
| **ClassSession** | An actual class instance on a specific date, derived from TimeSlot            |
| **CoursePlan**   | Structured syllabus with topics and sequence for a subject-batch combination  |

---

## Backend Implementation

### File Structure

```
apps/timetable/
├── __init__.py
├── admin.py          # Django admin registration
├── apps.py           # App configuration
├── models.py         # TimeSlot, ClassSession, CoursePlan models
├── serializers.py    # DRF serializers with validation
├── views.py          # API views with permission checks
├── urls.py           # URL routing
├── tests.py          # Unit tests (placeholder)
└── migrations/
    ├── __init__.py
    └── 0001_initial.py
```

### Models

#### TimeSlot Model

```python
class TimeSlot(models.Model):
    """Represents a recurring weekly class slot"""

    DAY_CHOICES = [
        (1, 'Monday'), (2, 'Tuesday'), (3, 'Wednesday'),
        (4, 'Thursday'), (5, 'Friday'), (6, 'Saturday'), (7, 'Sunday')
    ]

    batch = models.ForeignKey('batch_management.Batch', ...)
    subject = models.ForeignKey('academics.Subject', ...)
    faculty = models.ForeignKey('faculty.Faculty', ...)
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    room_number = models.CharField(max_length=50, blank=True)
    default_meeting_link = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
```

**Key Features:**

- `check_faculty_conflict()` class method for FR-FAC-04 compliance
- Unique constraint on (batch, day_of_week, start_time)
- Indexed on faculty, batch, and day_of_week for query performance

#### ClassSession Model

```python
class ClassSession(models.Model):
    """Represents an actual class on a specific date"""

    STATUS_CHOICES = [
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('RESCHEDULED', 'Rescheduled'),
    ]

    time_slot = models.ForeignKey(TimeSlot, null=True, ...)
    batch = models.ForeignKey('batch_management.Batch', ...)
    subject = models.ForeignKey('academics.Subject', ...)
    faculty = models.ForeignKey('faculty.Faculty', ...)
    session_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(choices=STATUS_CHOICES, default='SCHEDULED')
    topic_covered = models.CharField(max_length=500, blank=True)
    notes = models.TextField(blank=True)
    room_number = models.CharField(max_length=50, blank=True)
    meeting_link = models.URLField(blank=True)
    is_online = models.BooleanField(default=False)
```

**Key Features:**

- Links to TimeSlot for traceability
- Status workflow: SCHEDULED → IN_PROGRESS → COMPLETED/CANCELLED
- Supports both online and offline classes
- Topic/notes for session tracking

#### CoursePlan Model

```python
class CoursePlan(models.Model):
    """Syllabus/course plan for a subject-batch"""

    batch = models.ForeignKey('batch_management.Batch', ...)
    subject = models.ForeignKey('academics.Subject', ...)
    sequence_number = models.PositiveIntegerField()
    topic = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    estimated_hours = models.DecimalField(max_digits=4, decimal_places=1, default=1.0)
    is_completed = models.BooleanField(default=False)
```

---

## Frontend Implementation

### Components

#### 1. TimeSlotTable

Displays time slots in a sortable, filterable table format.

**Props:**

```typescript
interface TimeSlotTableProps {
  timeSlots: TimeSlot[];
  loading: boolean;
  onEdit: (slot: TimeSlot) => void;
  onDelete: (slot: TimeSlot) => void;
  onGenerateSessions: (slot: TimeSlot) => void;
}
```

#### 2. TimeSlotForm

Modal form for creating/editing time slots with real-time conflict detection.

**Features:**

- Dropdown selection for batch, subject, faculty
- Time picker for start/end times
- Real-time conflict checking via API
- Validation for overlapping times

#### 3. WeeklyScheduleView

Visual calendar-style weekly view with grid layout.

**Props:**

```typescript
interface WeeklyScheduleViewProps {
  timeSlots: TimeSlot[];
  loading: boolean;
  onSlotClick?: (slot: TimeSlot) => void;
  viewMode: "faculty" | "batch";
  title?: string;
}
```

**Features:**

- Grid layout showing 7 days × time slots
- Color-coded by day
- Responsive: switches to list view on mobile
- Click to view/edit slot details

#### 4. ClassSessionList

Groups and displays sessions by date with status management.

**Features:**

- Grouped by date with "Today" highlighting
- Status change dropdown (for authorized users)
- Meeting link quick access
- Past-due warnings for overdue sessions

#### 5. SessionDetailModal

Detailed view and edit form for individual sessions.

**Features:**

- View session info, topic, notes
- Edit mode for faculty/admin
- Meeting link management
- Status tracking

#### 6. GenerateSessionsModal

Bulk session generation from time slots.

**Features:**

- Date range selection
- Session count estimation
- Preview of slots to be generated

### API Client (`lib/timetableAPI.ts`)

```typescript
class TimetableAPI {
  // Time Slots
  getTimeSlots(params?): Promise<TimeSlot[]>;
  getTimeSlot(id: number): Promise<TimeSlot>;
  createTimeSlot(data): Promise<TimeSlot>;
  updateTimeSlot(id, data): Promise<TimeSlot>;
  deleteTimeSlot(id): Promise<void>;

  // Sessions
  getSessions(params?): Promise<ClassSession[]>;
  getSession(id): Promise<ClassSession>;
  createSession(data): Promise<ClassSession>;
  updateSession(id, data): Promise<ClassSession>;
  deleteSession(id): Promise<void>;
  createBulkSessions(data): Promise<ClassSession[]>;

  // Course Plans
  getCoursePlans(params?): Promise<CoursePlan[]>;
  createCoursePlan(data): Promise<CoursePlan>;
  updateCoursePlan(id, data): Promise<CoursePlan>;
  deleteCoursePlan(id): Promise<void>;
  copyCoursePlan(data): Promise<CoursePlan[]>;

  // Utilities
  checkConflict(data): Promise<ConflictResult>;
  getFacultySchedule(facultyId): Promise<FacultySchedule>;
  getBatchTimetable(batchId): Promise<BatchTimetable>;
  getTodaySessions(): Promise<ClassSession[]>;
}

export const timetableAPI = new TimetableAPI();
```

---

## API Reference

### Time Slots

#### List Time Slots

```http
GET /api/timetable/time-slots/
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| batch | integer | Filter by batch ID |
| faculty | integer | Filter by faculty ID |
| day_of_week | integer | Filter by day (1=Monday...7=Sunday) |
| is_active | boolean | Filter by active status |

**Response:**

```json
[
  {
    "id": 1,
    "batch": 1,
    "subject": 3,
    "faculty": 2,
    "day_of_week": 1,
    "day_name": "Monday",
    "start_time": "09:00:00",
    "end_time": "10:00:00",
    "room_number": "Room 101",
    "default_meeting_link": "https://meet.google.com/xxx",
    "is_active": true,
    "batch_detail": {
      "id": 1,
      "code": "CS2024A",
      "course_name": "B.Sc Computer Science"
    },
    "subject_detail": { "id": 3, "name": "Data Structures", "code": "CS201" },
    "faculty_detail": {
      "id": 2,
      "full_name": "Dr. John Smith",
      "employee_code": "FAC001"
    }
  }
]
```

#### Create Time Slot

```http
POST /api/timetable/time-slots/
```

**Request Body:**

```json
{
  "batch": 1,
  "subject": 3,
  "faculty": 2,
  "day_of_week": 1,
  "start_time": "09:00:00",
  "end_time": "10:00:00",
  "room_number": "Room 101",
  "is_active": true
}
```

### Check Faculty Conflict (FR-FAC-04)

```http
POST /api/timetable/check-conflict/
```

**Request Body:**

```json
{
  "faculty_id": 2,
  "day_of_week": 1,
  "start_time": "09:00:00",
  "end_time": "10:00:00",
  "exclude_slot_id": null
}
```

**Response:**

```json
{
  "has_conflict": true,
  "conflicting_slots": [
    {
      "id": 5,
      "batch_code": "CS2024B",
      "subject_name": "Algorithms",
      "day_of_week": 1,
      "start_time": "09:30:00",
      "end_time": "10:30:00"
    }
  ]
}
```

### Bulk Create Sessions

```http
POST /api/timetable/sessions/bulk/
```

**Request Body:**

```json
{
  "time_slot_ids": [1, 2, 3],
  "start_date": "2025-02-01",
  "end_date": "2025-05-31"
}
```

### Get Faculty Schedule

```http
GET /api/timetable/faculty/{faculty_id}/schedule/
```

**Response:**

```json
{
  "faculty": {
    "id": 2,
    "full_name": "Dr. John Smith",
    "employee_code": "FAC001"
  },
  "time_slots": [...],
  "total_weekly_hours": 15.5
}
```

### Get Today's Sessions

```http
GET /api/timetable/today/
```

Returns all sessions for the current date.

---

## User Roles & Permissions

### Permission Matrix

| Permission             | Super Admin | Centre Admin |      Faculty      |  Student   |
| ---------------------- | :---------: | :----------: | :---------------: | :--------: |
| View Time Slots        |     ✅      |      ✅      |     ✅ (own)      | ✅ (batch) |
| Create Time Slots      |     ✅      |      ✅      |        ❌         |     ❌     |
| Edit Time Slots        |     ✅      |      ✅      |        ❌         |     ❌     |
| Delete Time Slots      |     ✅      |      ✅      |        ❌         |     ❌     |
| View Sessions          |     ✅      |      ✅      |     ✅ (own)      | ✅ (batch) |
| Create Sessions        |     ✅      |      ✅      |        ❌         |     ❌     |
| Edit Sessions          |     ✅      |      ✅      |     ✅ (own)      |     ❌     |
| Update Session Status  |     ✅      |      ✅      |     ✅ (own)      |     ❌     |
| View Course Plans      |     ✅      |      ✅      |        ✅         | ✅ (batch) |
| Manage Course Plans    |     ✅      |      ✅      | ✅ (own subjects) |     ❌     |
| Check Conflicts        |     ✅      |      ✅      |        ❌         |     ❌     |
| Bulk Generate Sessions |     ✅      |      ✅      |        ❌         |     ❌     |

### Permissions Seeded

The following permissions were added to the system:

```
timetable.view_timeslot
timetable.add_timeslot
timetable.change_timeslot
timetable.delete_timeslot
timetable.view_classsession
timetable.add_classsession
timetable.change_classsession
timetable.delete_classsession
timetable.view_courseplan
timetable.add_courseplan
timetable.change_courseplan
timetable.delete_courseplan
timetable.check_conflict
timetable.view_faculty_schedule
timetable.view_batch_timetable
timetable.bulk_create_sessions
timetable.view_today_sessions
```

---

## Conflict Detection (FR-FAC-04)

### Implementation

The system prevents faculty from being assigned to overlapping time slots across different batches.

#### Algorithm

```python
@classmethod
def check_faculty_conflict(cls, faculty_id, day_of_week, start_time, end_time, exclude_id=None):
    """
    Check for overlapping time slots for a faculty member.
    Two slots overlap if:
    - Same day of week
    - start1 < end2 AND start2 < end1
    """
    conflicts = cls.objects.filter(
        faculty_id=faculty_id,
        day_of_week=day_of_week,
        is_active=True
    ).exclude(id=exclude_id)

    overlapping = []
    for slot in conflicts:
        # Check time overlap
        if start_time < slot.end_time and slot.start_time < end_time:
            overlapping.append(slot)

    return overlapping
```

#### UI Integration

1. **Real-time Check**: When creating/editing a time slot, the form automatically checks for conflicts when faculty, day, or time changes.

2. **Warning Display**: If conflicts exist, a warning message is displayed with details of the conflicting slots.

3. **Submit Prevention**: The form disables the submit button when conflicts are detected.

---

## Testing Guide

### Backend Testing

```bash
cd Issd-Backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Set settings module
$env:DJANGO_SETTINGS_MODULE = "config.settings.dev"

# Run timetable tests
python manage.py test timetable --verbosity=2
```

### API Testing with cURL

#### Create Time Slot

```bash
curl -X POST http://localhost:8000/api/timetable/time-slots/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "batch": 1,
    "subject": 1,
    "faculty": 1,
    "day_of_week": 1,
    "start_time": "09:00:00",
    "end_time": "10:00:00"
  }'
```

#### Check for Conflicts

```bash
curl -X POST http://localhost:8000/api/timetable/check-conflict/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "faculty_id": 1,
    "day_of_week": 1,
    "start_time": "09:30:00",
    "end_time": "10:30:00"
  }'
```

#### Bulk Generate Sessions

```bash
curl -X POST http://localhost:8000/api/timetable/sessions/bulk/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "time_slot_ids": [1, 2],
    "start_date": "2025-02-01",
    "end_date": "2025-02-28"
  }'
```

### Frontend Testing

1. **Navigate to Centre Admin Dashboard**

   - URL: `http://localhost:3000/dashboards/centre-admin/timetable`
   - Login with Centre Admin credentials

2. **Test Time Slot Creation**

   - Click "Add Time Slot"
   - Fill in required fields
   - Observe conflict detection when selecting overlapping times

3. **Test Session Generation**

   - Click calendar icon on a time slot
   - Select date range
   - Verify sessions are created

4. **Test Faculty Schedule View**
   - URL: `http://localhost:3000/dashboards/faculty/schedule`
   - Login with Faculty credentials
   - Verify weekly schedule and today's classes

---

## Database Schema

### ER Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Batch       │     │     Subject     │     │     Faculty     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │     │ id              │
│ code            │     │ name            │     │ full_name       │
│ course_name     │     │ code            │     │ employee_code   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │    ┌──────────────────┼───────────────────────┘
         │    │                  │
         ▼    ▼                  ▼
┌─────────────────────────────────────────────┐
│                 TimeSlot                     │
├─────────────────────────────────────────────┤
│ id                                          │
│ batch_id (FK)                               │
│ subject_id (FK)                             │
│ faculty_id (FK)                             │
│ day_of_week                                 │
│ start_time                                  │
│ end_time                                    │
│ room_number                                 │
│ default_meeting_link                        │
│ is_active                                   │
│ created_at, updated_at                      │
├─────────────────────────────────────────────┤
│ UNIQUE: (batch, day_of_week, start_time)    │
│ INDEX: faculty_id, batch_id, day_of_week    │
└────────────────────┬────────────────────────┘
                     │
                     │ (optional link)
                     ▼
┌─────────────────────────────────────────────┐
│                ClassSession                  │
├─────────────────────────────────────────────┤
│ id                                          │
│ time_slot_id (FK, nullable)                 │
│ batch_id (FK)                               │
│ subject_id (FK)                             │
│ faculty_id (FK)                             │
│ session_date                                │
│ start_time                                  │
│ end_time                                    │
│ status (SCHEDULED/IN_PROGRESS/COMPLETED/...)│
│ topic_covered                               │
│ notes                                       │
│ room_number                                 │
│ meeting_link                                │
│ is_online                                   │
│ created_at, updated_at                      │
├─────────────────────────────────────────────┤
│ UNIQUE: (batch, session_date, start_time)   │
│ INDEX: session_date, status, faculty_id     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│                 CoursePlan                   │
├─────────────────────────────────────────────┤
│ id                                          │
│ batch_id (FK)                               │
│ subject_id (FK)                             │
│ sequence_number                             │
│ topic                                       │
│ description                                 │
│ estimated_hours                             │
│ is_completed                                │
│ created_at, updated_at                      │
├─────────────────────────────────────────────┤
│ UNIQUE: (batch, subject, sequence_number)   │
│ INDEX: batch_id, subject_id                 │
└─────────────────────────────────────────────┘
```

### Indexes

```sql
-- TimeSlot indexes
CREATE INDEX timetable_timeslot_faculty_idx ON timetable_timeslot(faculty_id);
CREATE INDEX timetable_timeslot_batch_idx ON timetable_timeslot(batch_id);
CREATE INDEX timetable_timeslot_day_idx ON timetable_timeslot(day_of_week);

-- ClassSession indexes
CREATE INDEX timetable_classsession_date_idx ON timetable_classsession(session_date);
CREATE INDEX timetable_classsession_status_idx ON timetable_classsession(status);
CREATE INDEX timetable_classsession_faculty_idx ON timetable_classsession(faculty_id);
CREATE INDEX timetable_classsession_batch_idx ON timetable_classsession(batch_id);

-- CoursePlan indexes
CREATE INDEX timetable_courseplan_batch_subject_idx ON timetable_courseplan(batch_id, subject_id);
```

---

## Change Log

| Date       | Version | Changes                                    |
| ---------- | ------- | ------------------------------------------ |
| 2025-01-XX | 1.0.0   | Initial implementation of Timetable module |

---

## Next Steps

1. **Attendance Integration**: Link ClassSession to attendance records
2. **Notifications**: Send reminders for upcoming classes
3. **Room Conflict Detection**: Prevent double-booking of rooms
4. **Substitution Management**: Handle faculty substitutions
5. **Calendar Export**: ICS export for calendar integration
6. **Recurring Exceptions**: Handle holidays and breaks
