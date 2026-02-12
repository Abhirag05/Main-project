# Batch Management - Backend API Documentation

## Executive Summary

This document provides comprehensive documentation for the **Batch Management System** implemented in the ISSD Campus ERP backend. The system consists of two main layers:

1. **Batch Templates** (Super Admin) - Reusable batch configurations
2. **Batch Execution** (Centre Admin) - Actual batches created from templates
3. **Faculty Assignment** - Assigning faculty to batches

**Implementation Status:** ✅ Complete  
**Database Schema:** PostgreSQL with relational integrity  
**Authentication:** JWT Bearer Token  
**Permissions:** Role-based access control

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Batch Template APIs](#batch-template-apis)
4. [Batch Execution APIs](#batch-execution-apis)
5. [Faculty Batch Assignment APIs](#faculty-batch-assignment-apis)
6. [Helper APIs](#helper-apis)
7. [Permission Matrix](#permission-matrix)
8. [Error Handling](#error-handling)
9. [Usage Examples](#usage-examples)
10. [Testing Guide](#testing-guide)

---

## Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPER ADMIN LAYER                        │
│                  (Batch Template Management)                │
│                                                             │
│  - Create reusable batch templates                         │
│  - Define course, mode, max students                       │
│  - Activate/deactivate templates                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   CENTRE ADMIN LAYER                        │
│                  (Batch Execution Management)               │
│                                                             │
│  - Create batches from templates                           │
│  - Manage batch lifecycle (Active → Completed/Cancelled)   │
│  - Centre-scoped access control                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   FACULTY ASSIGNMENT                        │
│                                                             │
│  - Assign faculty to batches                               │
│  - Track faculty workload                                  │
│  - Maintain assignment history                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Concepts

**Batch Template:**

- Reusable configuration created by Super Admin
- Defines: Course, Mode (Live/Recorded), Max Students
- Templates are used by Centre Admins to create actual batches

**Batch (Execution):**

- Actual instance created from a template
- Has: Start Date, End Date, Status, Centre, Unique Code
- Auto-generates unique batch code: `COURSE-MODE-MMYYYY-CENTRE`
- Example: `FSWD-LIVE-012025-HYD`

**Faculty Assignment:**

- Links faculty members to batches
- Tracks assignment history and who assigned whom
- Supports multiple faculty per batch

---

## Database Schema

### BatchTemplate Model

```python
class BatchTemplate(models.Model):
    """Reusable batch configuration (Super Admin)"""

    course = ForeignKey('academics.Course')      # Which course
    name = CharField(max_length=100)             # Template name
    mode = CharField(choices=['LIVE', 'RECORDED']) # Delivery mode
    max_students = PositiveIntegerField()        # Capacity
    is_active = BooleanField(default=True)       # Active status
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

    unique_together = [['course', 'mode']]
```

**Table:** `batch_templates`

### Batch Model

```python
class Batch(models.Model):
    """Actual batch instance (Centre Admin)"""

    template = ForeignKey(BatchTemplate)          # Template used
    centre = ForeignKey('centres.Centre')         # Which centre
    code = CharField(max_length=50, unique=True)  # Auto-generated code
    start_date = DateField()                      # Batch start
    end_date = DateField()                        # Batch end
    status = CharField(choices=['ACTIVE', 'COMPLETED', 'CANCELLED'])
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

**Table:** `batches`

### FacultyBatchAssignment Model

```python
class FacultyBatchAssignment(models.Model):
    """Faculty to Batch assignment"""

    faculty = ForeignKey('faculty.FacultyProfile')
    batch = ForeignKey(Batch)
    is_active = BooleanField(default=True)
    assigned_at = DateTimeField(auto_now_add=True)
    assigned_by = ForeignKey(User, null=True)

    unique_together = [['faculty', 'batch']]
```

**Table:** `faculty_batch_assignments`

---

## Batch Template APIs

### 1. List All Batch Templates

**Endpoint:** `GET /api/batch/templates/`

**Description:** Retrieve all batch templates with optional filters.

**Authentication:** Required (JWT Bearer Token)

**Permissions:** All authenticated users (Read-only for non-Super Admins)

**Query Parameters:**

| Parameter | Type    | Required | Description                              |
| --------- | ------- | -------- | ---------------------------------------- |
| course    | integer | No       | Filter by course ID                      |
| mode      | string  | No       | Filter by mode (`LIVE` or `RECORDED`)    |
| is_active | boolean | No       | Filter by active status (`true`/`false`) |

**Request Example:**

```bash
GET /api/batch/templates/?course=1&mode=LIVE&is_active=true
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "course": 1,
    "course_detail": {
      "id": 1,
      "name": "Full Stack Web Development",
      "code": "FSWD",
      "duration_months": 6
    },
    "name": "FSWD Live Template",
    "mode": "LIVE",
    "max_students": 30,
    "is_active": true,
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z"
  },
  {
    "id": 2,
    "course": 1,
    "course_detail": {
      "id": 1,
      "name": "Full Stack Web Development",
      "code": "FSWD",
      "duration_months": 6
    },
    "name": "FSWD Recorded Template",
    "mode": "RECORDED",
    "max_students": 50,
    "is_active": true,
    "created_at": "2025-01-15T11:00:00Z",
    "updated_at": "2025-01-15T11:00:00Z"
  }
]
```

---

### 2. Get Single Batch Template

**Endpoint:** `GET /api/batch/templates/{id}/`

**Description:** Retrieve details of a specific batch template.

**Authentication:** Required

**Permissions:** All authenticated users

**URL Parameters:**

| Parameter | Type    | Required | Description |
| --------- | ------- | -------- | ----------- |
| id        | integer | Yes      | Template ID |

**Request Example:**

```bash
GET /api/batch/templates/1/
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "id": 1,
  "course": 1,
  "course_detail": {
    "id": 1,
    "name": "Full Stack Web Development",
    "code": "FSWD",
    "duration_months": 6
  },
  "name": "FSWD Live Template",
  "mode": "LIVE",
  "max_students": 30,
  "is_active": true,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

---

### 3. Create Batch Template

**Endpoint:** `POST /api/batch/templates/`

**Description:** Create a new batch template.

**Authentication:** Required

**Permissions:** `SUPER_ADMIN` role only

**Request Body:**

```json
{
  "course": 1,
  "name": "FSWD Live Template",
  "mode": "LIVE",
  "max_students": 30,
  "is_active": true
}
```

**Field Validation:**

| Field        | Type    | Required | Constraints                  |
| ------------ | ------- | -------- | ---------------------------- |
| course       | integer | Yes      | Must be valid Course ID      |
| name         | string  | Yes      | Max 100 characters           |
| mode         | string  | Yes      | Must be `LIVE` or `RECORDED` |
| max_students | integer | Yes      | Must be > 0                  |
| is_active    | boolean | No       | Default: `true`              |

**Request Example:**

```bash
POST /api/batch/templates/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "course": 1,
  "name": "Data Science Live Template",
  "mode": "LIVE",
  "max_students": 25,
  "is_active": true
}
```

**Response (201 Created):**

```json
{
  "id": 3,
  "course": 1,
  "course_detail": {
    "id": 1,
    "name": "Full Stack Web Development",
    "code": "FSWD",
    "duration_months": 6
  },
  "name": "Data Science Live Template",
  "mode": "LIVE",
  "max_students": 25,
  "is_active": true,
  "created_at": "2025-12-22T10:00:00Z",
  "updated_at": "2025-12-22T10:00:00Z"
}
```

**Error Response (400 Bad Request):**

```json
{
  "errors": {
    "course": ["This field is required."],
    "mode": ["\"HYBRID\" is not a valid choice."]
  }
}
```

**Error Response (403 Forbidden):**

```json
{
  "detail": "You do not have permission to perform this action."
}
```

**Unique Constraint Violation:**

```json
{
  "errors": {
    "non_field_errors": [
      "Batch template with this course and mode already exists."
    ]
  }
}
```

---

### 4. Update Batch Template

**Endpoint:** `PUT /api/batch/templates/{id}/`

**Description:** Full update of a batch template.

**Authentication:** Required

**Permissions:** `SUPER_ADMIN` role only

**Request Body:**

```json
{
  "course": 1,
  "name": "FSWD Live Template (Updated)",
  "mode": "LIVE",
  "max_students": 35,
  "is_active": true
}
```

**Request Example:**

```bash
PUT /api/batch/templates/1/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "course": 1,
  "name": "FSWD Live Template (Updated)",
  "mode": "LIVE",
  "max_students": 35,
  "is_active": true
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "course": 1,
  "course_detail": {
    "id": 1,
    "name": "Full Stack Web Development",
    "code": "FSWD",
    "duration_months": 6
  },
  "name": "FSWD Live Template (Updated)",
  "mode": "LIVE",
  "max_students": 35,
  "is_active": true,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-12-22T11:30:00Z"
}
```

---

### 5. Delete (Deactivate) Batch Template

**Endpoint:** `DELETE /api/batch/templates/{id}/`

**Description:** Soft delete - sets `is_active=False` instead of deleting.

**Authentication:** Required

**Permissions:** `SUPER_ADMIN` role only

**Request Example:**

```bash
DELETE /api/batch/templates/1/
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "message": "Template disabled successfully"
}
```

**Note:** This is a soft delete to prevent foreign key constraint issues with existing batches.

---

## Batch Execution APIs

### 1. List All Batches

**Endpoint:** `GET /api/batches/`

**Description:** List all batches (centre-scoped for Centre Admin).

**Authentication:** Required

**Permissions:**

- `CENTRE_ADMIN`: Only their centre's batches
- `SUPER_ADMIN`: All batches (read-only)

**Query Parameters:**

| Parameter | Type    | Required | Description                                           |
| --------- | ------- | -------- | ----------------------------------------------------- |
| course    | integer | No       | Filter by course ID                                   |
| status    | string  | No       | Filter by status (`ACTIVE`, `COMPLETED`, `CANCELLED`) |
| month     | integer | No       | Filter by start month (1-12)                          |
| year      | integer | No       | Filter by start year (e.g., 2025)                     |

**Request Example:**

```bash
GET /api/batches/?status=ACTIVE&month=1&year=2025
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "template": 1,
    "template_detail": {
      "id": 1,
      "name": "FSWD Live Template",
      "mode": "LIVE",
      "max_students": 30
    },
    "centre": 1,
    "centre_name": "Hyderabad Centre",
    "centre_code": "HYD",
    "code": "FSWD-LIVE-012025-HYD",
    "start_date": "2025-01-20",
    "end_date": "2025-07-20",
    "status": "ACTIVE",
    "course_name": "Full Stack Web Development",
    "course_code": "FSWD",
    "course_duration_months": 6,
    "mode": "LIVE",
    "max_students": 30,
    "current_student_count": 18,
    "is_active": true,
    "created_at": "2025-01-10T09:00:00Z",
    "updated_at": "2025-01-10T09:00:00Z"
  }
]
```

---

### 2. Get Single Batch

**Endpoint:** `GET /api/batches/{id}/`

**Description:** Retrieve details of a specific batch.

**Authentication:** Required

**Permissions:**

- `CENTRE_ADMIN`: Only their centre's batches
- `SUPER_ADMIN`: All batches (read-only)

**Request Example:**

```bash
GET /api/batches/1/
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "id": 1,
  "template": 1,
  "template_detail": {
    "id": 1,
    "name": "FSWD Live Template",
    "mode": "LIVE",
    "max_students": 30,
    "course": {
      "id": 1,
      "name": "Full Stack Web Development",
      "code": "FSWD",
      "duration_months": 6
    }
  },
  "centre": 1,
  "centre_name": "Hyderabad Centre",
  "centre_code": "HYD",
  "code": "FSWD-LIVE-012025-HYD",
  "start_date": "2025-01-20",
  "end_date": "2025-07-20",
  "status": "ACTIVE",
  "course_name": "Full Stack Web Development",
  "course_code": "FSWD",
  "course_duration_months": 6,
  "mode": "LIVE",
  "max_students": 30,
  "current_student_count": 18,
  "is_active": true,
  "created_at": "2025-01-10T09:00:00Z",
  "updated_at": "2025-01-10T09:00:00Z"
}
```

---

### 3. Create Batch from Template

**Endpoint:** `POST /api/batches/`

**Description:** Create a new batch from an active template.

**Authentication:** Required

**Permissions:** `CENTRE_ADMIN` role only

**Request Body:**

```json
{
  "template_id": 1,
  "start_date": "2025-02-01",
  "end_date": "2025-08-01"
}
```

**Field Validation:**

| Field       | Type    | Required | Constraints              |
| ----------- | ------- | -------- | ------------------------ |
| template_id | integer | Yes      | Must be active template  |
| start_date  | date    | Yes      | Format: `YYYY-MM-DD`     |
| end_date    | date    | Yes      | Must be after start_date |

**Request Example:**

```bash
POST /api/batches/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "template_id": 1,
  "start_date": "2025-02-01",
  "end_date": "2025-08-01"
}
```

**Response (201 Created):**

```json
{
  "id": 2,
  "template": 1,
  "template_detail": {
    "id": 1,
    "name": "FSWD Live Template",
    "mode": "LIVE",
    "max_students": 30,
    "course": {
      "id": 1,
      "name": "Full Stack Web Development",
      "code": "FSWD",
      "duration_months": 6
    }
  },
  "centre": 1,
  "centre_name": "Hyderabad Centre",
  "centre_code": "HYD",
  "code": "FSWD-LIVE-022025-HYD",
  "start_date": "2025-02-01",
  "end_date": "2025-08-01",
  "status": "ACTIVE",
  "course_name": "Full Stack Web Development",
  "course_code": "FSWD",
  "course_duration_months": 6,
  "mode": "LIVE",
  "max_students": 30,
  "current_student_count": 0,
  "is_active": true,
  "created_at": "2025-12-22T12:00:00Z",
  "updated_at": "2025-12-22T12:00:00Z"
}
```

**Batch Code Generation:**

Format: `<COURSE_CODE>-<MODE>-<MMYYYY>-<CENTRE_CODE>`

Examples:

- `FSWD-LIVE-012025-HYD`
- `FSWD-RECORDED-022025-BLR`
- `DS-LIVE-032025-HYD-1` (if duplicate, counter added)

**Error Response (400 Bad Request):**

```json
{
  "errors": {
    "end_date": ["End date must be after start date."]
  }
}
```

---

### 4. Update Batch Status

**Endpoint:** `PATCH /api/batches/{id}/status/`

**Description:** Update batch status (lifecycle management).

**Authentication:** Required

**Permissions:** `CENTRE_ADMIN` (own centre only)

**Allowed Status Transitions:**

- `ACTIVE` → `COMPLETED`
- `ACTIVE` → `CANCELLED`

**Request Body:**

```json
{
  "status": "COMPLETED"
}
```

**Request Example:**

```bash
PATCH /api/batches/1/status/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "COMPLETED"
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "template": 1,
  "centre": 1,
  "centre_name": "Hyderabad Centre",
  "centre_code": "HYD",
  "code": "FSWD-LIVE-012025-HYD",
  "start_date": "2025-01-20",
  "end_date": "2025-07-20",
  "status": "COMPLETED",
  "is_active": true,
  "created_at": "2025-01-10T09:00:00Z",
  "updated_at": "2025-12-22T13:00:00Z"
}
```

**Error Response (400 Bad Request):**

```json
{
  "errors": {
    "status": ["Invalid status transition."]
  }
}
```

---

### 5. Get Active Batch Templates

**Endpoint:** `GET /api/batches/templates/active/`

**Description:** List all active batch templates (for dropdown in batch creation form).

**Authentication:** Required

**Permissions:** All authenticated users

**Request Example:**

```bash
GET /api/batches/templates/active/
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "course": 1,
    "course_detail": {
      "id": 1,
      "name": "Full Stack Web Development",
      "code": "FSWD",
      "duration_months": 6
    },
    "name": "FSWD Live Template",
    "mode": "LIVE",
    "max_students": 30
  },
  {
    "id": 2,
    "course": 2,
    "course_detail": {
      "id": 2,
      "name": "Data Science",
      "code": "DS",
      "duration_months": 12
    },
    "name": "DS Recorded Template",
    "mode": "RECORDED",
    "max_students": 50
  }
]
```

---

## Faculty Batch Assignment APIs

### 1. List Faculty Batch Assignments

**Endpoint:** `GET /api/faculty/batch-assignments/`

**Description:** List all faculty-batch assignments with optional filters.

**Authentication:** Required

**Permissions:** `faculty.view` permission

**Query Parameters:**

| Parameter  | Type    | Required | Description             |
| ---------- | ------- | -------- | ----------------------- |
| faculty_id | integer | No       | Filter by faculty ID    |
| batch_id   | integer | No       | Filter by batch ID      |
| is_active  | boolean | No       | Filter by active status |

**Request Example:**

```bash
GET /api/faculty/batch-assignments/?batch_id=1&is_active=true
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "faculty": {
      "id": 5,
      "employee_code": "FAC001",
      "user": {
        "id": 10,
        "full_name": "John Doe",
        "email": "john.doe@example.com"
      }
    },
    "batch": {
      "id": 1,
      "code": "FSWD-LIVE-012025-HYD",
      "course_name": "Full Stack Web Development",
      "status": "ACTIVE"
    },
    "is_active": true,
    "assigned_at": "2025-01-15T10:00:00Z",
    "assigned_by": {
      "id": 1,
      "full_name": "Admin User"
    }
  }
]
```

---

### 2. Create Faculty Batch Assignment

**Endpoint:** `POST /api/faculty/batch-assignments/`

**Description:** Assign a faculty member to a batch.

**Authentication:** Required

**Permissions:** `faculty.assign` permission

**Request Body:**

```json
{
  "faculty": 5,
  "batch": 1
}
```

**Field Validation:**

| Field   | Type    | Required | Constraints              |
| ------- | ------- | -------- | ------------------------ |
| faculty | integer | Yes      | Must be valid Faculty ID |
| batch   | integer | Yes      | Must be valid Batch ID   |

**Request Example:**

```bash
POST /api/faculty/batch-assignments/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "faculty": 5,
  "batch": 2
}
```

**Response (201 Created):**

```json
{
  "id": 2,
  "faculty": {
    "id": 5,
    "employee_code": "FAC001",
    "user": {
      "id": 10,
      "full_name": "John Doe",
      "email": "john.doe@example.com"
    }
  },
  "batch": {
    "id": 2,
    "code": "FSWD-LIVE-022025-HYD",
    "course_name": "Full Stack Web Development",
    "status": "ACTIVE"
  },
  "is_active": true,
  "assigned_at": "2025-12-22T14:00:00Z",
  "assigned_by": {
    "id": 1,
    "full_name": "Admin User"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "errors": {
    "non_field_errors": [
      "Faculty batch assignment with this faculty and batch already exists."
    ]
  }
}
```

---

### 3. Get Faculty Batch Assignment Details

**Endpoint:** `GET /api/faculty/batch-assignments/{id}/`

**Description:** Retrieve details of a specific assignment.

**Authentication:** Required

**Permissions:** `faculty.view` permission

**Request Example:**

```bash
GET /api/faculty/batch-assignments/1/
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "id": 1,
  "faculty": {
    "id": 5,
    "employee_code": "FAC001",
    "user": {
      "id": 10,
      "full_name": "John Doe",
      "email": "john.doe@example.com"
    }
  },
  "batch": {
    "id": 1,
    "code": "FSWD-LIVE-012025-HYD",
    "course_name": "Full Stack Web Development",
    "status": "ACTIVE"
  },
  "is_active": true,
  "assigned_at": "2025-01-15T10:00:00Z",
  "assigned_by": {
    "id": 1,
    "full_name": "Admin User"
  }
}
```

---

### 4. Update Faculty Batch Assignment

**Endpoint:** `PATCH /api/faculty/batch-assignments/{id}/`

**Description:** Update assignment (change batch or status).

**Authentication:** Required

**Permissions:** `faculty.assign` permission

**Request Body:**

```json
{
  "batch": 3,
  "is_active": true
}
```

**Request Example:**

```bash
PATCH /api/faculty/batch-assignments/1/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "is_active": false
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "faculty": {
    "id": 5,
    "employee_code": "FAC001",
    "user": {
      "id": 10,
      "full_name": "John Doe",
      "email": "john.doe@example.com"
    }
  },
  "batch": {
    "id": 1,
    "code": "FSWD-LIVE-012025-HYD",
    "course_name": "Full Stack Web Development",
    "status": "ACTIVE"
  },
  "is_active": false,
  "assigned_at": "2025-01-15T10:00:00Z",
  "assigned_by": {
    "id": 1,
    "full_name": "Admin User"
  }
}
```

---

### 5. Delete Faculty Batch Assignment

**Endpoint:** `DELETE /api/faculty/batch-assignments/{id}/`

**Description:** Remove faculty assignment from batch.

**Authentication:** Required

**Permissions:** `faculty.assign` permission

**Request Example:**

```bash
DELETE /api/faculty/batch-assignments/1/
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "message": "Faculty batch assignment deleted successfully."
}
```

---

### 6. Get Faculty Assignment Summary

**Endpoint:** `GET /api/faculty/{faculty_id}/assignment-summary/`

**Description:** Get all subjects and batches assigned to a faculty member.

**Authentication:** Required

**Permissions:** `faculty.view` permission

**Request Example:**

```bash
GET /api/faculty/5/assignment-summary/
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "faculty": {
    "id": 5,
    "employee_code": "FAC001",
    "full_name": "John Doe",
    "email": "john.doe@example.com"
  },
  "subjects": [
    {
      "id": 1,
      "code": "HTML",
      "name": "HTML & CSS Fundamentals"
    },
    {
      "id": 2,
      "code": "JS",
      "name": "JavaScript Basics"
    }
  ],
  "batches": [
    {
      "id": 1,
      "code": "FSWD-LIVE-012025-HYD",
      "course_name": "Full Stack Web Development",
      "status": "ACTIVE",
      "start_date": "2025-01-20",
      "end_date": "2025-07-20"
    }
  ]
}
```

---

## Helper APIs

### 1. Get Courses for Batch Templates

**Endpoint:** `GET /api/batch/courses/`

**Description:** List all active courses (for dropdowns in batch template forms).

**Authentication:** Required

**Permissions:** All authenticated users

**Request Example:**

```bash
GET /api/batch/courses/
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "name": "Full Stack Web Development",
    "code": "FSWD",
    "duration_months": 6
  },
  {
    "id": 2,
    "name": "Data Science",
    "code": "DS",
    "duration_months": 12
  }
]
```

---

## Permission Matrix

### Batch Templates

| Operation       | Endpoint                          | SUPER_ADMIN   | CENTRE_ADMIN | Other Roles  |
| --------------- | --------------------------------- | ------------- | ------------ | ------------ |
| List Templates  | GET /api/batch/templates/         | ✅ Read/Write | ✅ Read Only | ✅ Read Only |
| Get Template    | GET /api/batch/templates/{id}/    | ✅            | ✅           | ✅           |
| Create Template | POST /api/batch/templates/        | ✅            | ❌           | ❌           |
| Update Template | PUT /api/batch/templates/{id}/    | ✅            | ❌           | ❌           |
| Delete Template | DELETE /api/batch/templates/{id}/ | ✅            | ❌           | ❌           |

### Batch Execution

| Operation            | Endpoint                           | SUPER_ADMIN         | CENTRE_ADMIN       | Other Roles |
| -------------------- | ---------------------------------- | ------------------- | ------------------ | ----------- |
| List Batches         | GET /api/batches/                  | ✅ All batches (RO) | ✅ Own centre only | ❌          |
| Get Batch            | GET /api/batches/{id}/             | ✅                  | ✅ Own centre only | ❌          |
| Create Batch         | POST /api/batches/                 | ❌                  | ✅                 | ❌          |
| Update Status        | PATCH /api/batches/{id}/status/    | ❌                  | ✅ Own centre only | ❌          |
| Get Active Templates | GET /api/batches/templates/active/ | ✅                  | ✅                 | ✅          |

### Faculty Assignments

| Operation          | Endpoint                                    | Required Permission |
| ------------------ | ------------------------------------------- | ------------------- |
| List Assignments   | GET /api/faculty/batch-assignments/         | `faculty.view`      |
| Create Assignment  | POST /api/faculty/batch-assignments/        | `faculty.assign`    |
| Get Assignment     | GET /api/faculty/batch-assignments/{id}/    | `faculty.view`      |
| Update Assignment  | PATCH /api/faculty/batch-assignments/{id}/  | `faculty.assign`    |
| Delete Assignment  | DELETE /api/faculty/batch-assignments/{id}/ | `faculty.assign`    |
| Assignment Summary | GET /api/faculty/{id}/assignment-summary/   | `faculty.view`      |

---

## Error Handling

### Standard Error Format

```json
{
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

### Common HTTP Status Codes

| Status Code               | Meaning               | When It Occurs                |
| ------------------------- | --------------------- | ----------------------------- |
| 200 OK                    | Success               | GET, PATCH, DELETE successful |
| 201 Created               | Created               | POST successful               |
| 400 Bad Request           | Validation Error      | Invalid data, missing fields  |
| 401 Unauthorized          | Authentication Failed | Invalid/expired token         |
| 403 Forbidden             | Permission Denied     | Insufficient permissions      |
| 404 Not Found             | Resource Not Found    | Invalid ID, deleted resource  |
| 500 Internal Server Error | Server Error          | Unexpected server issue       |

### Example Error Responses

**Missing Required Field:**

```json
{
  "errors": {
    "course": ["This field is required."]
  }
}
```

**Invalid Choice:**

```json
{
  "errors": {
    "mode": ["\"HYBRID\" is not a valid choice."]
  }
}
```

**Unique Constraint Violation:**

```json
{
  "errors": {
    "non_field_errors": [
      "Batch template with this course and mode already exists."
    ]
  }
}
```

**Permission Denied:**

```json
{
  "detail": "You do not have permission to perform this action."
}
```

**Token Expired:**

```json
{
  "detail": "Given token not valid for any token type",
  "code": "token_not_valid",
  "messages": [
    {
      "token_class": "AccessToken",
      "token_type": "access",
      "message": "Token is invalid or expired"
    }
  ]
}
```

---

## Usage Examples

### Example 1: Super Admin Creates Batch Template

```bash
# Step 1: Login as Super Admin
POST /api/auth/login/
{
  "email": "superadmin@example.com",
  "password": "password123"
}

# Response: Get access_token

# Step 2: Create Batch Template
POST /api/batch/templates/
Authorization: Bearer <access_token>
{
  "course": 1,
  "name": "FSWD Live Template",
  "mode": "LIVE",
  "max_students": 30,
  "is_active": true
}

# Response: Template created with ID 1
```

### Example 2: Centre Admin Creates Batch from Template

```bash
# Step 1: Login as Centre Admin
POST /api/auth/login/
{
  "email": "centreadmin@hyderabad.example.com",
  "password": "password123"
}

# Step 2: Get Active Templates
GET /api/batches/templates/active/
Authorization: Bearer <access_token>

# Step 3: Create Batch from Template
POST /api/batches/
Authorization: Bearer <access_token>
{
  "template_id": 1,
  "start_date": "2025-02-01",
  "end_date": "2025-08-01"
}

# Response: Batch created with code FSWD-LIVE-022025-HYD
```

### Example 3: Assign Faculty to Batch

```bash
# Step 1: Login with appropriate permissions
POST /api/auth/login/

# Step 2: Assign Faculty to Batch
POST /api/faculty/batch-assignments/
Authorization: Bearer <access_token>
{
  "faculty": 5,
  "batch": 1
}

# Response: Assignment created successfully
```

### Example 4: Complete Batch Lifecycle

```bash
# Step 1: Create Batch (Centre Admin)
POST /api/batches/
{
  "template_id": 1,
  "start_date": "2025-02-01",
  "end_date": "2025-08-01"
}

# Step 2: Assign Faculty to Batch
POST /api/faculty/batch-assignments/
{
  "faculty": 5,
  "batch": 2
}

# Step 3: Mark Batch as Completed
PATCH /api/batches/2/status/
{
  "status": "COMPLETED"
}
```

---

## Testing Guide

### Manual Testing with cURL

**1. Create Batch Template:**

```bash
curl -X POST http://localhost:8000/api/batch/templates/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "course": 1,
    "name": "FSWD Live Template",
    "mode": "LIVE",
    "max_students": 30,
    "is_active": true
  }'
```

**2. List Batch Templates:**

```bash
curl -X GET http://localhost:8000/api/batch/templates/ \
  -H "Authorization: Bearer <access_token>"
```

**3. Create Batch:**

```bash
curl -X POST http://localhost:8000/api/batches/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": 1,
    "start_date": "2025-02-01",
    "end_date": "2025-08-01"
  }'
```

**4. Assign Faculty to Batch:**

```bash
curl -X POST http://localhost:8000/api/faculty/batch-assignments/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "faculty": 5,
    "batch": 1
  }'
```

### Testing with Postman

**Collection Setup:**

1. Create environment with variables:

   - `base_url`: `http://localhost:8000/api`
   - `access_token`: (set after login)

2. Create requests:
   - Login → Save token to `access_token`
   - Create Template → Use `{{access_token}}`
   - Create Batch → Use template ID from previous response

---

## Summary

### Key Features

✅ **Two-Layer Architecture:** Template (Super Admin) → Execution (Centre Admin)  
✅ **Role-Based Access Control:** Enforced at API and database level  
✅ **Auto-Generated Batch Codes:** Unique, predictable format  
✅ **Faculty Assignment Tracking:** Complete audit trail  
✅ **Centre-Scoped Data:** Centre Admins see only their batches  
✅ **Soft Delete:** Templates deactivated, not deleted  
✅ **Audit Logging:** All assignments tracked with timestamps

### Total APIs

| Category            | Count  | Endpoints                                          |
| ------------------- | ------ | -------------------------------------------------- |
| Batch Templates     | 5      | List, Get, Create, Update, Delete                  |
| Batch Execution     | 5      | List, Get, Create, Update Status, Active Templates |
| Faculty Assignments | 6      | List, Get, Create, Update, Delete, Summary         |
| Helper APIs         | 1      | Get Courses                                        |
| **Total**           | **17** | **Complete CRUD + Management**                     |

### Database Tables

| Table                       | Records         | Purpose                  |
| --------------------------- | --------------- | ------------------------ |
| `batch_templates`           | Templates       | Reusable configurations  |
| `batches`                   | Batch instances | Actual running batches   |
| `faculty_batch_assignments` | Assignments     | Faculty-to-batch mapping |

### Production Checklist

- [x] All APIs implemented and tested
- [x] Permission checks enforced
- [x] Database constraints in place
- [x] Audit logging enabled
- [x] Error handling standardized
- [x] Documentation complete
- [ ] Frontend integration
- [ ] Load testing
- [ ] Security audit

---

**Documentation Version:** 1.0  
**Last Updated:** December 22, 2025  
**Backend Status:** ✅ Production Ready  
**API Coverage:** 100%

---

**Quick Reference:**

- **Base URL:** `http://localhost:8000/api`
- **Authentication:** JWT Bearer Token
- **Content-Type:** `application/json`
- **Batch Code Format:** `COURSE-MODE-MMYYYY-CENTRE`
- **Date Format:** `YYYY-MM-DD`

**Need Help?** Refer to specific API sections above for detailed examples and error handling.
