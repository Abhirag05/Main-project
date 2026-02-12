# Assignment Module

A comprehensive assignment management system for the ERP/LMS platform, enabling faculty to create and manage assignments while students can submit and track their work.

## Features

### Faculty Features
- ✅ Create assignments for specific batch & subject
- ✅ Upload reference materials/documents
- ✅ Set deadlines and maximum marks
- ✅ View all submissions for their assignments
- ✅ Evaluate submissions with marks and feedback
- ✅ Track submission statistics
- ✅ View pending evaluations
- ✅ Update/delete their assignments

### Student Features
- ✅ View assignments for their batch
- ✅ Download assignment materials
- ✅ Submit work before deadline
- ✅ Re-upload submission before deadline
- ✅ View submission status
- ✅ View marks and feedback once evaluated
- ✅ Filter assignments by subject
- ✅ Track pending/submitted/overdue assignments

### System Features
- ✅ File upload support (PDFs, documents, images, code files)
- ✅ Automatic late submission detection
- ✅ Unique submission per student per assignment
- ✅ Evaluation tracking with timestamp
- ✅ Permission-based access control
- ✅ Comprehensive validation
- ✅ Admin interface for management

## Quick Start

### 1. Installation

```bash
# Add to INSTALLED_APPS in settings.py
'apps.assignments',

# Run migrations
python manage.py makemigrations assignments
python manage.py migrate assignments
```

### 2. URL Configuration

```python
# config/urls.py
urlpatterns = [
    path('api/assignments/', include('apps.assignments.urls')),
]
```

### 3. Create Test Data (Optional)

```bash
python manage.py create_test_assignments --assignments=5
```

## API Endpoints

### Faculty Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assignments/faculty/assignments/` | Create new assignment |
| GET | `/api/assignments/faculty/assignments/` | List all my assignments |
| GET | `/api/assignments/faculty/assignments/{id}/` | Get assignment details |
| PUT/PATCH | `/api/assignments/faculty/assignments/{id}/` | Update assignment |
| DELETE | `/api/assignments/faculty/assignments/{id}/` | Delete assignment |
| GET | `/api/assignments/faculty/assignments/{id}/submissions/` | View submissions |
| GET | `/api/assignments/faculty/assignments/{id}/statistics/` | Get statistics |
| PATCH | `/api/assignments/faculty/submissions/{id}/evaluate/` | Evaluate submission |

### Student Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assignments/student/assignments/` | List batch assignments |
| POST | `/api/assignments/student/assignments/{id}/submit/` | Submit assignment |
| GET | `/api/assignments/student/submissions/` | List my submissions |
| GET | `/api/assignments/student/submissions/{id}/` | View submission detail |

## Models

### Assignment
Primary model for assignments created by faculty.

**Fields:**
- `batch` - ForeignKey to Batch
- `subject` - ForeignKey to Subject  
- `faculty` - ForeignKey to User (creator)
- `title` - Assignment title (max 255 chars)
- `description` - Full instructions (TextField)
- `attachment` - Optional reference file
- `max_marks` - Maximum marks (Decimal)
- `due_date` - Submission deadline (DateTime)
- `is_active` - Active status (Boolean)

**Properties:**
- `is_overdue` - True if deadline passed
- `total_submissions` - Count of submissions
- `evaluated_submissions` - Count of evaluated submissions

### AssignmentSubmission
Student submissions for assignments.

**Fields:**
- `assignment` - ForeignKey to Assignment
- `student` - ForeignKey to StudentProfile
- `submission_file` - Uploaded work file
- `submitted_at` - Submission timestamp
- `marks_obtained` - Marks awarded (nullable)
- `feedback` - Faculty feedback (TextField)
- `evaluated_at` - Evaluation timestamp (nullable)
- `evaluated_by` - Faculty who evaluated (nullable)

**Properties:**
- `is_evaluated` - True if marks assigned
- `is_late_submission` - True if submitted after due date

**Constraints:**
- Unique together: (assignment, student)

## Permissions

### Faculty Permissions
- `IsFaculty` - User must have Faculty role
- `CanManageAssignment` - Can only manage own assignments
- `CanViewAssignmentSubmissions` - Can only view submissions for own assignments
- `CanEvaluateSubmission` - Can only evaluate submissions for own assignments

### Student Permissions
- `IsStudent` - User must have StudentProfile
- `CanViewBatchAssignments` - Can only view assignments for own batch
- `CanSubmitAssignment` - Can only submit for own batch assignments
- `IsSubmissionOwner` - Can only view own submissions

## Business Rules

### Assignment Creation
1. Faculty must be assigned to teach the subject to the batch (via `FacultySubjectAssignment`)
2. Due date must be in the future
3. Max marks must be positive

### Submission Rules
1. Student must belong to the assignment's batch
2. Cannot submit after due date
3. Can re-upload before due date (overwrites existing submission)
4. One submission per student per assignment
5. Assignment must be active

