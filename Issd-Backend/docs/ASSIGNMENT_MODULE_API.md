# Assignment Module - API Documentation

## Overview
Complete assignment management system for faculty and students in the ERP/LMS platform.

## Features
- ✅ Faculty can create and manage assignments
- ✅ Students can view and submit assignments
- ✅ File upload support for assignments and submissions
- ✅ Faculty evaluation with marks and feedback
- ✅ Re-upload support before due date
- ✅ Late submission detection
- ✅ Batch-level permissions
- ✅ Due date validation
- ✅ Submission statistics

---

## Installation & Setup

### 1. Register the App

Add to `config/settings.py`:

```python
INSTALLED_APPS = [
    # ... existing apps
    'apps.assignments',
]
```

### 2. Configure Media Files

Ensure media file settings are configured in `config/settings.py`:

```python
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

### 3. Add URL Routing

Add to `config/urls.py`:

```python
urlpatterns = [
    # ... existing patterns
    path('api/assignments/', include('apps.assignments.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### 4. Run Migrations

```bash
python manage.py makemigrations assignments
python manage.py migrate assignments
```

### 5. Create Superuser (if needed)

```bash
python manage.py createsuperuser
```

---

## API Endpoints

### Faculty Endpoints

#### 1. Create Assignment
```http
POST /api/assignments/faculty/assignments/
Content-Type: multipart/form-data
Authorization: Bearer <token>

{
    "batch": 1,
    "subject": 2,
    "title": "Python Programming Assignment",
    "description": "Create a REST API using Django",
    "attachment": <file>,  // optional
    "max_marks": 100,
    "due_date": "2026-02-15T23:59:59Z",
    "is_active": true
}
```

**Response:**
```json
{
    "id": 1,
    "batch": 1,
    "batch_name": "Batch A",
    "subject": 2,
    "subject_name": "Python Programming",
    "faculty": 5,
    "faculty_name": "John Doe",
    "title": "Python Programming Assignment",
    "description": "Create a REST API using Django",
    "attachment": "/media/assignments/1/1/document.pdf",
    "max_marks": "100.00",
    "due_date": "2026-02-15T23:59:59Z",
    "created_at": "2026-02-03T10:00:00Z",
    "updated_at": "2026-02-03T10:00:00Z",
    "is_active": true,
    "is_overdue": false,
    "total_submissions": 0,
    "evaluated_submissions": 0
}
```

#### 2. List Faculty's Assignments
```http
GET /api/assignments/faculty/assignments/
Authorization: Bearer <token>
```

**Response:**
```json
[
    {
        "id": 1,
        "batch": 1,
        "batch_name": "Batch A",
        "subject": 2,
        "subject_name": "Python Programming",
        "title": "Python Programming Assignment",
        "description": "Create a REST API using Django",
        "max_marks": "100.00",
        "due_date": "2026-02-15T23:59:59Z",
        "created_at": "2026-02-03T10:00:00Z",
        "is_active": true,
        "is_overdue": false,
        "total_submissions": 15,
        "evaluated_submissions": 10,
        "pending_evaluations": 5
    }
]
```

#### 3. View Assignment Details
```http
GET /api/assignments/faculty/assignments/{id}/
Authorization: Bearer <token>
```

#### 4. Update Assignment
```http
PUT /api/assignments/faculty/assignments/{id}/
PATCH /api/assignments/faculty/assignments/{id}/
Content-Type: multipart/form-data
Authorization: Bearer <token>

{
    "title": "Updated Title",
    "due_date": "2026-02-20T23:59:59Z"
}
```

#### 5. Delete Assignment
```http
DELETE /api/assignments/faculty/assignments/{id}/
Authorization: Bearer <token>
```

#### 6. View Submissions for Assignment
```http
GET /api/assignments/faculty/assignments/{id}/submissions/
Authorization: Bearer <token>

# Optional query parameters:
?evaluated=true   // Only evaluated submissions
?evaluated=false  // Only pending submissions
```

**Response:**
```json
{
    "assignment": {
        "id": 1,
        "title": "Python Programming Assignment",
        "max_marks": "100.00",
        "due_date": "2026-02-15T23:59:59Z"
    },
    "total_submissions": 15,
    "submissions": [
        {
            "id": 1,
            "student": 10,
            "student_name": "Alice Johnson",
            "student_roll_number": "CS2024001",
            "student_email": "alice@example.com",
            "submission_file": "/media/submissions/1/1/10/project.zip",
            "submitted_at": "2026-02-10T15:30:00Z",
            "marks_obtained": "85.00",
            "feedback": "Good work! Well structured code.",
            "evaluated_at": "2026-02-12T10:00:00Z",
            "is_evaluated": true,
            "is_late_submission": false
        }
    ]
}
```

#### 7. Get Assignment Statistics
```http
GET /api/assignments/faculty/assignments/{id}/statistics/
Authorization: Bearer <token>
```

**Response:**
```json
{
    "assignment_id": 1,
    "assignment_title": "Python Programming Assignment",
    "max_marks": "100.00",
    "total_students": 20,
    "total_submissions": 15,
    "evaluated_submissions": 10,
    "pending_evaluations": 5,
    "not_submitted": 5,
    "submission_rate": 75.0,
    "average_marks": 78.5
}
```

#### 8. Evaluate Submission
```http
PATCH /api/assignments/faculty/submissions/{id}/evaluate/
Content-Type: application/json
Authorization: Bearer <token>

{
    "marks_obtained": 85.50,
    "feedback": "Excellent work! Code is well-structured and documented."
}
```

**Response:**
```json
{
    "message": "Submission evaluated successfully",
    "submission": {
        "id": 1,
        "student_name": "Alice Johnson",
        "marks_obtained": "85.50",
        "max_marks": "100.00",
        "feedback": "Excellent work! Code is well-structured and documented.",
        "evaluated_at": "2026-02-12T10:00:00Z"
    }
}
```

---

### Student Endpoints

#### 1. List Assignments
```http
GET /api/assignments/student/assignments/
Authorization: Bearer <token>

# Optional query parameters:
?subject=2              // Filter by subject ID
?status=pending         // pending | submitted | overdue
```

**Response:**
```json
[
    {
        "id": 1,
        "subject": 2,
        "subject_name": "Python Programming",
        "faculty_name": "John Doe",
        "title": "Python Programming Assignment",
        "description": "Create a REST API using Django",
        "attachment": "/media/assignments/1/1/document.pdf",
        "max_marks": "100.00",
        "due_date": "2026-02-15T23:59:59Z",
        "created_at": "2026-02-03T10:00:00Z",
        "is_overdue": false,
        "my_submission": {
            "id": 1,
            "submitted_at": "2026-02-10T15:30:00Z",
            "marks_obtained": "85.00",
            "feedback": "Good work!",
            "is_evaluated": true,
            "is_late_submission": false
        }
    }
]
```

#### 2. Submit Assignment
```http
POST /api/assignments/student/assignments/{id}/submit/
Content-Type: multipart/form-data
Authorization: Bearer <token>

{
    "submission_file": <file>
}
```

**Success Response (New Submission):**
```json
{
    "message": "Assignment submitted successfully",
    "submission": {
        "id": 1,
        "assignment": "Python Programming Assignment",
        "submitted_at": "2026-02-10T15:30:00Z",
        "is_late_submission": false
    }
}
```

**Success Response (Re-submission):**
```json
{
    "message": "Assignment re-submitted successfully",
    "submission": {
        "id": 1,
        "assignment": "Python Programming Assignment",
        "submitted_at": "2026-02-11T10:00:00Z",
        "is_late_submission": false
    }
}
```

**Error Response (Past Due Date):**
```json
{
    "error": "Submission deadline has passed. Due date was 2026-02-15 23:59"
}
```

#### 3. View My Submissions
```http
GET /api/assignments/student/submissions/
Authorization: Bearer <token>

# Optional query parameters:
?evaluated=true     // Only evaluated submissions
?evaluated=false    // Pending evaluation
?subject=2          // Filter by subject
```

**Response:**
```json
[
    {
        "id": 1,
        "assignment": 1,
        "assignment_title": "Python Programming Assignment",
        "subject_name": "Python Programming",
        "assignment_max_marks": "100.00",
        "submission_file": "/media/submissions/1/1/10/project.zip",
        "submitted_at": "2026-02-10T15:30:00Z",
        "updated_at": "2026-02-10T15:30:00Z",
        "marks_obtained": "85.00",
        "feedback": "Good work! Well structured code.",
        "evaluated_at": "2026-02-12T10:00:00Z",
        "is_evaluated": true,
        "is_late_submission": false
    }
]
```

#### 4. View Submission Detail
```http
GET /api/assignments/student/submissions/{id}/
Authorization: Bearer <token>
```

---

## Models

### Assignment Model

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| batch | ForeignKey | Batch for which assignment is created |
| subject | ForeignKey | Subject of the assignment |
| faculty | ForeignKey | Faculty who created the assignment |
| title | CharField(255) | Assignment title |
| description | TextField | Assignment instructions |
| attachment | FileField | Optional reference material |
| max_marks | Decimal(6,2) | Maximum marks |
| due_date | DateTime | Submission deadline |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |
| is_active | Boolean | Active status |

**Properties:**
- `is_overdue`: Boolean - checks if due date has passed
- `total_submissions`: Integer - count of submissions
- `evaluated_submissions`: Integer - count of evaluated submissions

### AssignmentSubmission Model

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| assignment | ForeignKey | Assignment being submitted |
| student | ForeignKey | Student submitting |
| submission_file | FileField | Submitted work file |
| submitted_at | DateTime | Submission timestamp |
| updated_at | DateTime | Last update timestamp |
| marks_obtained | Decimal(6,2) | Marks awarded (nullable) |
| feedback | TextField | Faculty feedback |
| evaluated_at | DateTime | Evaluation timestamp (nullable) |
| evaluated_by | ForeignKey | Faculty who evaluated (nullable) |

**Properties:**
- `is_evaluated`: Boolean - checks if marks are assigned
- `is_late_submission`: Boolean - checks if submitted after due date

**Constraints:**
- unique_together: (assignment, student) - one submission per student per assignment

---

## Permissions

### Faculty Permissions
- ✅ Create assignments for batches/subjects they teach
- ✅ View only their own assignments
- ✅ Edit/delete only their own assignments
- ✅ View submissions for their assignments
- ✅ Evaluate submissions for their assignments

### Student Permissions
- ✅ View assignments for their current batch only
- ✅ Submit assignments before due date
- ✅ Re-upload before due date (overwrites previous submission)
- ✅ View only their own submissions
- ❌ Cannot view other students' submissions
- ❌ Cannot edit marks or evaluation data

---

## Business Rules

1. **Assignment Creation**
   - Faculty must be assigned to teach the subject to the batch
   - Due date must be in the future

2. **Submission Rules**
   - Students can only submit for their active batch
   - No submissions after due date
   - Re-upload allowed before due date (updates existing submission)
   - One submission per student per assignment

3. **Evaluation Rules**
   - Only assignment creator can evaluate
   - Marks cannot exceed max_marks
   - Marks cannot be negative
   - Evaluation timestamp is auto-set

4. **File Handling**
   - Assignment attachments: `assignments/{batch_id}/{assignment_id}/{filename}`
   - Submissions: `submissions/{batch_id}/{assignment_id}/{student_id}/{filename}`

5. **No Hard Deletes**
   - Use `is_active=False` instead of deleting assignments
   - Maintain audit trail

---

## Error Handling

### Common Error Responses

**401 Unauthorized**
```json
{
    "detail": "Authentication credentials were not provided."
}
```

**403 Forbidden**
```json
{
    "error": "You are not assigned to teach this subject to this batch"
}
```

**404 Not Found**
```json
{
    "detail": "Not found."
}
```

**400 Bad Request**
```json
{
    "marks_obtained": ["Marks cannot exceed maximum marks (100.00)"]
}
```

---

## Testing Examples

### Faculty Workflow

```bash
# 1. Faculty creates an assignment
curl -X POST http://localhost:8000/api/assignments/faculty/assignments/ \
  -H "Authorization: Bearer <faculty_token>" \
  -F "batch=1" \
  -F "subject=2" \
  -F "title=Django REST Framework Project" \
  -F "description=Build a complete API with authentication" \
  -F "max_marks=100" \
  -F "due_date=2026-02-20T23:59:59Z" \
  -F "is_active=true"

# 2. View submissions
curl -X GET http://localhost:8000/api/assignments/faculty/assignments/1/submissions/ \
  -H "Authorization: Bearer <faculty_token>"

# 3. Evaluate a submission
curl -X PATCH http://localhost:8000/api/assignments/faculty/submissions/1/evaluate/ \
  -H "Authorization: Bearer <faculty_token>" \
  -H "Content-Type: application/json" \
  -d '{"marks_obtained": 85, "feedback": "Excellent work!"}'
```

### Student Workflow

```bash
# 1. View available assignments
curl -X GET http://localhost:8000/api/assignments/student/assignments/ \
  -H "Authorization: Bearer <student_token>"

# 2. Submit assignment
curl -X POST http://localhost:8000/api/assignments/student/assignments/1/submit/ \
  -H "Authorization: Bearer <student_token>" \
  -F "submission_file=@/path/to/project.zip"

# 3. View my submissions
curl -X GET http://localhost:8000/api/assignments/student/submissions/ \
  -H "Authorization: Bearer <student_token>"
```

---

## Database Schema

```sql
-- assignments table
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES batch_management_batch(id),
    subject_id INTEGER REFERENCES academics_subject(id),
    faculty_id INTEGER REFERENCES auth_user(id),
    title VARCHAR(255),
    description TEXT,
    attachment VARCHAR(100),
    max_marks DECIMAL(6,2),
    due_date TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    is_active BOOLEAN
);

-- assignment_submissions table
CREATE TABLE assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES assignments(id),
    student_id INTEGER REFERENCES students_studentprofile(id),
    submission_file VARCHAR(100),
    submitted_at TIMESTAMP,
    updated_at TIMESTAMP,
    marks_obtained DECIMAL(6,2),
    feedback TEXT,
    evaluated_at TIMESTAMP,
    evaluated_by_id INTEGER REFERENCES auth_user(id),
    UNIQUE (assignment_id, student_id)
);
```

---

## Admin Panel

Access the Django admin panel to manage assignments:

- URL: `/admin/assignments/`
- Models: Assignment, AssignmentSubmission
- Features:
  - Filter by batch, subject, active status
  - Search by title, faculty name
  - Bulk actions
  - Readonly timestamps

---

## File Structure

```
apps/assignments/
├── __init__.py
├── apps.py
├── models.py              # Assignment and AssignmentSubmission models
├── serializers.py         # All serializers (Faculty & Student)
├── views.py               # ViewSets and APIViews
├── permissions.py         # Custom permission classes
├── urls.py                # URL routing
├── admin.py               # Admin configuration
└── migrations/
    └── 0001_initial.py
```

---

## Next Steps

1. Run migrations
2. Create test data (batches, subjects, faculty assignments)
3. Test faculty endpoints
4. Test student endpoints
5. Configure file upload limits in settings
6. Set up CORS if using separate frontend
7. Configure production media storage (S3, etc.)

---

## Support

For issues or questions:
- Check model validations in `models.py`
- Review permission logic in `permissions.py`
- Check serializer validations in `serializers.py`
- Review view logic in `views.py`
