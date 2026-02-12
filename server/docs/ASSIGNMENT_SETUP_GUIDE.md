# Assignment Module - Quick Setup Guide

## Prerequisites
- Django REST Framework installed
- Existing apps: `batch_management`, `academics`, `students`, `faculty`
- User authentication configured
- Media file handling configured

---

## Setup Steps

### 1. Add to INSTALLED_APPS

Edit `config/settings.py`:

```python
INSTALLED_APPS = [
    # ... existing apps
    'apps.assignments',
]
```

### 2. Update URL Configuration

Edit `config/urls.py`:

```python
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # ... existing patterns
    path('api/assignments/', include('apps.assignments.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### 3. Ensure Media Settings

Verify in `config/settings.py`:

```python
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

### 4. Run Migrations

```bash
# Activate virtual environment
./venv/scripts/activate

# Create migrations
python manage.py makemigrations assignments

# Apply migrations
python manage.py migrate assignments
```

### 5. Create Media Directories (Optional)

```bash
mkdir -p media/assignments
mkdir -p media/submissions
```

---

## Verification

### Check Migrations
```bash
python manage.py showmigrations assignments
```

Should show:
```
assignments
 [X] 0001_initial
```

### Access Admin Panel
1. Start server: `python manage.py runserver`
2. Navigate to: `http://localhost:8000/admin/assignments/`
3. You should see:
   - Assignments
   - Assignment Submissions

---

## Testing the APIs

### Get Authentication Token

Assuming you have JWT authentication:

```bash
# Faculty login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "faculty_user", "password": "password"}'

# Student login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "student_user", "password": "password"}'
```

### Test Faculty Endpoints

```bash
# Create assignment (replace <token> with actual JWT token)
curl -X POST http://localhost:8000/api/assignments/faculty/assignments/ \
  -H "Authorization: Bearer <token>" \
  -F "batch=1" \
  -F "subject=1" \
  -F "title=Test Assignment" \
  -F "description=Complete the project" \
  -F "max_marks=100" \
  -F "due_date=2026-03-01T23:59:59Z" \
  -F "is_active=true"

# List assignments
curl -X GET http://localhost:8000/api/assignments/faculty/assignments/ \
  -H "Authorization: Bearer <token>"
```

### Test Student Endpoints

```bash
# List assignments
curl -X GET http://localhost:8000/api/assignments/student/assignments/ \
  -H "Authorization: Bearer <token>"

# Submit assignment
curl -X POST http://localhost:8000/api/assignments/student/assignments/1/submit/ \
  -H "Authorization: Bearer <token>" \
  -F "submission_file=@test.pdf"
```

---

## Common Issues & Solutions

### Issue 1: ImportError for related models

**Error:**
```
ImportError: cannot import name 'Batch' from 'apps.batch_management.models'
```

**Solution:**
Ensure the related apps exist:
- `apps.batch_management` with `Batch` model
- `apps.academics` with `Subject` model
- `apps.students` with `StudentProfile` model
- `apps.faculty` with `FacultyProfile` and `FacultySubjectAssignment` models

### Issue 2: Permission denied

**Error:**
```
{"detail": "You do not have permission to perform this action."}
```

**Solution:**
- Verify user has correct role (Faculty/Student)
- Check if faculty is assigned to teach the subject/batch
- Check if student belongs to the batch

### Issue 3: File upload fails

**Error:**
```
"The submitted data was not a file."
```

**Solution:**
- Ensure `Content-Type: multipart/form-data` header
- Use `-F` flag in curl for file uploads
- Check file permissions on media directory

### Issue 4: Student has no current_batch

**Error:**
```
{"error": "You do not have an active batch"}
```

**Solution:**
- Assign student to a batch
- Ensure `StudentProfile.current_batch` is set
- Check batch is active

---

## Key Points

### For Faculty
1. Must be assigned to teach the subject to the batch (via `FacultySubjectAssignment`)
2. Can only manage their own assignments
3. Can only evaluate submissions for their assignments

### For Students
1. Must have an active batch assigned
2. Can only view assignments for their batch
3. Cannot submit after due date
4. Can re-upload before due date

### File Paths
- Assignments: `media/assignments/{batch_id}/{assignment_id}/{filename}`
- Submissions: `media/submissions/{batch_id}/{assignment_id}/{student_id}/{filename}`

---

## API Endpoints Summary

### Faculty
- `POST /api/assignments/faculty/assignments/` - Create assignment
- `GET /api/assignments/faculty/assignments/` - List assignments
- `GET /api/assignments/faculty/assignments/{id}/` - Get assignment
- `PUT/PATCH /api/assignments/faculty/assignments/{id}/` - Update assignment
- `DELETE /api/assignments/faculty/assignments/{id}/` - Delete assignment
- `GET /api/assignments/faculty/assignments/{id}/submissions/` - Get submissions
- `GET /api/assignments/faculty/assignments/{id}/statistics/` - Get statistics
- `PATCH /api/assignments/faculty/submissions/{id}/evaluate/` - Evaluate submission

### Student
- `GET /api/assignments/student/assignments/` - List assignments
- `POST /api/assignments/student/assignments/{id}/submit/` - Submit assignment
- `GET /api/assignments/student/submissions/` - List my submissions
- `GET /api/assignments/student/submissions/{id}/` - Get submission detail

---

## Model Relationships

```
User (Faculty)
  ↓ creates
Assignment
  ↓ belongs to
Batch + Subject
  ↓ has many
AssignmentSubmission
  ↓ submitted by
StudentProfile
```

---

## Next Steps

1. ✅ Run migrations
2. ✅ Test API endpoints
3. Create sample data via admin
4. Integrate with frontend
5. Set up file size limits
6. Configure production media storage (AWS S3, etc.)
7. Add email notifications (optional)
8. Add analytics dashboard (optional)

---

## Production Checklist

- [ ] Configure production media storage (S3/CloudFront)
- [ ] Set file upload size limits
- [ ] Add rate limiting for submissions
- [ ] Enable CORS for frontend
- [ ] Add logging for file uploads
- [ ] Implement virus scanning for uploaded files
- [ ] Set up backup for media files
- [ ] Configure CDN for media delivery
- [ ] Add monitoring for storage usage
- [ ] Implement file retention policy

---

## Support Resources

- Full API Documentation: `docs/ASSIGNMENT_MODULE_API.md`
- Models: `apps/assignments/models.py`
- Serializers: `apps/assignments/serializers.py`
- Views: `apps/assignments/views.py`
- Permissions: `apps/assignments/permissions.py`
