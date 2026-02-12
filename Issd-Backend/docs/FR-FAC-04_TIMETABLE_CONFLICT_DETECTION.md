# FR-FAC-04 – Timetable Conflict Detection API

## Executive Summary

This document details the implementation of **FR-FAC-04: Detect Timetable Conflicts**, a pre-timetable validation API that checks whether a proposed class time slot conflicts with a faculty member's availability.

**Critical Design Decision:** This API does NOT create or store timetable data. It is a read-only validation endpoint designed to be used BEFORE timetable creation in a future phase.

---

## 1. Feature Overview

### Purpose

Provide a validation mechanism to check if a faculty member can teach at a specific day and time based on their registered availability.

### Scope

- ✅ Validate proposed time slots against faculty availability
- ✅ Check if faculty is active
- ✅ Ensure time slot is fully within availability window
- ❌ Does NOT create timetable entries
- ❌ Does NOT store class sessions
- ❌ Does NOT calculate workload
- ❌ Does NOT handle attendance or payments

### Use Case

When planning a timetable, an administrator or system component can query this API to verify:
_"Can Professor John Smith teach on Monday from 10:00 AM to 12:00 PM?"_

The API responds with either:

- **No conflict** - Time slot is valid
- **Conflict detected** - Time slot violates availability

---

## 2. API Specification

### Endpoint

```
POST /api/faculty/{faculty_id}/check-conflict/
```

### Permission Required

- `faculty.view`

### Request Format

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**URL Parameters:**

- `faculty_id` (integer) - ID of the faculty member to check

**Request Body:**

```json
{
  "day_of_week": 1,
  "start_time": "10:00",
  "end_time": "12:00"
}
```

**Field Descriptions:**
| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `day_of_week` | integer | Yes | Day of the week | 1 (Monday) to 7 (Sunday) |
| `start_time` | string (HH:MM) | Yes | Proposed class start time | 24-hour format |
| `end_time` | string (HH:MM) | Yes | Proposed class end time | Must be after start_time |

---

## 3. Response Formats

### Success - No Conflict (200 OK)

```json
{
  "conflict": false,
  "message": "No timetable conflict detected."
}
```

**Meaning:** The requested time slot is valid. Faculty is available during this time.

---

### Success - Conflict Detected (200 OK)

```json
{
  "conflict": true,
  "reason": "Faculty is not available during the requested time slot."
}
```

**Possible Reasons:**

- `"Faculty is not active."`
- `"Faculty has no availability on this day."`
- `"Faculty is not available during the requested time slot."`

---

### Validation Error (400 Bad Request)

```json
{
  "day_of_week": ["Ensure this value is greater than or equal to 1."],
  "end_time": ["End time must be after start time."]
}
```

**Common Validation Errors:**

- Invalid `day_of_week` (not 1-7)
- Invalid time format
- `end_time` before or equal to `start_time`
- Missing required fields

---

### Faculty Not Found (404 Not Found)

```json
{
  "detail": "Not found."
}
```

---

## 4. Conflict Detection Logic

### Validation Flow

```
1. Check if faculty_id exists → 404 if not
2. Check if faculty is active → Conflict if inactive
3. Validate request data (day, times) → 400 if invalid
4. Retrieve active availability slots for the requested day
5. Check if any slot FULLY contains the requested time range
   ├─ YES → No conflict
   └─ NO  → Conflict detected
```

### Time Slot Matching Rules

The requested time range must be **FULLY INSIDE** at least one availability slot.

**Example 1: Valid (No Conflict)**

```
Faculty Availability: Monday 09:00 - 13:00
Requested Time:       Monday 10:00 - 12:00
Result: ✅ ALLOWED (fully within availability)
```

**Example 2: Invalid (Conflict)**

```
Faculty Availability: Monday 09:00 - 11:00
Requested Time:       Monday 10:30 - 12:00
Result: ❌ CONFLICT (end time exceeds availability)
```

**Example 3: Invalid (Conflict)**

```
Faculty Availability: Monday 09:00 - 13:00
Requested Time:       Monday 08:00 - 10:00
Result: ❌ CONFLICT (start time before availability)
```

**Example 4: Invalid (Conflict)**

```
Faculty Availability: Tuesday 09:00 - 13:00
Requested Time:       Monday 10:00 - 12:00
Result: ❌ CONFLICT (no availability on Monday)
```

**Example 5: Valid with Multiple Slots**

