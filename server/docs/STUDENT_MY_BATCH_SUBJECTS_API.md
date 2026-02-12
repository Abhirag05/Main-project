# Student My Batch Subjects API

## Overview

This API allows **STUDENT users** to view subjects and assigned faculty in their active batch. This is a **read-only** feature designed for students to see their curriculum and teaching assignments.

---

## Endpoint

```
GET /api/student/my-batch/subjects/
```

---

## Authentication & Authorization

### Requirements
- **Authentication**: Required (JWT token)
- **Role**: ONLY `role.code === "STUDENT"`
- **Permission Class**: `IsStudent`

### Access Control
- ✅ Students can view subjects in **their own batch only**
- ❌ Non-STUDENT roles receive `403 Forbidden`
- ❌ Students cannot see subjects from other batches
- ❌ This is a READ-ONLY endpoint

---

## Business Logic

### Flow

1. **Identify Student**
   - Retrieve `StudentProfile` linked to `request.user`
   - Return `404` if profile doesn't exist

2. **Find Active Batch**
   - Query `BatchStudent` where:
     - `student = StudentProfile`
     - `is_active = True`
   - If no active batch → Return `200 OK` with empty subjects list

3. **Get Course Subjects**
   - Fetch `CourseSubject` records for the batch's course
   - Filter by `is_active = True`
   - Order by `sequence_order`

4. **Find Faculty Assignments**
   - For each subject, find faculty who:
     - Has `FacultySubjectAssignment` for the subject (`is_active = True`)
     - Has `FacultyBatchAssignment` for the batch (`is_active = True`)
   - If no faculty found → Return `null` for faculty fields

---

## Request

### Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Method
```
GET
```

### Query Parameters
None required

---

## Response

### Success Response (Student Has Batch)

**Status Code**: `200 OK`

```json
{
  "message": "Subjects in your batch",
  "subjects": [
    {
      "subject_id": 1,
      "subject_name": "Python Programming Fundamentals",
      "subject_code": "PY101",
      "faculty_id": 5,
      "faculty_name": "Dr. John Smith",
      "faculty_designation": "Senior Lecturer",
      "faculty_email": "john.smith@institute.edu"
    },
    {
      "subject_id": 2,
      "subject_name": "Data Structures and Algorithms",
      "subject_code": "DS201",
      "faculty_id": 7,
      "faculty_name": "Prof. Sarah Johnson",
      "faculty_designation": "Associate Professor",
      "faculty_email": "sarah.johnson@institute.edu"
    },
    {
      "subject_id": 3,
      "subject_name": "Web Development Basics",
      "subject_code": "WEB101",
      "faculty_id": null,
      "faculty_name": null,
      "faculty_designation": null,
      "faculty_email": null
    }
  ]
}
```

### Success Response (No Batch Assigned)

**Status Code**: `200 OK`

```json
{
  "message": "You are not assigned to any batch yet",
  "subjects": []
}
```

### Error Responses

#### 401 Unauthorized
User not authenticated

```json
{
  "detail": "Authentication credentials were not provided."
}
```

#### 403 Forbidden
User is not a STUDENT

```json
{
  "detail": "You do not have permission to perform this action."
}
```

#### 404 Not Found
StudentProfile doesn't exist

```json
{
  "detail": "Student profile not found"
}
```

---

## Response Fields

### Root Object
| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Descriptive message |
| `subjects` | array | List of subject objects |

### Subject Object
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `subject_id` | integer | No | Unique subject ID |
| `subject_name` | string | No | Subject full name |
| `subject_code` | string | No | Subject code (e.g., "PY101") |
| `faculty_id` | integer | **Yes** | Faculty ID (null if not assigned) |
| `faculty_name` | string | **Yes** | Faculty full name (null if not assigned) |
| `faculty_designation` | string | **Yes** | Faculty designation (null if not assigned) |
| `faculty_email` | string | **Yes** | Faculty email (null if not assigned) |

---

## Frontend Handling

### Display Logic

#### When Faculty is Assigned
```tsx
{subject.faculty_name ? (
  <div>
    <p>{subject.faculty_name}</p>
    <p className="text-sm">{subject.faculty_designation}</p>
    <p className="text-xs">{subject.faculty_email}</p>
  </div>
) : (
  <p className="text-gray-500 italic">
    Faculty will be assigned soon
  </p>
)}
```

#### When No Batch Assigned
```tsx
if (response.subjects.length === 0) {
  return (
    <div className="text-center p-8">
      <p className="text-gray-600">{response.message}</p>
      <p className="text-sm text-gray-500">
        Please contact administration for batch assignment
      </p>
    </div>
  );
}
```

---

## Testing

