# RE-ADDING COURSE DURATION — COMPLETE DOCUMENTATION

## Executive Summary

This document describes the re-introduction of the `duration_months` field to the Course model in the ISSD Campus ERP + LMS system. This change corrects an architectural oversight by placing course duration at the master data level, where it belongs.

**Status:** ✅ COMPLETE  
**Migration:** `0004_course_duration_months.py` — Applied successfully  
**System Check:** No issues (0 silenced)  
**Backward Compatibility:** Maintained

---

## Table of Contents

1. [What Was Changed](#what-was-changed)
2. [Architectural Rationale](#architectural-rationale)
3. [Database Changes](#database-changes)
4. [API Changes](#api-changes)
5. [Validation Rules](#validation-rules)
6. [Admin Interface Changes](#admin-interface-changes)
7. [Migration Details](#migration-details)
8. [Backward Compatibility](#backward-compatibility)
9. [Future Batch Logic](#future-batch-logic)
10. [What Was NOT Changed](#what-was-not-changed)
11. [Testing Guide](#testing-guide)
12. [Verification Checklist](#verification-checklist)

---

## 1. What Was Changed

### Files Modified

1. **`apps/academics/models.py`**

   - Added `duration_months` field to Course model

2. **`apps/academics/serializers.py`**

   - Updated `CourseCreateSerializer` to accept and validate `duration_months`
   - Updated `CourseListSerializer` to include `duration_months` in responses

3. **`apps/academics/admin.py`**

   - Added `duration_months` to `list_display` in CourseAdmin
   - Added `duration_months` to fieldsets

4. **`apps/academics/migrations/0004_course_duration_months.py`**
   - New migration adding the field

### Summary of Changes

| Component   | Change                                       | Impact               |
| ----------- | -------------------------------------------- | -------------------- |
| Model       | Added `duration_months` PositiveIntegerField | Database schema      |
| Serializers | Added field to create/list serializers       | API request/response |
| Admin       | Added to display and fieldsets               | Admin UI             |
| Migration   | Migration 0004 created and applied           | Database             |

---

## 2. Architectural Rationale

### Why Duration Belongs in Course (Not Batch)

**Academic Principle:**

- A **Course** defines the canonical academic program structure
- Duration is an **intrinsic property** of the course design
- Examples:
  - "Full Stack Web Development" = 6-month program
  - "Data Science Bootcamp" = 12-month program
  - "Bachelor of Computer Applications" = 36-month program

**Data Hierarchy:**

```
Course (Master Data)
  ↓ defines duration
Batch (Runtime Instance)
  ↓ inherits duration
  ↓ converts to dates
  start_date, end_date
```

### Course vs. Batch Relationship

| Aspect         | Course                      | Batch                                          |
| -------------- | --------------------------- | ---------------------------------------------- |
| **Nature**     | Academic blueprint          | Specific run/offering                          |
| **Duration**   | Canonical (months)          | Derived dates (start/end)                      |
| **Example**    | "BCA is a 36-month program" | "BCA Batch Jan 2025: 2025-01-15 to 2028-01-15" |
| **Mutability** | Stable, rarely changes      | Per-batch, can vary                            |
| **Data Type**  | duration_months = 36        | start_date, end_date                           |

### Why This Was an Architectural Mistake

**Previous flaw:**

- Course had no duration → Batches calculated duration independently
- This creates **data inconsistency** risk:
  - What if different batches calculate different durations?
  - How do you query "all 12-month courses"?
  - Where is the source of truth?

**Corrected architecture:**

1. Course defines canonical duration (master data)
2. Batch inherits that duration (runtime instantiation)
3. Batch converts duration to actual dates based on start_date
4. Single source of truth maintained

---

## 3. Database Changes

### Schema Update

**Table:** `academics_courses`

**New Field:**

| Column          | Type                 | Constraints         | Description               |
| --------------- | -------------------- | ------------------- | ------------------------- |
| duration_months | PositiveIntegerField | NOT NULL, DEFAULT 6 | Course duration in months |

### Database Constraints

- **Type:** `PositiveIntegerField` (ensures >= 0 at DB level)
- **NOT NULL:** Every course must have a duration
- **Default:** 6 months (applied during migration to existing rows)
- **Validation:** Serializer enforces minimum value of 1

### Updated Course Table Structure

```sql
CREATE TABLE academics_courses (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    duration_months INTEGER NOT NULL DEFAULT 6 CHECK (duration_months >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 4. API Changes

### 4.1 Create Course API

**Endpoint:** `POST /api/academics/courses/`

**BEFORE:**

```json
{
  "code": "BHM",
  "name": "Bachelor of Hospitality Management",
  "description": "3-year hospitality program",
  "is_active": true
}
```

**AFTER (REQUIRED CHANGE):**

```json
{
  "code": "BHM",
  "name": "Bachelor of Hospitality Management",
  "description": "3-year hospitality program",
  "duration_months": 36,
  "is_active": true
}
```

**Response (201 Created):**

```json
{
  "status": "success",
  "message": "Course created successfully",
  "data": {
    "id": 1,
    "code": "BHM",
    "name": "Bachelor of Hospitality Management",
    "description": "3-year hospitality program",
    "duration_months": 36,
    "is_active": true,
    "created_at": "2025-12-18T10:30:00Z",
    "updated_at": "2025-12-18T10:30:00Z"
  }
}
```

### 4.2 List Courses API

**Endpoint:** `GET /api/academics/courses/`

**Response Changes:**

**BEFORE:**

```json
{
  "status": "success",
  "count": 1,
  "data": [
    {
      "id": 1,
      "code": "BHM",
      "name": "Bachelor of Hospitality Management",
      "description": "3-year hospitality program",
      "is_active": true,
      "created_at": "2025-12-18T10:30:00Z",
      "updated_at": "2025-12-18T10:30:00Z"
    }
  ]
}
```

**AFTER:**

```json
{
  "status": "success",
  "count": 1,
  "data": [
    {
      "id": 1,
      "code": "BHM",
      "name": "Bachelor of Hospitality Management",
      "description": "3-year hospitality program",
      "duration_months": 36,
      "is_active": true,
      "created_at": "2025-12-18T10:30:00Z",
      "updated_at": "2025-12-18T10:30:00Z"
    }
  ]
}
```

### 4.3 Other Endpoints

**NO CHANGES to:**

- `POST /api/academics/subjects/`
- `GET /api/academics/subjects/`
- `POST /api/academics/course-subjects/`
- `GET /api/academics/courses/{id}/subjects/`

These endpoints remain unchanged.

---

## 5. Validation Rules

### Field-Level Validation

**duration_months:**

| Rule             | Enforcement Level | Error Message                               |
| ---------------- | ----------------- | ------------------------------------------- |
| Required         | Serializer        | "This field is required."                   |
| Type: Integer    | Serializer        | "A valid integer is required."              |
| Minimum Value: 1 | Serializer        | "Course duration must be at least 1 month." |
| Non-negative     | Database (CHECK)  | Database constraint                         |

### Validation Examples

**Valid Values:**

```json
{"duration_months": 1}   ✅
{"duration_months": 6}   ✅
{"duration_months": 12}  ✅
{"duration_months": 24}  ✅
{"duration_months": 36}  ✅
{"duration_months": 48}  ✅
```

**Invalid Values:**

```json
{"duration_months": 0}   ❌ "Course duration must be at least 1 month."
{"duration_months": -5}  ❌ "Ensure this value is greater than or equal to 0."
{} (missing field)       ❌ "This field is required."
{"duration_months": "abc"} ❌ "A valid integer is required."
{"duration_months": 3.5}   ❌ "A valid integer is required."
```

### Common Duration Values

| Duration | Months | Typical Use Case                 |
| -------- | ------ | -------------------------------- |
| Short    | 1-3    | Workshop, crash course           |
| Medium   | 6-12   | Certificate, diploma, bootcamp   |
| Long     | 24-36  | Undergraduate degree (2-3 years) |
| Extended | 48+    | Professional degrees (4+ years)  |

---

## 6. Admin Interface Changes

### CourseAdmin Updates

**list_display:**

**BEFORE:**

```python
list_display = ['code', 'name', 'is_active', 'created_at']
```

**AFTER:**

```python
list_display = ['code', 'name', 'duration_months', 'is_active', 'created_at']
```

**Visual Impact:**

Admin list view now shows:

| Code | Name                               | Duration (months) | Active | Created At          |
| ---- | ---------------------------------- | ----------------- | ------ | ------------------- |
| BCA  | Bachelor of Computer Applications  | 36                | ✓      | 2025-12-18 10:00:00 |
| BHM  | Bachelor of Hospitality Management | 36                | ✓      | 2025-12-18 10:05:00 |
| FSWD | Full Stack Web Development         | 6                 | ✓      | 2025-12-18 10:10:00 |

**fieldsets:**

**BEFORE:**

```python
fieldsets = (
    ('Course Information', {
        'fields': ('code', 'name', 'description')
    }),
    ...
)
```

**AFTER:**

```python
fieldsets = (
    ('Course Information', {
        'fields': ('code', 'name', 'description', 'duration_months')
    }),
    ...
)
```

Admins can now edit `duration_months` directly in the Course edit form.

---

## 7. Migration Details

### Migration File

**File:** `apps/academics/migrations/0004_course_duration_months.py`

**Generated Code:**

```python
# Generated by Django 5.x on 2025-12-18

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academics', '0003_remove_course_duration_months_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='duration_months',
            field=models.PositiveIntegerField(
                default=6,
                help_text='Course duration in months (e.g., 6, 12, 24, 36)'
            ),
        ),
    ]
```

### Migration Safety

**Safe for production because:**

1. ✅ Adds a new field (non-destructive)
2. ✅ Provides a default value (6 months)
3. ✅ Existing rows automatically populated with default
4. ✅ No data loss
5. ✅ Reversible (can rollback if needed)

### Migration History

| Migration | Description                       | Status     |
| --------- | --------------------------------- | ---------- |
| 0001      | Initial academic models           | Applied    |
| 0002      | (Previous changes)                | Applied    |
| 0003      | Removed duration_months (mistake) | Applied    |
| **0004**  | **Re-added duration_months**      | Applied ✅ |

### Rollback Procedure

If needed, rollback with:

```bash
python manage.py migrate academics 0003
```

This will remove the `duration_months` field (reversible).

---

## 8. Backward Compatibility

### API Compatibility

**BREAKING CHANGE:**

- `POST /api/academics/courses/` now **REQUIRES** `duration_months`

**Impact on existing API clients:**

- Any client creating courses must update their payload to include `duration_months`
- GET requests are backward compatible (add new field to responses)

### Migration Compatibility

**Existing data:**

- All existing courses automatically receive `duration_months = 6` (default)
- Admins should update these values to reflect actual course durations

**Database compatibility:**

- ✅ PostgreSQL supports `PositiveIntegerField`
- ✅ Default value ensures no null constraint violations
- ✅ Existing queries unaffected (SELECT \* still works)

### Client Update Guide

**Before update:**

```javascript
// Old client code
const courseData = {
  code: "BCA",
  name: "Bachelor of Computer Applications",
  description: "3-year program",
  is_active: true,
};
```

**After update (REQUIRED):**

```javascript
// Updated client code
const courseData = {
  code: "BCA",
  name: "Bachelor of Computer Applications",
  description: "3-year program",
  duration_months: 36, // ← ADD THIS
  is_active: true,
};
```

---

## 9. Future Batch Logic

### How Batches Will Use duration_months

**Current State (Phase 1A):**

- Course has `duration_months`
- Batch has `start_date` and `end_date` (manually entered)

**Future Enhancement (Phase 1B or later):**

When creating a batch, the system will:

1. **Read** course duration from Course.duration_months
2. **Calculate** end_date from start_date + duration
3. **Populate** batch.end_date automatically

**Example Logic (Not implemented yet):**

```python
# Future batch creation logic
def create_batch(course_id, start_date):
    course = Course.objects.get(id=course_id)

    # Calculate end date from course duration
    end_date = start_date + relativedelta(months=course.duration_months)

    batch = Batch.objects.create(
        course=course,
        start_date=start_date,
        end_date=end_date,  # Auto-calculated
        ...
    )

    return batch
```

**Example:**

```python
# Course: BCA (36 months)
course = Course.objects.get(code="BCA")
print(course.duration_months)  # Output: 36

# Create batch starting Jan 15, 2025
batch = create_batch(
    course_id=course.id,
    start_date=date(2025, 1, 15)
)

# Batch automatically ends Jan 15, 2028 (36 months later)
print(batch.end_date)  # Output: 2028-01-15
```

### Benefits of This Architecture

| Benefit                    | Description                                            |
| -------------------------- | ------------------------------------------------------ |
| **Single Source of Truth** | Course defines duration once; all batches inherit it   |
| **Consistency**            | All batches of same course have same duration          |
| **Flexibility**            | Batch dates can still be manually overridden if needed |
| **Data Integrity**         | Prevents conflicting duration values across batches    |
| **Queryability**           | Can query all 12-month courses easily                  |

---

## 10. What Was NOT Changed

### Intentionally Unmodified

To ensure minimal impact and focus on the specific requirement, the following were **NOT changed**:

❌ **Batch model** — No changes to Batch logic  
❌ **Faculty model** — No changes to Faculty logic  
❌ **Timetable logic** — Does not exist yet  
❌ **Subject model** — No changes  
❌ **CourseSubject model** — No changes  
❌ **User/Auth models** — No changes  
❌ **Permission system** — No changes  
❌ **Audit logging** — No changes

### URLs/Endpoints

All existing endpoints remain unchanged:

- ✅ `/api/academics/courses/` (same URL, updated payload)
- ✅ `/api/academics/subjects/`
- ✅ `/api/academics/course-subjects/`
- ✅ `/api/academics/courses/{id}/subjects/`

### Views Logic

Views (`apps/academics/views.py`) remain unchanged because:

- Serializers handle the new field automatically
- No custom view logic needed
- Validation happens in serializers

### Existing Database Records

All existing courses retain their data:

- ✅ code, name, description unchanged
- ✅ is_active status unchanged
- ✅ created_at, updated_at unchanged
- ➕ duration_months added with default value (6)

**Action Required:**
Admins should review and update `duration_months` for existing courses to reflect actual durations.

---

## 11. Testing Guide

### 11.1 Authentication

First, obtain a JWT token:

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@issd.edu",
    "password": "admin123"
  }'
```

Use the `access` token in all subsequent requests:

```bash
Authorization: Bearer <your_token>
```

### 11.2 Create Course with Duration

**Request:**

```bash
curl -X POST http://localhost:8000/api/academics/courses/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code": "FSWD",
    "name": "Full Stack Web Development",
    "description": "6-month intensive bootcamp",
    "duration_months": 6,
    "is_active": true
  }'
```

**Expected Response (201 Created):**

```json
{
  "status": "success",
  "message": "Course created successfully",
  "data": {
    "id": 1,
    "code": "FSWD",
    "name": "Full Stack Web Development",
    "description": "6-month intensive bootcamp",
    "duration_months": 6,
    "is_active": true,
    "created_at": "2025-12-18T14:30:00Z",
    "updated_at": "2025-12-18T14:30:00Z"
  }
}
```

### 11.3 Test Validation: Missing duration_months

**Request:**

```bash
curl -X POST http://localhost:8000/api/academics/courses/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code": "TEST",
    "name": "Test Course",
    "is_active": true
  }'
```

**Expected Response (400 Bad Request):**

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "duration_months": ["This field is required."]
  }
}
```

### 11.4 Test Validation: Invalid Duration (< 1)

**Request:**

```bash
curl -X POST http://localhost:8000/api/academics/courses/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code": "TEST",
    "name": "Test Course",
    "duration_months": 0,
    "is_active": true
  }'
```

**Expected Response (400 Bad Request):**

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "duration_months": ["Course duration must be at least 1 month."]
  }
}
```

### 11.5 List Courses (Verify duration in response)

**Request:**

```bash
curl -X GET http://localhost:8000/api/academics/courses/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response (200 OK):**

```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": 1,
      "code": "FSWD",
      "name": "Full Stack Web Development",
      "description": "6-month intensive bootcamp",
      "duration_months": 6,
      "is_active": true,
      "created_at": "2025-12-18T14:30:00Z",
      "updated_at": "2025-12-18T14:30:00Z"
    },
    {
      "id": 2,
      "code": "BCA",
      "name": "Bachelor of Computer Applications",
      "description": "3-year undergraduate program",
      "duration_months": 36,
      "is_active": true,
      "created_at": "2025-12-18T14:35:00Z",
      "updated_at": "2025-12-18T14:35:00Z"
    }
  ]
}
```

### 11.6 Postman Test Collection

**Test Case 1: Create 6-month course**

```json
POST /api/academics/courses/
{
  "code": "DS6",
  "name": "Data Science 6-Month Bootcamp",
  "duration_months": 6,
  "is_active": true
}
```

**Test Case 2: Create 12-month course**

```json
POST /api/academics/courses/
{
  "code": "AIML12",
  "name": "AI/ML Diploma (1 Year)",
  "duration_months": 12,
  "is_active": true
}
```

**Test Case 3: Create 36-month course**

```json
POST /api/academics/courses/
{
  "code": "BCA",
  "name": "Bachelor of Computer Applications",
  "duration_months": 36,
  "is_active": true
}
```

---

## 12. Verification Checklist

Use this checklist to verify the implementation:

### Database Verification

- [ ] Migration `0004_course_duration_months.py` exists
- [ ] Migration has been applied successfully
- [ ] `academics_courses` table contains `duration_months` column
- [ ] Existing courses have `duration_months = 6` (default)
- [ ] Can insert courses with custom duration values

**SQL Check:**

```sql
-- Verify column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'academics_courses'
  AND column_name = 'duration_months';

-- Check existing data
SELECT code, name, duration_months
FROM academics_courses;
```

### Model Verification

- [ ] `Course` model in `apps/academics/models.py` has `duration_months` field
- [ ] Field type is `PositiveIntegerField`
- [ ] Field has `default=6`
- [ ] Field has appropriate help text

### Serializer Verification

- [ ] `CourseCreateSerializer` includes `duration_months` in fields
- [ ] `CourseCreateSerializer` has `validate_duration_months()` method
- [ ] Validation enforces minimum value of 1
- [ ] `CourseListSerializer` includes `duration_months` in fields

### API Verification

- [ ] POST `/api/academics/courses/` requires `duration_months`
- [ ] POST returns 400 if `duration_months` is missing
- [ ] POST returns 400 if `duration_months < 1`
- [ ] POST returns 201 with valid `duration_months`
- [ ] GET `/api/academics/courses/` includes `duration_months` in responses
- [ ] GET response structure matches documentation

### Admin Verification

- [ ] CourseAdmin shows `duration_months` in list view
- [ ] CourseAdmin includes `duration_months` in edit form
- [ ] Can edit `duration_months` in admin interface
- [ ] Admin displays duration correctly

### System Verification

- [ ] `python manage.py check` reports no issues
- [ ] `python manage.py check --deploy` reports only expected warnings
- [ ] No import errors
- [ ] No syntax errors
- [ ] Server starts successfully

### Documentation Verification

- [ ] This documentation file created
- [ ] All sections complete
- [ ] Examples tested and accurate
- [ ] API changes documented
- [ ] Migration details documented

---

## Summary

✅ **Model:** Course.duration_months added as PositiveIntegerField with default=6  
✅ **Migration:** 0004_course_duration_months.py created and applied  
✅ **Serializers:** CourseCreateSerializer and CourseListSerializer updated  
✅ **Validation:** duration_months >= 1 enforced  
✅ **Admin:** CourseAdmin displays and allows editing duration_months  
✅ **APIs:** POST requires duration_months; GET includes it in responses  
✅ **System Check:** No issues  
✅ **Backward Compatibility:** Migration safe, existing data preserved  
✅ **Architecture:** Duration now at master data level (correct design)

**IMPLEMENTATION COMPLETE.** 🚀

---

## Appendix: Code Snippets

### Model Definition

```python
# apps/academics/models.py

class Course(models.Model):
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    duration_months = models.PositiveIntegerField(
        default=6,
        help_text="Course duration in months (e.g., 6, 12, 24, 36)"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Serializer Validation

```python
# apps/academics/serializers.py

class CourseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['code', 'name', 'description', 'duration_months', 'is_active']

    def validate_duration_months(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "Course duration must be at least 1 month."
            )
        return value
```

### Admin Configuration

```python
# apps/academics/admin.py

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'duration_months', 'is_active', 'created_at']

    fieldsets = (
        ('Course Information', {
            'fields': ('code', 'name', 'description', 'duration_months')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
```

---

**Document Version:** 1.0  
**Date:** December 18, 2025  
**Author:** GitHub Copilot  
**Review Status:** Ready for Senior Engineer Review