```
Faculty Availability:
  - Monday 09:00 - 12:00
  - Monday 14:00 - 17:00
Requested Time: Monday 15:00 - 16:30
Result: ✅ ALLOWED (within second slot)
```

### Code Logic

```python
# Check if requested time falls FULLY within any availability slot
for slot in availability_slots:
    if slot.start_time <= requested_start and requested_end <= slot.end_time:
        return NO_CONFLICT

return CONFLICT
```

---

## 5. Implementation Details

### Files Modified

1. **apps/faculty/serializers.py**

   - Added `CheckConflictSerializer` for request validation

2. **apps/faculty/views.py**

   - Added `CheckConflictAPIView` for conflict detection logic

3. **apps/faculty/urls.py**
   - Added URL pattern: `<int:faculty_id>/check-conflict/`

### Serializer: CheckConflictSerializer

```python
class CheckConflictSerializer(serializers.Serializer):
    """
    Serializer for checking timetable conflicts.
    Validates proposed time slot against faculty availability.
    """
    day_of_week = serializers.IntegerField(min_value=1, max_value=7)
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()

    def validate(self, data):
        """Validate that start_time is before end_time."""
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time.'
            })
        return data
```

**Responsibilities:**

- Validate `day_of_week` is 1-7
- Parse time fields in HH:MM format
- Ensure logical time range (start < end)

---

### View: CheckConflictAPIView

```python
class CheckConflictAPIView(APIView):
    """
    POST /api/faculty/{faculty_id}/check-conflict/

    Validates whether a proposed time slot conflicts with faculty availability.

    This is a PRE-TIMETABLE validation API. It does NOT create or store
    timetable data. It only checks if the requested time slot is valid
    for the given faculty member based on their availability.

    Permission: faculty.view
    """
    permission_classes = [IsAuthenticated, permission_required("faculty.view")]

    def post(self, request, faculty_id):
        # 1. Validate faculty exists and is active
        # 2. Validate request data
        # 3. Get active availability slots for the day
        # 4. Check if time range fits within any slot
        # 5. Return conflict status
```

**Key Features:**

- Uses `prefetch_related('availabilities')` for query optimization
- Returns HTTP 200 for both conflict and no-conflict cases
- Returns HTTP 400 only for validation errors
- Does NOT perform any database writes
- Does NOT log to audit service (read-only operation)

---

## 6. Database Schema Reference

### Models Used (Read-Only)

#### FacultyProfile

```python
class FacultyProfile(models.Model):
    user = OneToOneField(User)
    employee_code = CharField(max_length=50, unique=True)
    designation = CharField(max_length=100)
    joining_date = DateField()
    is_active = BooleanField(default=True)  # ← Used in conflict check
```

#### FacultyAvailability

```python
class FacultyAvailability(models.Model):
    faculty = ForeignKey(FacultyProfile)
    day_of_week = IntegerField(choices=WEEKDAY_CHOICES)  # ← Used in conflict check
    start_time = TimeField()  # ← Used in conflict check
    end_time = TimeField()    # ← Used in conflict check
    is_active = BooleanField(default=True)  # ← Used in conflict check

    WEEKDAY_CHOICES = [
        (1, 'Monday'),
        (2, 'Tuesday'),
        (3, 'Wednesday'),
        (4, 'Thursday'),
        (5, 'Friday'),
        (6, 'Saturday'),
        (7, 'Sunday'),
    ]
```

### Models NOT Used (Intentional)

The following do NOT exist in this system yet (future phase):

- ❌ `Timetable` - Will store class schedules
- ❌ `ClassSession` - Will store individual class instances
- ❌ `TimeSlot` - Will store standardized time periods
- ❌ `Workload` - Will track faculty teaching hours
- ❌ `Attendance` - Will track student attendance

**Rationale:** This API is a **pre-validation step** for timetable creation. The actual timetable module will be implemented in a later phase and will use this API during timetable planning.

---

## 7. Testing Examples

### Test Case 1: Valid Time Slot

**Setup:**

```sql
-- Faculty ID: 1 (John Smith)
-- Availability: Monday 09:00 - 17:00
INSERT INTO faculty_availabilities (faculty_id, day_of_week, start_time, end_time, is_active)
VALUES (1, 1, '09:00', '17:00', true);
```

**Request:**

```bash
POST /api/faculty/1/check-conflict/
Authorization: Bearer <token>

{
  "day_of_week": 1,
  "start_time": "10:00",
  "end_time": "12:00"
}
```