### Prerequisites
1. Create a STUDENT user with active batch assignment
2. Assign faculty to teach subjects in that batch via:
   - `FacultySubjectAssignment` (faculty → subject)
   - `FacultyBatchAssignment` (faculty → batch)

### Test Cases

#### Test 1: Student with Active Batch and Faculty
```bash
# Login as STUDENT
POST /api/auth/login/
{
  "email": "student@example.com",
  "password": "password123"
}

# Get subjects
GET /api/student/my-batch/subjects/
Authorization: Bearer <student_token>

# Expected: 200 OK with subjects list
```

#### Test 2: Student with No Batch
```bash
# Deactivate batch assignment
PATCH /api/admin/batch-students/{id}/
{
  "is_active": false
}

# Get subjects
GET /api/student/my-batch/subjects/
Authorization: Bearer <student_token>

# Expected: 200 OK with empty subjects array
```

#### Test 3: Non-STUDENT User
```bash
# Login as ADMIN
POST /api/auth/login/
{
  "email": "admin@example.com",
  "password": "password123"
}

# Try to access endpoint
GET /api/student/my-batch/subjects/
Authorization: Bearer <admin_token>

# Expected: 403 Forbidden
```

#### Test 4: Subject with No Faculty
```bash
# Ensure course has a subject with no faculty assignment
# Or deactivate faculty assignment for a subject

GET /api/student/my-batch/subjects/
Authorization: Bearer <student_token>

# Expected: Subject with all faculty fields as null
```

---

## Database Queries

### Optimizations Applied
- `select_related()` used for:
  - `student.user`
  - `batch.template.course`
  - `subject`
  - `faculty.user`
- Single query for course subjects
- Efficient faculty lookup with JOIN conditions
- No N+1 query problem

### Query Flow
```python
# 1. Get student profile
StudentProfile.objects.select_related('user').get(user=request.user)

# 2. Get active batch
BatchStudent.objects.select_related(
    'batch', 'batch__template', 'batch__template__course'
).get(student=student_profile, is_active=True)

# 3. Get course subjects
CourseSubject.objects.filter(
    course=course, is_active=True
).select_related('subject').order_by('sequence_order')

# 4. For each subject, get faculty
FacultySubjectAssignment.objects.filter(
    subject=subject,
    is_active=True,
    faculty__batch_assignments__batch=batch,
    faculty__batch_assignments__is_active=True
).select_related('faculty', 'faculty__user').first()
```

---

## Security Features

### ✅ Implemented
- Role-based access control (STUDENT only)
- User can only see their own batch
- Read-only operation (GET only)
- Proper authentication required
- No data leakage to other batches

### ✅ Prevented
- Cross-batch data access
- Editing/deleting operations
- Access by non-STUDENT roles
- Unauthenticated access

---

## Integration with Existing System

### Models Used
- `StudentProfile` (students app)
- `BatchStudent` (batch_management app)
- `Batch`, `BatchTemplate` (batch_management app)
- `Course`, `CourseSubject`, `Subject` (academics app)
- `FacultyProfile`, `FacultySubjectAssignment`, `FacultyBatchAssignment` (faculty app)

### Permissions Used
- `IsAuthenticated` (DRF built-in)
- `IsStudent` (common.permissions)

### Serializers
- `MyBatchSubjectFacultySerializer` (students.serializers)

---

## API Summary

| Aspect | Details |
|--------|---------|
| **Endpoint** | `GET /api/student/my-batch/subjects/` |
| **Permission** | `IsAuthenticated`, `IsStudent` |
| **Returns** | List of subjects with faculty info |
| **Read-Only** | Yes |
| **Batch Isolation** | Yes |
| **Query Optimization** | Yes |
| **Error Handling** | Complete |

---

## Next Steps for Frontend

1. Create TypeScript interface:
   ```typescript
   interface BatchSubject {
     subject_id: number;
     subject_name: string;
     subject_code: string;
     faculty_id: number | null;
     faculty_name: string | null;
     faculty_designation: string | null;
     faculty_email: string | null;
   }
   ```

2. Add API client method in `lib/api.ts`:
   ```typescript
   async getMyBatchSubjects(): Promise<{
     message: string;
     subjects: BatchSubject[];
   }> {
     return this.get('/api/student/my-batch/subjects/');
   }
   ```

3. Create UI component in `app/dashboards/student/my-batch/subjects/page.tsx`

---

## Notes

- Faculty assignment requires **BOTH** subject and batch assignments
- Subject order follows `CourseSubject.sequence_order`
- Null faculty fields indicate "Faculty will be assigned soon"
- API returns 200 OK even with empty batch (user-friendly)
- No pagination needed (reasonable subject count per batch)

---

## Version
- **API Version**: 1.0
- **Created**: Phase 0D Enhancement
- **Last Updated**: January 2026
