# Placement List Management API Documentation

## Overview

The Placement List Management system allows placement coordinators to create named lists of students and track them for placement opportunities. Each list displays comprehensive student information including contact details (email, phone) and their skills with mastery levels (Beginner, Intermediate, Advanced).

## Features

- **Create and manage placement lists** with custom names and descriptions
- **Add/remove students** from placement lists
- **View student details** including:
  - Full name
  - Email address
  - Phone number
  - Skills acquired with mastery levels and percentage scores
  - Admission status
- **Track who added students** and when they were added
- **Add notes** for individual students in a list
- **View all lists** a specific student appears in

## API Endpoints

Base URL: `/api/placement/`

### 1. List All Placement Lists

**GET** `/api/placement/lists/`

Returns all active placement lists with basic information.

**Response:**

```json
[
  {
    "id": 1,
    "name": "Python Developers Q1 2024",
    "description": "Python developers ready for placement",
    "created_by": 5,
    "created_by_name": "John Doe",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "is_active": true,
    "student_count": 25
  }
]
```

---

### 2. Create a New Placement List

**POST** `/api/placement/lists/`

Create a new placement list. The `created_by` field is automatically set to the authenticated user.

**Request Body:**

```json
{
  "name": "Frontend Developers Batch 5",
  "description": "React and Next.js specialists ready for placement",
  "is_active": true
}
```

**Response:** `201 Created`

```json
{
  "id": 2,
  "name": "Frontend Developers Batch 5",
  "description": "React and Next.js specialists ready for placement",
  "created_by": 5,
  "created_by_name": "John Doe",
  "created_at": "2024-01-15T11:00:00Z",
  "updated_at": "2024-01-15T11:00:00Z",
  "is_active": true,
  "student_count": 0
}
```

---

### 3. Get Placement List Details

**GET** `/api/placement/lists/{id}/`

Retrieve detailed information about a specific placement list, including all students with their complete details and skills.

**Response:**

```json
{
  "id": 1,
  "name": "Python Developers Q1 2024",
  "description": "Python developers ready for placement",
  "created_by": 5,
  "created_by_name": "John Doe",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "is_active": true,
  "student_count": 2,
  "students": [
    {
      "id": 1,
      "student": 10,
      "student_details": {
        "id": 10,
        "full_name": "Alice Johnson",
        "email": "alice.johnson@example.com",
        "phone": "+1234567890",
        "skills": [
          {
            "skill_name": "Python",
            "mastery_level": "ADVANCED",
            "percentage": "85.50"
          },
          {
            "skill_name": "Django",
            "mastery_level": "INTERMEDIATE",
            "percentage": "72.00"
          },
          {
            "skill_name": "REST APIs",
            "mastery_level": "ADVANCED",
            "percentage": "88.00"
          }
        ],
        "admission_status": "APPROVED"
      },
      "notes": "Strong Django experience, ready for full-stack roles",
      "added_by": 5,
      "added_by_name": "John Doe",
      "added_at": "2024-01-15T10:35:00Z",
      "is_active": true
    },
    {
      "id": 2,
      "student": 12,
      "student_details": {
        "id": 12,
        "full_name": "Bob Smith",
        "email": "bob.smith@example.com",
        "phone": "+1234567891",
        "skills": [
          {
            "skill_name": "Python",
            "mastery_level": "BEGINNER",
            "percentage": "55.00"
          },
          {
            "skill_name": "Flask",
            "mastery_level": "BEGINNER",
            "percentage": "48.00"
          }
        ],
        "admission_status": "APPROVED"
      },
      "notes": "Good potential, needs more practice",
      "added_by": 5,
      "added_by_name": "John Doe",
      "added_at": "2024-01-15T10:40:00Z",
      "is_active": true
    }
  ]
}
```

---

### 4. Update a Placement List

**PUT/PATCH** `/api/placement/lists/{id}/`

Update placement list information.

**Request Body:**

```json
{
  "name": "Python Developers Q1 2024 - Updated",
  "description": "Updated description",
  "is_active": true
}
```

**Response:** `200 OK` - Returns updated placement list

---

### 5. Delete a Placement List

**DELETE** `/api/placement/lists/{id}/`

Soft delete a placement list by setting `is_active` to `false`.

**Response:** `204 No Content`

---

### 6. Add Student to Placement List

**POST** `/api/placement/lists/{id}/add-student/`

Add a student to a specific placement list.

**Request Body:**

```json
{
  "student_id": 15,
  "notes": "Excellent React skills, ready for frontend positions"
}
```

**Response:** `201 Created`

```json
{
  "message": "Student Alice Johnson added to Python Developers Q1 2024.",
  "data": {
    "id": 3,
    "student": 15,
    "student_details": {
      "id": 15,
      "full_name": "Alice Johnson",
      "email": "alice.johnson@example.com",
      "phone": "+1234567890",
      "skills": [
        {
          "skill_name": "React",
          "mastery_level": "ADVANCED",
          "percentage": "90.00"
        }
      ],
      "admission_status": "APPROVED"
    },
    "notes": "Excellent React skills, ready for frontend positions",
    "added_by": 5,
    "added_by_name": "John Doe",
    "added_at": "2024-01-15T11:30:00Z",
    "is_active": true
  }
}
```

**Validation:**