**Expected Response (200 OK):**

```json
{
  "conflict": false,
  "message": "No timetable conflict detected."
}
```

---

### Test Case 2: Time Exceeds Availability

**Setup:**

```sql
-- Faculty ID: 1
-- Availability: Monday 09:00 - 11:00
INSERT INTO faculty_availabilities (faculty_id, day_of_week, start_time, end_time, is_active)
VALUES (1, 1, '09:00', '11:00', true);
```

**Request:**

```bash
POST /api/faculty/1/check-conflict/

{
  "day_of_week": 1,
  "start_time": "10:30",
  "end_time": "12:00"
}
```

**Expected Response (200 OK):**

```json
{
  "conflict": true,
  "reason": "Faculty is not available during the requested time slot."
}
```

---

### Test Case 3: No Availability on Day

**Setup:**

```sql
-- Faculty ID: 1
-- Availability: Tuesday only
INSERT INTO faculty_availabilities (faculty_id, day_of_week, start_time, end_time, is_active)
VALUES (1, 2, '09:00', '17:00', true);
```

**Request:**

```bash
POST /api/faculty/1/check-conflict/

{
  "day_of_week": 1,
  "start_time": "10:00",
  "end_time": "12:00"
}
```

**Expected Response (200 OK):**

```json
{
  "conflict": true,
  "reason": "Faculty has no availability on this day."
}
```

---

### Test Case 4: Inactive Faculty

**Setup:**

```sql
-- Faculty ID: 1 (inactive)
UPDATE faculty_profiles SET is_active = false WHERE id = 1;
```

**Request:**

```bash
POST /api/faculty/1/check-conflict/

{
  "day_of_week": 1,
  "start_time": "10:00",
  "end_time": "12:00"
}
```

**Expected Response (200 OK):**

```json
{
  "conflict": true,
  "reason": "Faculty is not active."
}
```

---

### Test Case 5: Invalid Time Range

**Request:**

```bash
POST /api/faculty/1/check-conflict/

{
  "day_of_week": 1,
  "start_time": "12:00",
  "end_time": "10:00"
}
```

**Expected Response (400 Bad Request):**

```json
{
  "end_time": ["End time must be after start time."]
}
```

---

### Test Case 6: Multiple Availability Slots

**Setup:**

```sql
-- Faculty ID: 1
-- Morning slot
INSERT INTO faculty_availabilities (faculty_id, day_of_week, start_time, end_time, is_active)
VALUES (1, 1, '09:00', '12:00', true);

-- Afternoon slot
INSERT INTO faculty_availabilities (faculty_id, day_of_week, start_time, end_time, is_active)
VALUES (1, 1, '14:00', '17:00', true);
```

**Request (Morning):**

```bash
POST /api/faculty/1/check-conflict/

{
  "day_of_week": 1,
  "start_time": "10:00",
  "end_time": "11:30"
}
```

**Response:** ✅ No conflict

**Request (Afternoon):**

```bash
POST /api/faculty/1/check-conflict/

{
  "day_of_week": 1,
  "start_time": "15:00",
  "end_time": "16:30"
}
```

**Response:** ✅ No conflict

**Request (Lunch Gap):**

```bash
POST /api/faculty/1/check-conflict/

{
  "day_of_week": 1,
  "start_time": "12:00",
  "end_time": "14:00"
}
```

**Response:** ❌ Conflict (falls in gap between slots)

---

## 8. Integration with Future Timetable Module

### Current State (Phase 1)

```
┌─────────────────────┐
│  Faculty Module     │
│  ✅ FacultyProfile  │
│  ✅ Availability    │
│  ✅ Conflict Check  │
└─────────────────────┘
```

### Future State (Phase 2)

```
┌─────────────────────┐         ┌─────────────────────┐
│  Faculty Module     │         │  Timetable Module   │
│  ✅ FacultyProfile  │◄────────│  📋 Timetable       │
│  ✅ Availability    │         │  📋 ClassSession    │
│  ✅ Conflict Check  │────────►│  📋 TimeSlot        │
└─────────────────────┘  Check  └─────────────────────┘
                         Before
                         Create
```

### Integration Flow (Future)

**When creating a timetable entry:**

1. **Planning Phase:**

   ```
   Administrator selects:
   - Faculty: John Smith
   - Day: Monday
   - Time: 10:00 - 12:00
   - Subject: Python Programming
   - Batch: BATCH001
   ```

