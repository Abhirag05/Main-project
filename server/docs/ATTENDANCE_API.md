# Attendance API Documentation

## Overview

The Attendance module allows faculty to mark attendance for their assigned batch sessions.

## Business Rules

1. **Faculty Only**: Only users with `role.code == "FACULTY"` can mark attendance
2. **Assignment Required**: Faculty must be assigned to the session's time slot
3. **LIVE Batches Only**: Attendance can only be marked for batches with mode = "LIVE" (not RECORDED)
4. **Time Window**: Attendance can be marked from session start time until 24 hours after session end time
5. **Upsert Logic**: Attendance records are created or updated (no hard delete)
6. **Audit Trail**: All attendance operations are logged

## API Endpoints

### 1. Get Students for Session

Returns the list of students enrolled in a session's batch with their current attendance status.

```
GET /api/faculty/sessions/{session_id}/students/
```

**Response:**
```json
{
  "session_id": 1,
  "batch_code": "FSWD-2025-01",
  "batch_id": 5,
  "module_name": "Python Fundamentals",
  "module_code": "PYT101",
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
    {
      "student_id": 2,
      "full_name": "Jane Smith",
      "email": "jane@example.com",
      "roll_no": "STU-0002",
      "current_attendance_status": null
    }
  ]
}
```

**Validation:**
- Faculty must be assigned to the session's time slot
- Returns 403 if faculty is not assigned

### 2. Save/Update Attendance

Saves or updates attendance for multiple students in a session.

```
POST /api/faculty/sessions/{session_id}/attendance/
```

**Request Body:**
```json
{
  "attendance": [
    { "student_id": 1, "status": "PRESENT" },
    { "student_id": 2, "status": "ABSENT" },
    { "student_id": 3, "status": "PRESENT" }
  ]
}
```

**Response:**
```json
{
  "message": "Attendance saved successfully",
  "created": 2,
  "updated": 1,
  "records": [
    { "student_id": 1, "status": "PRESENT", "is_new": false },
    { "student_id": 2, "status": "ABSENT", "is_new": true },
    { "student_id": 3, "status": "PRESENT", "is_new": true }
  ]
}
```

**Validation:**
- Faculty must be assigned to the session
- All students must be enrolled in the batch
- Time window must be valid (start_time to end_time + 24h)
- Batch must be LIVE mode
- No duplicate student IDs allowed

**Errors:**
- `400`: Validation errors (time window, students not enrolled, etc.)
- `403`: Faculty not assigned to session
- `404`: Session not found

### 3. Get Attendance Stats

Returns attendance statistics for a session.

```
GET /api/faculty/sessions/{session_id}/attendance/stats/
```

**Response:**
```json
{
  "total_enrolled": 25,
  "present_count": 20,
  "absent_count": 3,
  "not_marked": 2,
  "attendance_percentage": 86.96
}
```

## Data Model

### Attendance

| Field | Type | Description |
|-------|------|-------------|
| id | AutoField | Primary key |
| session | FK(ClassSession) | The class session |
| student | FK(StudentProfile) | The student |
| status | PRESENT/ABSENT | Attendance status |
| marked_by | FK(User) | Faculty who marked |
| marked_at | DateTime | When last updated |
| created_at | DateTime | When first created |

**Constraints:**
- `unique_together`: (session, student)

## Audit Logging

When attendance is saved, an audit log entry is created:

```json
{
  "action": "ATTENDANCE_MARKED",
  "entity": "BatchSession",
  "entity_id": "<session_id>",
  "details": {
    "batch_code": "FSWD-2025-01",
    "module_name": "Python Fundamentals",
    "session_date": "2025-01-22",
    "records_created": 2,
    "records_updated": 1,
    "total_records": 3
  }
}
```

## Frontend Integration

### Schedule Page

The faculty schedule page (`/dashboards/faculty/schedule`) shows:
- "Today" view: Today's sessions with attendance button
- "Upcoming" view: Next 7 days sessions with attendance button

### Mark Attendance Modal

When clicking "Attendance" button:
1. Opens modal with student list
2. All students default to PRESENT
3. Faculty unchecks (toggles) absentees
4. Save button submits to API
5. Success message shows count of created/updated records

### URL Routes

- `/dashboards/faculty/schedule` - Faculty schedule
- `/dashboards/faculty/schedule/attendance/[sessionId]` - Mark attendance page

## Error Handling

### Time Window Errors
```json
{
  "session": "Attendance marking opens at 2025-01-22 10:00"
}
```
```json
{
  "session": "Attendance marking closed. Deadline was 2025-01-23 12:00"
}
```

### Permission Errors
```json
{
  "detail": "Only the assigned faculty can access this session's attendance."
}
```

### Batch Mode Error
```json
{
  "session": "Attendance can only be marked for LIVE batches. This batch is RECORDED."
}
```

### Student Validation Error
```json
{
  "attendance": "Students not enrolled in this batch: [5, 7, 12]"
}
```
