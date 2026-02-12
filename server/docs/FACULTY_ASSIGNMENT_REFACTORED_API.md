# Faculty Assignment APIs - Refactored

## Overview

The faculty assignment system has been **refactored** to separate subject and batch assignments:

- **Faculty Subject Assignment**: Assign faculty to subjects they can teach
- **Faculty Batch Assignment**: Assign faculty to batches they will teach
- **Assignment Summary**: View all subjects and batches assigned to a faculty member

---

## 📋 API Endpoints

### Faculty Subject Assignments

| Method | Endpoint                                 | Description                  | Permission       |
| ------ | ---------------------------------------- | ---------------------------- | ---------------- |
| GET    | `/api/faculty/subject-assignments/`      | List all subject assignments | `faculty.view`   |
| POST   | `/api/faculty/subject-assignments/`      | Create subject assignment    | `faculty.assign` |
| GET    | `/api/faculty/subject-assignments/{id}/` | Get assignment details       | `faculty.view`   |
| PUT    | `/api/faculty/subject-assignments/{id}/` | Update assignment            | `faculty.assign` |
| PATCH  | `/api/faculty/subject-assignments/{id}/` | Partial update assignment    | `faculty.assign` |
| DELETE | `/api/faculty/subject-assignments/{id}/` | Delete assignment            | `faculty.assign` |

### Faculty Batch Assignments

| Method | Endpoint                               | Description                | Permission       |
| ------ | -------------------------------------- | -------------------------- | ---------------- |
| GET    | `/api/faculty/batch-assignments/`      | List all batch assignments | `faculty.view`   |
| POST   | `/api/faculty/batch-assignments/`      | Create batch assignment    | `faculty.assign` |
| GET    | `/api/faculty/batch-assignments/{id}/` | Get assignment details     | `faculty.view`   |
| PUT    | `/api/faculty/batch-assignments/{id}/` | Update assignment          | `faculty.assign` |
| PATCH  | `/api/faculty/batch-assignments/{id}/` | Partial update assignment  | `faculty.assign` |
| DELETE | `/api/faculty/batch-assignments/{id}/` | Delete assignment          | `faculty.assign` |

### Assignment Summary

| Method | Endpoint                                        | Description                              | Permission     |
| ------ | ----------------------------------------------- | ---------------------------------------- | -------------- |
| GET    | `/api/faculty/{faculty_id}/assignment-summary/` | Get all subjects and batches for faculty | `faculty.view` |

---

## 🔧 API Details

### 1. Create Faculty Subject Assignment

**POST** `/api/faculty/subject-assignments/`

Assign a subject to a faculty member.

**Request Body:**

```json
{
  "faculty_id": 1,
  "subject_id": 5
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "faculty": {
    "id": 1,
    "employee_code": "FAC001",
    "designation": "Senior Instructor",
    "user": {
      "id": 2,
      "email": "john.smith@issd.edu",
      "full_name": "John Smith",
      "phone": "1234567890"
    }
  },
  "subject": {
    "id": 5,
    "code": "PYTHON",
    "name": "Python Programming"
  },
  "is_active": true,
  "assigned_at": "2025-12-18T10:30:00.123456Z"
}
```

**Error Cases:**

- `400 Bad Request`: Faculty not active, subject not active, or duplicate assignment

---

### 2. List Faculty Subject Assignments

**GET** `/api/faculty/subject-assignments/`

List all subject assignments with optional filters.

**Query Parameters:**

- `faculty_id` - Filter by faculty ID
- `subject_id` - Filter by subject ID
- `is_active` - Filter by active status (true/false)

**Examples:**

```
GET /api/faculty/subject-assignments/
GET /api/faculty/subject-assignments/?faculty_id=1
GET /api/faculty/subject-assignments/?subject_id=5
GET /api/faculty/subject-assignments/?is_active=true
GET /api/faculty/subject-assignments/?faculty_id=1&is_active=true
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "faculty": {
      "id": 1,
      "employee_code": "FAC001",
      "designation": "Senior Instructor",
      "user": {
        "id": 2,
        "email": "john.smith@issd.edu",
        "full_name": "John Smith",
        "phone": "1234567890"
      }
    },
    "subject": {
      "id": 5,
      "code": "PYTHON",
      "name": "Python Programming"
    },
    "is_active": true,
    "assigned_at": "2025-12-18T10:30:00.123456Z"
  }
]
```

---

### 3. Update Faculty Subject Assignment

**PUT/PATCH** `/api/faculty/subject-assignments/{id}/`

Update a subject assignment.

**Request Body (PATCH - partial update):**

```json
{
  "is_active": false
}
```

OR

```json
{
  "subject_id": 10
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "faculty": {
    "id": 1,
    "employee_code": "FAC001",
    "designation": "Senior Instructor",
    "user": {
      "id": 2,
      "email": "john.smith@issd.edu",
      "full_name": "John Smith",
      "phone": "1234567890"
    }
  },
  "subject": {
    "id": 10,
    "code": "REACT",
    "name": "React Framework"
  },
  "is_active": true,
  "assigned_at": "2025-12-18T10:30:00.123456Z"
}
```

