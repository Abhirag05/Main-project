# Assignment Module - API Quick Reference

## Base URL
```
http://localhost:8000/api/assignments/
```

---

## 🎓 Faculty Endpoints

### Create Assignment
```http
POST /faculty/assignments/
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
    "batch": 1,
    "subject": 2,
    "title": "Assignment Title",
    "description": "Instructions...",
    "attachment": <file>,          # optional
    "max_marks": 100,
    "due_date": "2026-02-20T23:59:59Z",
    "is_active": true
}
```

### List My Assignments
```http
GET /faculty/assignments/
Authorization: Bearer {token}

Response: [{
    "id": 1,
    "title": "...",
    "batch_name": "...",
    "subject_name": "...",
    "max_marks": 100,
    "due_date": "...",
    "total_submissions": 15,
    "evaluated_submissions": 10,
    "pending_evaluations": 5
}]
```

### Get Assignment Detail
```http
GET /faculty/assignments/{id}/
Authorization: Bearer {token}
```

### Update Assignment
```http
PATCH /faculty/assignments/{id}/
Authorization: Bearer {token}
Content-Type: application/json

{
    "title": "Updated Title",
    "due_date": "2026-03-01T23:59:59Z"
}
```

### Delete Assignment
```http
DELETE /faculty/assignments/{id}/
Authorization: Bearer {token}
```

### View Submissions
```http
GET /faculty/assignments/{id}/submissions/
GET /faculty/assignments/{id}/submissions/?evaluated=true
GET /faculty/assignments/{id}/submissions/?evaluated=false
Authorization: Bearer {token}

Response: {
    "assignment": {
        "id": 1,
        "title": "...",
        "max_marks": 100,
        "due_date": "..."
    },
    "total_submissions": 15,
    "submissions": [...]
}
```

### View Statistics
```http
GET /faculty/assignments/{id}/statistics/
Authorization: Bearer {token}

Response: {
    "total_students": 20,
    "total_submissions": 15,
    "evaluated_submissions": 10,
    "pending_evaluations": 5,
    "not_submitted": 5,
    "submission_rate": 75.0,
    "average_marks": 78.5
}
```

### Evaluate Submission
```http
PATCH /faculty/submissions/{id}/evaluate/
Authorization: Bearer {token}
Content-Type: application/json

{
    "marks_obtained": 85.5,
    "feedback": "Excellent work!"
}

Response: {
    "message": "Submission evaluated successfully",
    "submission": {
        "id": 1,
        "student_name": "...",
        "marks_obtained": 85.5,
        "max_marks": 100,
        "feedback": "...",
        "evaluated_at": "..."
    }
}
```

---

## 👨‍🎓 Student Endpoints

### List Assignments
```http
GET /student/assignments/
GET /student/assignments/?subject=2
GET /student/assignments/?status=pending
GET /student/assignments/?status=submitted
GET /student/assignments/?status=overdue
Authorization: Bearer {token}

Response: [{
    "id": 1,
    "subject_name": "Python",
    "faculty_name": "John Doe",
    "title": "Assignment Title",
    "description": "...",
    "attachment": "/media/...",
    "max_marks": 100,
    "due_date": "...",
    "is_overdue": false,
    "my_submission": {
        "id": 1,
        "submitted_at": "...",
        "marks_obtained": 85,
        "feedback": "...",
        "is_evaluated": true
    }
}]
```

### Submit Assignment
```http
POST /student/assignments/{id}/submit/
Authorization: Bearer {token}
Content-Type: multipart/form-data

{
    "submission_file": <file>
}

Response (New): {
    "message": "Assignment submitted successfully",
    "submission": {
        "id": 1,
        "assignment": "...",
        "submitted_at": "...",
        "is_late_submission": false
    }
}

Response (Re-upload): {
    "message": "Assignment re-submitted successfully",
    "submission": {...}
}
```

### List My Submissions
```http
GET /student/submissions/
GET /student/submissions/?evaluated=true
GET /student/submissions/?evaluated=false
GET /student/submissions/?subject=2
Authorization: Bearer {token}

Response: [{
    "id": 1,
    "assignment_title": "...",
    "subject_name": "Python",
    "assignment_max_marks": 100,
    "submission_file": "/media/...",
    "submitted_at": "...",
    "marks_obtained": 85,
    "feedback": "...",
    "evaluated_at": "...",
    "is_evaluated": true,
    "is_late_submission": false
}]
```

### View Submission Detail
```http
GET /student/submissions/{id}/
Authorization: Bearer {token}

Response: {
    "id": 1,
    "assignment_title": "...",
    "subject_name": "...",
    "assignment_max_marks": 100,
    "submission_file": "/media/...",
    "submitted_at": "...",
    "marks_obtained": 85,
    "feedback": "Great work!",
    "evaluated_at": "...",
    "is_evaluated": true,
    "is_late_submission": false
}
```

---

## 🔑 Authentication