### Evaluation Rules
1. Only assignment creator can evaluate
2. Marks cannot exceed max_marks
3. Marks cannot be negative
4. Evaluation timestamp is auto-set
5. Evaluated_by is auto-set to current faculty

## File Storage

### Structure
```
media/
├── assignments/
│   └── {batch_id}/
│       └── {assignment_id}/
│           └── {filename}
└── submissions/
    └── {batch_id}/
        └── {assignment_id}/
            └── {student_id}/
                └── {filename}
```

### Configuration

```python
# settings.py
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Optional: Set file upload limits
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10MB
```

## Usage Examples

### Faculty: Create Assignment

```python
import requests

url = "http://localhost:8000/api/assignments/faculty/assignments/"
headers = {"Authorization": "Bearer <faculty_token>"}
data = {
    "batch": 1,
    "subject": 2,
    "title": "Django REST Framework Project",
    "description": "Build a complete CRUD API with authentication",
    "max_marks": 100,
    "due_date": "2026-02-20T23:59:59Z",
    "is_active": True
}
files = {"attachment": open("assignment.pdf", "rb")}

response = requests.post(url, headers=headers, data=data, files=files)
print(response.json())
```

### Faculty: Evaluate Submission

```python
url = "http://localhost:8000/api/assignments/faculty/submissions/1/evaluate/"
headers = {
    "Authorization": "Bearer <faculty_token>",
    "Content-Type": "application/json"
}
data = {
    "marks_obtained": 85.5,
    "feedback": "Excellent work! Code is well-structured and documented."
}

response = requests.patch(url, headers=headers, json=data)
print(response.json())
```

### Student: Submit Assignment

```python
url = "http://localhost:8000/api/assignments/student/assignments/1/submit/"
headers = {"Authorization": "Bearer <student_token>"}
files = {"submission_file": open("project.zip", "rb")}

response = requests.post(url, headers=headers, files=files)
print(response.json())
```

### Student: View Assignments

```python
url = "http://localhost:8000/api/assignments/student/assignments/"
headers = {"Authorization": "Bearer <student_token>"}
params = {"status": "pending", "subject": 2}  # Optional filters

response = requests.get(url, headers=headers, params=params)
print(response.json())
```

## Validation & Error Handling

### Common Errors

**Past Due Date:**
```json
{
    "error": "Submission deadline has passed. Due date was 2026-02-15 23:59"
}
```

**Marks Exceed Maximum:**
```json
{
    "marks_obtained": ["Marks cannot exceed maximum marks (100.00)"]
}
```

**Not Authorized:**
```json
{
    "error": "You are not assigned to teach this subject to this batch"
}
```

**Wrong Batch:**
```json
{
    "error": "This assignment is not for your batch"
}
```

## Testing

### Run Tests

```bash
# Run all tests
python manage.py test apps.assignments

# Run specific test
python manage.py test apps.assignments.tests.TestFacultyAssignment

# With coverage
coverage run --source='apps/assignments' manage.py test apps.assignments
coverage report
```

### Create Test Data

```bash
# Create 5 assignments per faculty
python manage.py create_test_assignments --assignments=5

# Clear existing data first
python manage.py create_test_assignments --clear --assignments=3
```

## Admin Interface

Access at `/admin/assignments/`

**Features:**
- List view with filters (batch, subject, active status)
- Search by title, description, faculty name
- Bulk actions
- Inline submission viewing
- Readonly timestamps

## Dependencies

### Required Apps
- `apps.batch_management` - Batch model
- `apps.academics` - Subject model
- `apps.students` - StudentProfile model
- `apps.faculty` - FacultyProfile, FacultySubjectAssignment models

### Required Packages
- Django REST Framework
- Pillow (for image uploads)

## Production Considerations

### Security
- [ ] Add virus scanning for uploaded files
- [ ] Implement rate limiting for submissions
- [ ] Add file type validation
- [ ] Set maximum file size limits
- [ ] Enable HTTPS for file uploads

### Performance
- [ ] Use CDN for media files
- [ ] Implement caching for assignment lists
- [ ] Add database indexes (already included)
- [ ] Use select_related/prefetch_related (already included)

### Storage
- [ ] Configure AWS S3 for production media storage
- [ ] Set up CloudFront for CDN
- [ ] Implement file retention policy
- [ ] Add backup strategy for uploaded files

### Monitoring
- [ ] Add logging for file uploads
- [ ] Track storage usage
- [ ] Monitor API performance
- [ ] Set up alerts for failed submissions

## Documentation

- **Full API Docs:** [ASSIGNMENT_MODULE_API.md](../../docs/ASSIGNMENT_MODULE_API.md)
- **Setup Guide:** [ASSIGNMENT_SETUP_GUIDE.md](../../docs/ASSIGNMENT_SETUP_GUIDE.md)

## Support

For issues or questions:
1. Check validation errors in models and serializers
2. Review permission logic in `permissions.py`
3. Check view logic in `views.py`
4. Verify user roles and batch assignments
5. Check Django logs for detailed errors

## License

Internal use only - Part of ISSD ERP/LMS platform.