2. **Validation Phase (Uses This API):**

   ```
   POST /api/faculty/1/check-conflict/
   {
     "day_of_week": 1,
     "start_time": "10:00",
     "end_time": "12:00"
   }

   Response: { "conflict": false }
   ```

3. **Creation Phase (Future Timetable Module):**

   ```
   POST /api/timetable/
   {
     "faculty_id": 1,
     "batch_id": 1,
     "subject_id": 5,
     "day_of_week": 1,
     "start_time": "10:00",
     "end_time": "12:00"
   }

   → Creates timetable entry
   ```

### API Contract for Future Integration

The conflict check API provides a **boolean decision** that future modules can use:

```python
# Pseudocode for future timetable creation
def create_timetable_entry(faculty_id, day, start, end):
    # Step 1: Check for conflicts
    conflict_response = check_conflict_api(faculty_id, day, start, end)

    if conflict_response['conflict']:
        raise ValidationError(conflict_response['reason'])

    # Step 2: Create timetable entry (future implementation)
    timetable = Timetable.objects.create(...)
    return timetable
```

---

## 9. Performance Considerations

### Query Optimization

**Current Implementation:**

```python
faculty = get_object_or_404(
    FacultyProfile.objects.prefetch_related('availabilities'),
    id=faculty_id
)

availability_slots = FacultyAvailability.objects.filter(
    faculty=faculty,
    day_of_week=day_of_week,
    is_active=True
)
```

**Database Queries:**

1. SELECT faculty profile (1 query)
2. SELECT availability slots (1 query)
3. **Total: 2 queries**

**Indexes Required:**

```sql
CREATE INDEX idx_faculty_availability_lookup
ON faculty_availabilities (faculty_id, day_of_week, is_active);
```

### Expected Performance

| Scenario        | Queries | Response Time |
| --------------- | ------- | ------------- |
| Valid check     | 2       | < 50ms        |
| Invalid faculty | 1       | < 20ms        |
| Multiple slots  | 2       | < 100ms       |

---

## 10. Security Considerations

### Authentication & Authorization

- ✅ JWT authentication required
- ✅ `faculty.view` permission required
- ✅ No write operations performed
- ✅ No sensitive data exposed

### Input Validation

- ✅ Faculty ID validated (404 if not found)
- ✅ Day of week range validated (1-7)
- ✅ Time format validated (HH:MM)
- ✅ Time logic validated (start < end)

### Data Privacy

- ✅ No personal information in conflict response
- ✅ Only availability status returned
- ✅ No audit logging (read-only operation)

---

## 11. Why No Timetable Models Were Created

### Architectural Decision

**This feature is intentionally LIMITED to conflict checking only.**

### Reasons:

1. **Separation of Concerns**

   - Faculty module manages faculty data and availability
   - Timetable module (future) will manage class schedules
   - Clear boundary between modules

2. **Incremental Development**

   - Phase 1: Validate availability (this feature)
   - Phase 2: Create timetable structure (future)
   - Phase 3: Handle sessions, attendance (future)

3. **Avoid Premature Complexity**

   - Timetable requires:
     - Complex scheduling algorithms
     - Room allocation logic
     - Student enrollment integration
     - Workload calculations
     - Attendance tracking
   - These are OUT OF SCOPE for this feature

4. **Testability**

   - Simple API is easy to test
   - No side effects to clean up
   - Predictable behavior

5. **Future Flexibility**
   - Timetable design can be refined based on requirements
   - No legacy schema to migrate
   - Clean integration point established

---

## 12. What Is Intentionally NOT Implemented

### Out of Scope

❌ **Timetable Creation**

- Reason: Belongs to future Timetable module
- Impact: Cannot create class schedules yet

❌ **Class Session Management**

- Reason: Requires timetable structure first
- Impact: No individual class instances

❌ **Workload Calculation**

- Reason: Needs full timetable and session data
- Impact: Cannot track teaching hours

❌ **Multi-Faculty Conflict Check**

- Reason: Current requirement is single-faculty validation
- Impact: Cannot check room/batch conflicts

❌ **Room Availability**

- Reason: Room module doesn't exist
- Impact: Only faculty availability checked

❌ **Batch Schedule Conflicts**

- Reason: Batch timetable not implemented
- Impact: Only faculty side validated

❌ **Recurring Schedule Templates**

- Reason: Not in current requirements
- Impact: Each slot checked individually

❌ **Historical Conflict Data**