### JWT Token Example
```bash
# Get token
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "pass"}'

# Use token
curl -X GET http://localhost:8000/api/assignments/student/assignments/ \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## 📝 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no token) |
| 403 | Forbidden (no permission) |
| 404 | Not Found |
| 500 | Server Error |

---

## ⚠️ Common Errors

### Past Due Date
```json
{
    "error": "Submission deadline has passed. Due date was 2026-02-15 23:59"
}
```

### Marks Exceed Maximum
```json
{
    "marks_obtained": ["Marks cannot exceed maximum marks (100.00)"]
}
```

### Not Authorized
```json
{
    "error": "You are not assigned to teach this subject to this batch"
}
```

### Wrong Batch
```json
{
    "error": "This assignment is not for your batch"
}
```

### Inactive Assignment
```json
{
    "error": "This assignment is no longer accepting submissions"
}
```

---

## 📊 Query Parameters

### Faculty Submissions
- `evaluated=true` - Only evaluated submissions
- `evaluated=false` - Only pending submissions

### Student Assignments
- `subject=<id>` - Filter by subject
- `status=pending` - Not yet submitted (before deadline)
- `status=submitted` - Already submitted
- `status=overdue` - Past deadline

### Student Submissions
- `evaluated=true` - Only graded submissions
- `evaluated=false` - Pending grading
- `subject=<id>` - Filter by subject

---

## 🔐 Permission Matrix

| Endpoint | Faculty | Student | Admin |
|----------|---------|---------|-------|
| Create Assignment | ✅ (own) | ❌ | ✅ |
| View Assignments | ✅ (own) | ✅ (batch) | ✅ |
| Update Assignment | ✅ (own) | ❌ | ✅ |
| Delete Assignment | ✅ (own) | ❌ | ✅ |
| View Submissions | ✅ (own) | ✅ (own) | ✅ |
| Submit Assignment | ❌ | ✅ (batch) | ❌ |
| Evaluate Submission | ✅ (own) | ❌ | ✅ |

---

## 🧪 cURL Examples

### Faculty: Create Assignment
```bash
curl -X POST http://localhost:8000/api/assignments/faculty/assignments/ \
  -H "Authorization: Bearer <token>" \
  -F "batch=1" \
  -F "subject=2" \
  -F "title=Python Project" \
  -F "description=Build a REST API" \
  -F "max_marks=100" \
  -F "due_date=2026-02-20T23:59:59Z" \
  -F "is_active=true"
```

### Faculty: Evaluate
```bash
curl -X PATCH http://localhost:8000/api/assignments/faculty/submissions/1/evaluate/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"marks_obtained": 85, "feedback": "Good work!"}'
```

### Student: Submit
```bash
curl -X POST http://localhost:8000/api/assignments/student/assignments/1/submit/ \
  -H "Authorization: Bearer <token>" \
  -F "submission_file=@project.zip"
```

### Student: List Assignments
```bash
curl -X GET "http://localhost:8000/api/assignments/student/assignments/?status=pending" \
  -H "Authorization: Bearer <token>"
```

---

## 📦 Response Examples

### Assignment Object
```json
{
    "id": 1,
    "batch": 1,
    "batch_name": "Batch A",
    "subject": 2,
    "subject_name": "Python Programming",
    "faculty": 5,
    "faculty_name": "John Doe",
    "title": "Python Assignment",
    "description": "...",
    "attachment": "/media/assignments/1/1/doc.pdf",
    "max_marks": "100.00",
    "due_date": "2026-02-20T23:59:59Z",
    "created_at": "2026-02-03T10:00:00Z",
    "is_active": true,
    "is_overdue": false,
    "total_submissions": 15,
    "evaluated_submissions": 10
}
```

### Submission Object
```json
{
    "id": 1,
    "assignment": 1,
    "assignment_title": "Python Assignment",
    "student": 10,
    "student_name": "Alice Johnson",
    "student_roll_number": "CS2024001",
    "submission_file": "/media/submissions/1/1/10/project.zip",
    "submitted_at": "2026-02-10T15:30:00Z",
    "marks_obtained": "85.00",
    "feedback": "Excellent work!",
    "evaluated_at": "2026-02-12T10:00:00Z",
    "is_evaluated": true,
    "is_late_submission": false
}
```

---

## 💡 Tips

1. **File Uploads:** Always use `multipart/form-data` with `-F` in cURL
2. **Dates:** Use ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`
3. **Re-uploads:** POST to same assignment again before deadline
4. **Filters:** Combine multiple query params with `&`
5. **Permissions:** Ensure user has correct role and batch assignment

---

## 📚 Full Documentation

- Complete API: `docs/ASSIGNMENT_MODULE_API.md`
- Setup Guide: `docs/ASSIGNMENT_SETUP_GUIDE.md`
- Implementation: `docs/ASSIGNMENT_IMPLEMENTATION_SUMMARY.md`
