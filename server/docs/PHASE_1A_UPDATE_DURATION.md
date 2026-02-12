# PHASE 1A UPDATE — Course Duration Re-Added

## Quick Reference

**Date:** December 18, 2025  
**Change:** Re-added `duration_months` field to Course model  
**Migration:** `0004_course_duration_months.py`  
**Status:** ✅ COMPLETE

---

## What Changed

The `duration_months` field has been **re-added** to the Course model. This corrects an architectural oversight from migration 0003.

### Updated Course Model

**Before:**

```python
class Course(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**After:**

```python
class Course(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    duration_months = models.PositiveIntegerField(default=6)  # ← NEW
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

---

## API Changes

### Create Course — UPDATED

**Endpoint:** `POST /api/academics/courses/`

**New Required Field:** `duration_months`

**Example Request:**

```json
{
  "code": "BHM",
  "name": "Bachelor of Hospitality Management",
  "description": "3-year hospitality program",
  "duration_months": 36,
  "is_active": true
}
```

**Example Response (201 Created):**

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

### List Courses — UPDATED

**Endpoint:** `GET /api/academics/courses/`

**Updated Response:** Now includes `duration_months` in each course object.

**Example Response (200 OK):**

```json
{
  "status": "success",
  "count": 2,
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

---

## Validation Rules

| Rule             | Error Message                               |
| ---------------- | ------------------------------------------- |
| Required         | "This field is required."                   |
| Type: Integer    | "A valid integer is required."              |
| Minimum Value: 1 | "Course duration must be at least 1 month." |

**Valid Examples:**

- `"duration_months": 6` (6-month course)
- `"duration_months": 12` (1-year course)
- `"duration_months": 24` (2-year course)
- `"duration_months": 36` (3-year course)

**Invalid Examples:**

- `"duration_months": 0` ❌
- `"duration_months": -5` ❌
- Missing field ❌

---

## Updated Postman Examples

### Example 1: Create 6-Month Course

```json
POST /api/academics/courses/
Authorization: Bearer YOUR_TOKEN

{
  "code": "FSWD",
  "name": "Full Stack Web Development",
  "description": "6-month intensive bootcamp",
  "duration_months": 6,
  "is_active": true
}
```

### Example 2: Create 3-Year Degree Course

```json
POST /api/academics/courses/
Authorization: Bearer YOUR_TOKEN

{
  "code": "BCA",
  "name": "Bachelor of Computer Applications",
  "description": "3-year undergraduate program",
  "duration_months": 36,
  "is_active": true
}
```

### Example 3: Hospitality Management Course

```json
POST /api/academics/courses/
Authorization: Bearer YOUR_TOKEN

{
  "code": "BHM",
  "name": "Bachelor of Hospitality Management",
  "description": "3-year hospitality program covering all aspects of hotel management",
  "duration_months": 36,
  "is_active": true
}
```

---

## Database Schema Update

**Table:** `academics_courses`

**New Column:**

| Column          | Type    | Constraints    | Default |
| --------------- | ------- | -------------- | ------- |
| duration_months | INTEGER | NOT NULL, >= 0 | 6       |

**Note:** All existing courses automatically received `duration_months = 6` during migration.

---

## Admin Interface Update

CourseAdmin now displays `duration_months`:

**List View:**
| Code | Name | Duration | Active | Created At |
|------|----------------------------------|----------|--------|------------|
| BCA | Bachelor of Computer Applications| 36 | ✓ | 2025-12-18 |
| FSWD | Full Stack Web Development | 6 | ✓ | 2025-12-18 |

**Edit Form:**

- `duration_months` is now editable in the "Course Information" section

---

## Backward Compatibility Notes

### Breaking Change ⚠️

The `POST /api/academics/courses/` endpoint now **requires** the `duration_months` field.

**Impact:**

- Any API clients creating courses must update their payloads
- Existing GET requests remain backward compatible

### Migration Safety ✅

- Migration is safe for production
- All existing courses receive default value (6 months)
- No data loss
- Fully reversible

---

## Why This Change?

### Architectural Rationale

**Course duration belongs at the master data level:**

1. **Course** = Academic blueprint (defines canonical duration)
2. **Batch** = Specific offering (uses course duration to calculate dates)

**Example:**

- Course: "BCA" has `duration_months = 36`
- Batch: "BCA Jan 2025" starts on 2025-01-15
- System calculates: end_date = 2025-01-15 + 36 months = 2028-01-15

**Benefits:**

- ✅ Single source of truth for course duration
- ✅ Consistent duration across all batches
- ✅ Easy to query courses by duration
- ✅ Prevents data inconsistencies

---

## Complete Documentation

For comprehensive details, see:

- **[COURSE_DURATION_RE_ADDED_COMPLETE.md](COURSE_DURATION_RE_ADDED_COMPLETE.md)** — Full implementation guide

---

## Quick Verification

✅ Model updated with `duration_months` field  
✅ Migration `0004_course_duration_months.py` applied  
✅ Serializers updated (CourseCreateSerializer, CourseListSerializer)  
✅ Admin interface updated  
✅ Validation added (minimum 1 month)  
✅ System check passes with no errors  
✅ Existing data preserved

**All changes verified and tested.** ✓

---

**Last Updated:** December 18, 2025  
**Phase:** 1A — Academic Master Data  
**Version:** 2.0 (with duration)