- Reason: No timetable history exists
- Impact: Cannot show past conflicts

❌ **Automatic Slot Suggestions**

- Reason: Complex scheduling logic not required
- Impact: Manual time selection required

❌ **Audit Logging**

- Reason: Read-only operation, no data changes
- Impact: Conflict checks not tracked

---

## 13. API Integration Examples

### Frontend Integration (React)

```javascript
// Check if faculty can teach at proposed time
const checkFacultyConflict = async (facultyId, day, startTime, endTime) => {
  try {
    const response = await fetch(
      `http://localhost:8000/api/faculty/${facultyId}/check-conflict/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
        }),
      }
    );

    const data = await response.json();

    if (data.conflict) {
      alert(`Conflict: ${data.reason}`);
      return false;
    } else {
      alert("No conflict - Time slot is available!");
      return true;
    }
  } catch (error) {
    console.error("Error checking conflict:", error);
    return false;
  }
};

// Usage
const canTeach = await checkFacultyConflict(1, 1, "10:00", "12:00");
if (canTeach) {
  // Proceed with timetable creation (future implementation)
}
```

### Python Client Integration

```python
import requests

def check_faculty_conflict(faculty_id, day_of_week, start_time, end_time, token):
    """
    Check if faculty has a conflict at the proposed time.

    Returns:
        tuple: (is_available: bool, message: str)
    """
    url = f"http://localhost:8000/api/faculty/{faculty_id}/check-conflict/"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "day_of_week": day_of_week,
        "start_time": start_time,
        "end_time": end_time
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        data = response.json()
        if data['conflict']:
            return False, data['reason']
        else:
            return True, data['message']
    else:
        return False, f"Error: {response.status_code}"

# Usage
available, message = check_faculty_conflict(
    faculty_id=1,
    day_of_week=1,  # Monday
    start_time="10:00",
    end_time="12:00",
    token="your-jwt-token"
)

if available:
    print(f"✅ {message}")
    # Proceed with timetable creation
else:
    print(f"❌ {message}")
    # Show error to user
```

---

## 14. Error Handling Guide

### HTTP Status Codes

| Code | Scenario              | Action                 |
| ---- | --------------------- | ---------------------- |
| 200  | Success (no conflict) | Proceed with timetable |
| 200  | Success (conflict)    | Show error to user     |
| 400  | Validation error      | Fix request data       |
| 401  | Unauthorized          | Login required         |
| 403  | Forbidden             | Check permissions      |
| 404  | Faculty not found     | Verify faculty ID      |

### Error Response Examples

**Missing Field:**

```json
{
  "day_of_week": ["This field is required."]
}
```

**Invalid Day:**

```json
{
  "day_of_week": ["Ensure this value is less than or equal to 7."]
}
```

**Invalid Time Format:**

```json
{
  "start_time": [
    "Time has wrong format. Use one of these formats instead: HH:MM."
  ]
}
```

**Logic Error:**

```json
{
  "end_time": ["End time must be after start time."]
}
```

---

## 15. Conclusion

### Summary

This feature successfully implements a **pre-timetable validation API** that:

✅ Checks faculty availability against proposed time slots  
✅ Returns clear conflict/no-conflict responses  
✅ Validates input data thoroughly  
✅ Maintains clean separation from future timetable module  
✅ Provides a stable integration point for future development

### Next Steps (Future Phases)

1. **Implement Timetable Module**

   - Create `Timetable`, `ClassSession`, `TimeSlot` models
   - Integrate conflict check API
   - Add room allocation logic

2. **Add Advanced Conflict Detection**

   - Check room availability
   - Check batch schedule conflicts
   - Validate student enrollment conflicts

3. **Implement Workload Tracking**

   - Calculate teaching hours per faculty
   - Enforce workload limits
   - Generate workload reports

4. **Add Attendance Module**
   - Link sessions to attendance records
   - Track student participation
   - Generate attendance reports

### Technical Review Checklist

- [x] API follows REST conventions
- [x] Serializers validate all input
- [x] Views use proper permission checks
- [x] Database queries optimized
- [x] No write operations performed
- [x] Clear error messages
- [x] Comprehensive documentation
- [x] No timetable models created
- [x] Clean integration point established
- [x] Future extensibility maintained

---

**Document Version:** 1.0  
**Last Updated:** December 18, 2025  
**Feature Status:** ✅ Implemented and Ready for Testing  
**Next Review:** Before Timetable Module Implementation