- Student must exist
- Student must be in APPROVED status (APPROVED, FULL_PAYMENT_VERIFIED, or INSTALLMENT_VERIFIED)
- Student cannot already be in the list

**Error Responses:**

- `400 Bad Request` - Student already in list or invalid student status
- `404 Not Found` - Student does not exist

---

### 7. Remove Student from Placement List

**POST** `/api/placement/lists/{id}/remove-student/`

Remove a student from a placement list (soft delete).

**Request Body:**

```json
{
  "student_id": 15
}
```

**Response:** `200 OK`

```json
{
  "message": "Student Alice Johnson removed from Python Developers Q1 2024."
}
```

**Error Responses:**

- `404 Not Found` - Student not in the list or student does not exist

---

### 8. Get Student's Placement Lists

**GET** `/api/placement/lists/student-lists/?student_id={student_id}`

Get all placement lists that contain a specific student.

**Query Parameters:**

- `student_id` (required): ID of the student

**Response:**

```json
{
  "student": {
    "id": 15,
    "name": "Alice Johnson",
    "email": "alice.johnson@example.com"
  },
  "placement_lists": [
    {
      "placement_list": {
        "id": 1,
        "name": "Python Developers Q1 2024",
        "description": "Python developers ready for placement",
        "created_by": 5,
        "created_by_name": "John Doe",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z",
        "is_active": true,
        "student_count": 25
      },
      "added_at": "2024-01-15T10:35:00Z",
      "notes": "Strong Django experience"
    },
    {
      "placement_list": {
        "id": 3,
        "name": "Full Stack Developers",
        "description": "Full stack ready candidates",
        "created_by": 5,
        "created_by_name": "John Doe",
        "created_at": "2024-01-16T09:00:00Z",
        "updated_at": "2024-01-16T09:00:00Z",
        "is_active": true,
        "student_count": 15
      },
      "added_at": "2024-01-16T09:15:00Z",
      "notes": "React + Python full stack"
    }
  ]
}
```

---

## Skill Mastery Levels

Skills are automatically calculated from student assessment attempts. The mastery levels are:

| Level          | Percentage Range | Description              |
| -------------- | ---------------- | ------------------------ |
| `NOT_ACQUIRED` | 0-39%            | Skill not yet acquired   |
| `BEGINNER`     | 40-59%           | Basic understanding      |
| `INTERMEDIATE` | 60-79%           | Solid working knowledge  |
| `ADVANCED`     | 80-100%          | Expert level proficiency |

---

## Common Use Cases

### Use Case 1: Create a Placement List for Python Developers

```bash
# Step 1: Create the list
POST /api/placement/lists/
{
  "name": "Python Backend Developers Jan 2024",
  "description": "Python developers with Django/Flask experience"
}

# Step 2: Add students with relevant Python skills
POST /api/placement/lists/1/add-student/
{
  "student_id": 10,
  "notes": "Strong Django + REST API skills"
}

POST /api/placement/lists/1/add-student/
{
  "student_id": 12,
  "notes": "Flask + PostgreSQL experience"
}

# Step 3: View the complete list with student details
GET /api/placement/lists/1/
```

### Use Case 2: Find All Lists a Student is In

```bash
GET /api/placement/lists/student-lists/?student_id=10
```

This returns all placement lists containing student ID 10, useful for:

- Tracking placement opportunities for a specific student
- Seeing which skill categories a student qualifies for
- Managing student placement status

### Use Case 3: Update Student Information in a List

```bash
# Remove student from list
POST /api/placement/lists/1/remove-student/
{
  "student_id": 10
}

# Re-add with updated notes
POST /api/placement/lists/1/add-student/
{
  "student_id": 10,
  "notes": "Updated: Now has 2 years Django experience"
}
```

---

## Authentication

All endpoints require authentication. Include the JWT token in the request header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Permissions

- Any authenticated user can view placement lists
- Only the list creator or admin can modify/delete lists
- The `created_by` and `added_by` fields are automatically set based on the authenticated user

---

## Database Schema

### PlacementList Table

- `id`: Primary key
- `name`: Unique list name
- `description`: Optional description
- `created_by`: Foreign key to User
- `created_at`: Timestamp
- `updated_at`: Timestamp
- `is_active`: Boolean (soft delete flag)

### PlacementListStudent Table

- `id`: Primary key
- `placement_list`: Foreign key to PlacementList
- `student`: Foreign key to StudentProfile
- `added_by`: Foreign key to User
- `notes`: Text field for notes
- `added_at`: Timestamp
- `is_active`: Boolean (soft delete flag)
- **Unique constraint**: (placement_list, student) - prevents duplicates

---

## Error Handling

All endpoints follow standard REST conventions:

- `200 OK` - Success
- `201 Created` - Resource created successfully
- `204 No Content` - Resource deleted successfully
- `400 Bad Request` - Invalid request data or business logic violation
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses include a descriptive message:

```json
{
  "error": "Student is already in this placement list."
}
```

---

## Notes

1. Only students with admission status of `APPROVED`, `FULL_PAYMENT_VERIFIED`, or `INSTALLMENT_VERIFIED` can be added to placement lists
2. Student skills are automatically computed from their assessment attempts
3. All delete operations are soft deletes (setting `is_active = false`)
4. The API uses efficient database queries with prefetching to avoid N+1 query problems
5. Student details include real-time skill data based on their latest assessment performance