---

### 4. Delete Faculty Subject Assignment

**DELETE** `/api/faculty/subject-assignments/{id}/`

Permanently delete a subject assignment.

**Response (200 OK):**

```json
{
  "message": "Faculty subject assignment deleted successfully."
}
```

---

### 5. Create Faculty Batch Assignment

**POST** `/api/faculty/batch-assignments/`

Assign a batch to a faculty member.

**Request Body:**

```json
{
  "faculty_id": 1,
  "batch_id": 3
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "faculty": {
    "id": 1,
    "employee_code": "FAC001",
    "designation": "Senior Instructor",
    "user": {
      "id": 2,
      "email": "john.smith@issd.edu",
      "full_name": "John Smith",
      "phone": "1234567890"
    }
  },
  "batch": {
    "id": 3,
    "code": "BATCH003",
    "start_date": "2025-01-15",
    "status": "ACTIVE"
  },
  "is_active": true,
  "assigned_at": "2025-12-18T10:35:00.123456Z"
}
```

**Error Cases:**

- `400 Bad Request`: Faculty not active, batch not active, or duplicate assignment

---

### 6. List Faculty Batch Assignments

**GET** `/api/faculty/batch-assignments/`

List all batch assignments with optional filters.

**Query Parameters:**

- `faculty_id` - Filter by faculty ID
- `batch_id` - Filter by batch ID
- `is_active` - Filter by active status (true/false)

**Examples:**

```
GET /api/faculty/batch-assignments/
GET /api/faculty/batch-assignments/?faculty_id=1
GET /api/faculty/batch-assignments/?batch_id=3
GET /api/faculty/batch-assignments/?is_active=true
```

**Response (200 OK):**

```json
[
  {
    "id": 1,
    "faculty": {
      "id": 1,
      "employee_code": "FAC001",
      "designation": "Senior Instructor",
      "user": {
        "id": 2,
        "email": "john.smith@issd.edu",
        "full_name": "John Smith",
        "phone": "1234567890"
      }
    },
    "batch": {
      "id": 3,
      "code": "BATCH003",
      "start_date": "2025-01-15",
      "status": "ACTIVE"
    },
    "is_active": true,
    "assigned_at": "2025-12-18T10:35:00.123456Z"
  }
]
```

---

### 7. Update Faculty Batch Assignment

**PUT/PATCH** `/api/faculty/batch-assignments/{id}/`

Update a batch assignment.

**Request Body (PATCH - partial update):**

```json
{
  "is_active": false
}
```

OR

```json
{
  "batch_id": 5
}
```

**Response (200 OK):**

```json
{
  "id": 1,
  "faculty": {
    "id": 1,
    "employee_code": "FAC001",
    "designation": "Senior Instructor",
    "user": {
      "id": 2,
      "email": "john.smith@issd.edu",
      "full_name": "John Smith",
      "phone": "1234567890"
    }
  },
  "batch": {
    "id": 5,
    "code": "BATCH005",
    "start_date": "2025-02-01",
    "status": "ACTIVE"
  },
  "is_active": true,
  "assigned_at": "2025-12-18T10:35:00.123456Z"
}
```

---

### 8. Delete Faculty Batch Assignment

**DELETE** `/api/faculty/batch-assignments/{id}/`

Permanently delete a batch assignment.

**Response (200 OK):**

```json
{
  "message": "Faculty batch assignment deleted successfully."
}
```

---

### 9. Faculty Assignment Summary

**GET** `/api/faculty/{faculty_id}/assignment-summary/`

Get a summary of all subjects and batches assigned to a faculty member.

**Response (200 OK):**

```json
{
  "faculty": {
    "id": 1,
    "employee_code": "FAC001",
    "full_name": "John Smith",
    "email": "john.smith@issd.edu"
  },
  "subjects": [
    {
      "id": 1,
      "code": "HTML-CSS",
      "name": "HTML & CSS Fundamentals"
    },
    {
      "id": 2,
      "code": "JS",
      "name": "JavaScript Essentials"
    },
    {
      "id": 5,
      "code": "PYTHON",
      "name": "Python Programming"
    }
  ],
  "batches": [
    {
      "id": 1,
      "code": "BATCH001",
      "status": "ACTIVE",
      "start_date": "2024-11-18"
    },
    {
      "id": 3,
      "code": "BATCH003",
      "status": "ACTIVE",
      "start_date": "2025-01-15"
    }
  ]
}
```

---

## 🧪 Testing Workflow

### Step 1: Assign Subjects to Faculty

```bash
# Assign Python to Faculty 1
POST /api/faculty/subject-assignments/
{
  "faculty_id": 1,
  "subject_id": 7  # PYTHON
}

# Assign JavaScript to Faculty 1
POST /api/faculty/subject-assignments/
{
  "faculty_id": 1,
  "subject_id": 2  # JS
}

# Assign React to Faculty 1
POST /api/faculty/subject-assignments/
{
  "faculty_id": 1,
  "subject_id": 3  # REACT
}
```

