# Student My Batch Subjects API - Quick Reference

## Endpoint
```
GET /api/student/my-batch/subjects/
```

## Who Can Access?
- ✅ STUDENT role only
- ❌ Other roles get 403 Forbidden

## What It Returns
List of subjects in student's batch with faculty info

---

## Quick Test

### 1. Login as Student
```bash
POST /api/auth/login/
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {...}
}
```

### 2. Get Batch Subjects
```bash
GET /api/student/my-batch/subjects/
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Response (With Faculty):**
```json
{
  "message": "Subjects in your batch",
  "subjects": [
    {
      "subject_id": 1,
      "subject_name": "Python Programming",
      "subject_code": "PY101",
      "faculty_id": 5,
      "faculty_name": "Dr. Smith",
      "faculty_designation": "Senior Lecturer",
      "faculty_email": "smith@example.com"
    }
  ]
}
```

**Response (No Faculty Assigned):**
```json
{
  "message": "Subjects in your batch",
  "subjects": [
    {
      "subject_id": 2,
      "subject_name": "Data Structures",
      "subject_code": "DS201",
      "faculty_id": null,
      "faculty_name": null,
      "faculty_designation": null,
      "faculty_email": null
    }
  ]
}
```

**Response (No Batch Assigned):**
```json
{
  "message": "You are not assigned to any batch yet",
  "subjects": []
}
```

---

## Common Errors

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```
**Fix**: Add Authorization header with valid JWT token

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```
**Fix**: Login as STUDENT role user

### 404 Not Found
```json
{
  "detail": "Student profile not found"
}
```
**Fix**: Ensure user has StudentProfile created

---

## Frontend Integration

### TypeScript Interface
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

interface BatchSubjectsResponse {
  message: string;
  subjects: BatchSubject[];
}
```

### API Call
```typescript
const response = await apiClient.getMyBatchSubjects();

if (response.subjects.length === 0) {
  // Show "Not assigned to batch" message
} else {
  // Display subjects list
}
```

### Display Faculty
```tsx
{subject.faculty_name ? (
  <>
    <p className="font-semibold">{subject.faculty_name}</p>
    <p className="text-sm text-gray-600">{subject.faculty_designation}</p>
    <p className="text-xs text-gray-500">{subject.faculty_email}</p>
  </>
) : (
  <p className="text-gray-400 italic">Faculty will be assigned soon</p>
)}
```

---

## Key Points

1. **Read-Only**: Students can only view, not modify
2. **Own Batch Only**: Students see subjects from their batch only
3. **Faculty Matching**: Faculty must be assigned to BOTH subject AND batch
4. **Null Handling**: Faculty fields are `null` if not assigned
5. **Empty Response**: Returns 200 OK with empty array if no batch
6. **Optimized Queries**: Uses `select_related()` to avoid N+1 queries

---

## Test Scenarios

| Scenario | Expected Result |
|----------|----------------|
| Student with active batch + faculty | 200 OK with subjects list |
| Student with active batch, no faculty | 200 OK with subjects, faculty fields = null |
| Student with no batch assignment | 200 OK with empty subjects array |
| Non-STUDENT role accessing | 403 Forbidden |
| Unauthenticated request | 401 Unauthorized |
| Student profile doesn't exist | 404 Not Found |

---

## Related APIs

- `GET /api/student/my-batch/` - Get batch info
- `GET /api/faculty/batch-assignments/` - Admin: View faculty assignments
- `GET /api/faculty/subject-assignments/` - Admin: View subject assignments

---

## Notes

- Subjects ordered by `CourseSubject.sequence_order`
- Faculty assignment requires **both** FacultySubjectAssignment AND FacultyBatchAssignment
- Both assignments must be `is_active = True`
- API returns all subjects in course, even if no faculty assigned
- Frontend should handle null faculty gracefully with "Coming soon" message