### Step 2: Assign Batches to Faculty

```bash
# Assign BATCH001 to Faculty 1
POST /api/faculty/batch-assignments/
{
  "faculty_id": 1,
  "batch_id": 1
}

# Assign BATCH003 to Faculty 1
POST /api/faculty/batch-assignments/
{
  "faculty_id": 1,
  "batch_id": 3
}
```

### Step 3: View Assignment Summary

```bash
# Get all assignments for Faculty 1
GET /api/faculty/1/assignment-summary/
```

### Step 4: Filter Assignments

```bash
# Get all subjects assigned to Faculty 1
GET /api/faculty/subject-assignments/?faculty_id=1

# Get all batches assigned to Faculty 1
GET /api/faculty/batch-assignments/?faculty_id=1

# Get all faculty assigned to a specific subject
GET /api/faculty/subject-assignments/?subject_id=7

# Get all faculty assigned to a specific batch
GET /api/faculty/batch-assignments/?batch_id=1
```

### Step 5: Update Assignments

```bash
# Deactivate a subject assignment
PATCH /api/faculty/subject-assignments/1/
{
  "is_active": false
}

# Change assigned batch
PATCH /api/faculty/batch-assignments/1/
{
  "batch_id": 5
}
```

### Step 6: Delete Assignments

```bash
# Delete subject assignment
DELETE /api/faculty/subject-assignments/1/

# Delete batch assignment
DELETE /api/faculty/batch-assignments/1/
```

---

## 📊 Database Schema

### FacultySubjectAssignment Table

| Column         | Type        | Description                  |
| -------------- | ----------- | ---------------------------- |
| id             | Integer     | Primary key                  |
| faculty_id     | Foreign Key | Reference to FacultyProfile  |
| subject_id     | Foreign Key | Reference to Subject         |
| is_active      | Boolean     | Whether assignment is active |
| assigned_at    | DateTime    | When assignment was created  |
| assigned_by_id | Foreign Key | User who created assignment  |

**Unique Constraint:** (faculty_id, subject_id)

### FacultyBatchAssignment Table

| Column         | Type        | Description                  |
| -------------- | ----------- | ---------------------------- |
| id             | Integer     | Primary key                  |
| faculty_id     | Foreign Key | Reference to FacultyProfile  |
| batch_id       | Foreign Key | Reference to Batch           |
| is_active      | Boolean     | Whether assignment is active |
| assigned_at    | DateTime    | When assignment was created  |
| assigned_by_id | Foreign Key | User who created assignment  |

**Unique Constraint:** (faculty_id, batch_id)

---

## 🔑 Key Changes from Old System

### Before (Single Combined Assignment)

```json
{
  "faculty_id": 1,
  "batch_id": 1,
  "subject_id": 5
}
```

- Faculty was assigned to **subject + batch combination**
- Unique constraint: (faculty, batch, subject)
- Single endpoint for all assignments

### After (Separate Assignments)

```json
// Subject Assignment
{
  "faculty_id": 1,
  "subject_id": 5
}

// Batch Assignment
{
  "faculty_id": 1,
  "batch_id": 1
}
```

- Faculty assigned to **subjects** separately
- Faculty assigned to **batches** separately
- Unique constraint on subject: (faculty, subject)
- Unique constraint on batch: (faculty, batch)
- Separate endpoints for each type

### Benefits

✅ More flexible - faculty can teach same subject in multiple batches
✅ Easier to manage - update subject or batch assignments independently
✅ Better data model - separates concerns
✅ Full CRUD operations - create, read, update, delete on both types

---

## 🚨 Error Handling

### Common Errors

**400 Bad Request - Faculty Not Active:**

```json
{
  "faculty_id": ["Faculty is not active."]
}
```

**400 Bad Request - Subject Not Active:**

```json
{
  "subject_id": ["Subject is not active."]
}
```

**400 Bad Request - Batch Not Active:**

```json
{
  "batch_id": ["Batch is not active."]
}
```

**400 Bad Request - Duplicate Assignment:**

```json
{
  "non_field_errors": ["This faculty is already assigned to this subject."]
}
```

**404 Not Found:**

```json
{
  "detail": "Not found."
}
```

**401 Unauthorized:**

```json
{
  "detail": "Authentication credentials were not provided."
}
```

**403 Forbidden:**

```json
{
  "detail": "You do not have permission to perform this action."
}
```

---

## 📝 Notes

- All endpoints require JWT authentication
- Subject assignments track which subjects a faculty can teach
- Batch assignments track which batches a faculty is teaching
- Both assignment types can be active or inactive
- Deleting an assignment is permanent (not soft delete)
- Use PATCH for partial updates, PUT for full updates
- Assignment summary provides a complete view of faculty assignments

---

**Happy Testing! 🚀**
