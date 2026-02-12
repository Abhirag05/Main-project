# Assignment Module - Troubleshooting Guide

## Common Issues and Solutions

---

## Installation Issues

### Issue 1: App Not Found in INSTALLED_APPS

**Error:**
```
ModuleNotFoundError: No module named 'apps.assignments'
```

**Solution:**
1. Ensure app is added to `INSTALLED_APPS`:
   ```python
   INSTALLED_APPS = [
       # ...
       'apps.assignments',
   ]
   ```
2. Restart Django server
3. Check directory structure matches `apps/assignments/`

### Issue 2: Migration Fails

**Error:**
```
django.db.utils.ProgrammingError: relation "assignments" does not exist
```

**Solution:**
```bash
python manage.py makemigrations assignments
python manage.py migrate assignments
```

### Issue 3: Import Errors for Related Models

**Error:**
```
ImportError: cannot import name 'Batch' from 'apps.batch_management.models'
```

**Solution:**
1. Verify all dependency apps exist:
   - `apps.batch_management`
   - `apps.academics`
   - `apps.students`
   - `apps.faculty`
2. Ensure models are properly defined in those apps
3. Check for circular import issues
4. Use string references in ForeignKey if needed:
   ```python
   batch = models.ForeignKey('batch_management.Batch', ...)
   ```

---

## Permission Issues

### Issue 4: Faculty Cannot Create Assignment

**Error:**
```json
{
    "error": "You are not assigned to teach this subject to this batch"
}
```

**Solution:**
1. Verify faculty has `FacultySubjectAssignment` record:
   ```python
   from apps.faculty.models import FacultySubjectAssignment
   
   FacultySubjectAssignment.objects.filter(
       faculty__user=user,
       batch_id=1,
       subject_id=2,
       is_active=True
   ).exists()
   ```
2. Create assignment via admin if needed
3. Check `is_active=True` on assignment

### Issue 5: Student Cannot View Assignments

**Error:**
```json
{
    "detail": "You do not have permission to perform this action."
}
```

**Solution:**
1. Verify student has `current_batch` set:
   ```python
   student = user.student_profile
   print(student.current_batch)  # Should not be None
   ```
2. Assign student to batch via admin
3. Ensure batch is active
4. Check user has `student_profile` attribute

### Issue 6: Permission Denied on Object

**Error:**
```json
{
    "detail": "You do not have permission to perform this action."
}
```

**Solution:**
1. Faculty trying to edit another faculty's assignment
2. Student trying to view another batch's assignment
3. Verify ownership in permissions:
   ```python
   # For faculty
   assignment.faculty == request.user
   
   # For student
   assignment.batch == student.current_batch
   ```

---

## Validation Issues

### Issue 7: Cannot Submit After Due Date

**Error:**
```json
{
    "error": "Submission deadline has passed. Due date was 2026-02-15 23:59"
}
```

**Solution:**
1. This is expected behavior - no submissions after deadline
2. To allow late submission, faculty must extend due date:
   ```bash
   PATCH /api/assignments/faculty/assignments/{id}/
   {
       "due_date": "2026-02-25T23:59:59Z"
   }
   ```
3. Or set due date in future for testing

### Issue 8: Marks Exceed Maximum

**Error:**
```json
{
    "marks_obtained": ["Marks cannot exceed maximum marks (100.00)"]
}
```

**Solution:**
1. Verify marks_obtained <= assignment.max_marks
2. Check decimal values are correct
3. Update max_marks if needed:
   ```bash
   PATCH /api/assignments/faculty/assignments/{id}/
   {
       "max_marks": 150
   }
   ```

### Issue 9: Due Date in Past

**Error:**
```json
{
    "due_date": ["Due date must be in the future"]
}
```

**Solution:**
1. Set future date when creating assignment
2. Use timezone-aware datetime:
   ```python
   from django.utils import timezone
   from datetime import timedelta
   
   due_date = timezone.now() + timedelta(days=7)
   ```
3. Format: `2026-02-20T23:59:59Z`

---

## File Upload Issues

### Issue 10: File Upload Fails

**Error:**
```json
{
    "submission_file": ["The submitted data was not a file. Check the encoding type on the form."]
}
```

**Solution:**
1. Use `Content-Type: multipart/form-data`
2. In cURL, use `-F` flag:
   ```bash
   curl -X POST http://localhost:8000/api/assignments/student/assignments/1/submit/ \
     -H "Authorization: Bearer <token>" \
     -F "submission_file=@/path/to/file.pdf"
   ```
3. In JavaScript:
   ```javascript
   const formData = new FormData();
   formData.append('submission_file', file);
   
   fetch(url, {
       method: 'POST',
       headers: {
           'Authorization': 'Bearer ' + token
       },
       body: formData
   });
   ```

### Issue 11: Media Files Not Accessible

**Error:**
```
404 Not Found - /media/assignments/1/1/file.pdf
```

**Solution:**
1. Verify media settings in `settings.py`:
   ```python
   MEDIA_URL = '/media/'
   MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
   ```
2. Add to `urls.py` (development only):
   ```python
   from django.conf import settings
   from django.conf.urls.static import static
   
   if settings.DEBUG:
       urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
   ```
3. Check file permissions on media directory
4. Ensure directory exists and is writable

### Issue 12: File Path Issues on Windows

**Error:**
```
FileNotFoundError: [Errno 2] No such file or directory
```

**Solution:**
1. Use `os.path.join()` for cross-platform paths
2. Check path separators (use `/` not `\`)
3. Ensure media directories exist:
   ```bash
   mkdir media\assignments
   mkdir media\submissions
   ```

---

## Database Issues

### Issue 13: Unique Constraint Violation

**Error:**
```
IntegrityError: duplicate key value violates unique constraint "assignment_submissions_assignment_id_student_id_key"
```

**Solution:**
1. This is expected - student already submitted
2. Use re-upload endpoint (POST to same assignment)
3. View handles this automatically:
   ```python
   # In view, it checks and updates existing submission
   try:
       existing = AssignmentSubmission.objects.get(...)
       existing.submission_file = new_file
       existing.save()
   except AssignmentSubmission.DoesNotExist:
       # Create new
   ```

### Issue 14: Foreign Key Constraint Violation

**Error:**
```
IntegrityError: insert or update on table "assignments" violates foreign key constraint
```

**Solution:**
1. Verify referenced objects exist:
   - Batch with ID exists
   - Subject with ID exists
   - Faculty user exists
2. Check IDs in request payload
3. Query database to verify:
   ```python
   Batch.objects.filter(id=1).exists()
   Subject.objects.filter(id=2).exists()
   ```

---

## Authentication Issues

### Issue 15: Unauthorized Access

**Error:**
```json
{
    "detail": "Authentication credentials were not provided."
}
```

**Solution:**
1. Include Authorization header:
   ```
   Authorization: Bearer <your_jwt_token>
   ```
2. Verify token is valid and not expired
3. Check authentication backend is configured
4. Test token with auth endpoint

### Issue 16: Role Not Found

**Error:**
```
AttributeError: 'User' object has no attribute 'role'
```

**Solution:**
1. Ensure user has role assigned
2. Check user model has role field or relation
3. Update permission classes to handle missing role:
   ```python
   def has_permission(self, request, view):
       return (
           hasattr(request.user, 'role') and
           request.user.role.name == 'Faculty'
       )
   ```

### Issue 17: Student Profile Not Found

**Error:**
```
AttributeError: 'User' object has no attribute 'student_profile'
```

**Solution:**
1. Create StudentProfile for user
2. Check related_name in StudentProfile model
3. Ensure OneToOne relationship exists:
   ```python
   class StudentProfile(models.Model):
       user = models.OneToOneField(
           User,
           on_delete=models.CASCADE,
           related_name='student_profile'
       )
   ```

---

## API Response Issues

### Issue 18: Empty Assignment List

**Error:** API returns `[]` but assignments exist

**Solution:**
1. **Faculty:** Check if querying own assignments
   ```python
   assignments = Assignment.objects.filter(faculty=request.user)
   ```
2. **Student:** Check if has active batch
   ```python
   student = request.user.student_profile
   assignments = Assignment.objects.filter(
       batch=student.current_batch,
       is_active=True
   )
   ```
3. Verify `is_active=True` on assignments

### Issue 19: Submission Not Appearing

**Error:** Submitted but not showing in list

**Solution:**
1. Check submission was actually created:
   ```python
   AssignmentSubmission.objects.filter(
       assignment_id=1,
       student=student
   ).exists()
   ```
2. Verify no filter excluding it:
   - `evaluated=true` filter excludes pending
   - `subject` filter may exclude
3. Check student ID matches

### Issue 20: Statistics Show Zero

**Error:** Statistics endpoint returns zeros

**Solution:**
1. Verify submissions exist for assignment
2. Check annotation query:
   ```python
   .annotate(
       total_submissions=Count('submissions'),
       evaluated_submissions=Count(
           Case(When(submissions__marks_obtained__isnull=False, then=1))
       )
   )
   ```
3. Test query in Django shell

---

## Testing Issues

### Issue 21: Test Data Creation Fails

**Error:**
```
python manage.py create_test_assignments
ValueError: No FacultySubjectAssignment found
```

**Solution:**
1. Create test data in order:
   - Users (Faculty & Students)
   - Batches
   - Subjects
   - Faculty Subject Assignments
   - Then run create_test_assignments
2. Or manually create via admin panel

### Issue 22: Can't Login with Test Users

**Error:** Authentication fails

**Solution:**
1. Create users with proper passwords:
   ```python
   user = User.objects.create_user(
       username='test_faculty',
       password='password123'  # Use create_user, not create
   )
   ```
2. Assign roles/profiles
3. Test with correct credentials

---

## Production Issues

### Issue 23: Large File Upload Fails

**Error:**
```
RequestDataTooBig: Request body exceeded settings.DATA_UPLOAD_MAX_MEMORY_SIZE
```

**Solution:**
1. Increase limits in settings.py:
   ```python
   FILE_UPLOAD_MAX_MEMORY_SIZE = 52428800  # 50MB
   DATA_UPLOAD_MAX_MEMORY_SIZE = 52428800  # 50MB
   ```
2. Use chunked uploads for very large files
3. Consider upload limits by file type

### Issue 24: S3 Upload Fails (Production)

**Error:** Files not uploading to S3

**Solution:**
1. Install django-storages:
   ```bash
   pip install django-storages boto3
   ```
2. Configure in settings:
   ```python
   DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
   AWS_ACCESS_KEY_ID = 'your-key'
   AWS_SECRET_ACCESS_KEY = 'your-secret'
   AWS_STORAGE_BUCKET_NAME = 'your-bucket'
   ```
3. Check IAM permissions

---

## Debugging Tips

### Enable Debug Logging

```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'apps.assignments': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

### Test in Django Shell

```python
python manage.py shell

from apps.assignments.models import Assignment, AssignmentSubmission
from django.contrib.auth import get_user_model

User = get_user_model()

# Test queries
assignments = Assignment.objects.all()
print(assignments.count())

# Test permissions
user = User.objects.get(username='test_faculty')
print(hasattr(user, 'role'))
print(user.role.name if hasattr(user, 'role') else None)
```

### Check Database State

```sql
-- Count assignments
SELECT COUNT(*) FROM assignments;

-- Count submissions
SELECT COUNT(*) FROM assignment_submissions;

-- Check user roles
SELECT u.username, r.name 
FROM auth_user u 
LEFT JOIN roles r ON u.role_id = r.id;

-- Check faculty assignments
SELECT f.id, u.username, b.name, s.name 
FROM faculty_subject_assignments f
JOIN auth_user u ON f.faculty_id = u.id
JOIN batch_management_batch b ON f.batch_id = b.id
JOIN academics_subject s ON f.subject_id = s.id
WHERE f.is_active = true;
```

### Test API with Python

```python
import requests

# Test faculty endpoint
url = 'http://localhost:8000/api/assignments/faculty/assignments/'
headers = {'Authorization': 'Bearer YOUR_TOKEN'}
response = requests.get(url, headers=headers)

print(f"Status: {response.status_code}")
print(f"Data: {response.json()}")
```

---

## Getting Help

### Information to Provide

When reporting issues, include:
1. Full error message and stack trace
2. Django version and Python version
3. Request method and endpoint
4. Request payload/body
5. User role (Faculty/Student)
6. Related data (batch, subject, etc.)
7. Steps to reproduce

### Debug Checklist

- [ ] Check error logs
- [ ] Verify authentication token
- [ ] Check user permissions and role
- [ ] Verify related objects exist
- [ ] Test in Django shell
- [ ] Check database state
- [ ] Review recent code changes
- [ ] Test with different user roles

---

## Quick Fixes

### Reset Test Data
```bash
python manage.py flush --noinput
python manage.py migrate
python manage.py createsuperuser
python manage.py create_test_assignments
```

### Clear Media Files
```bash
# Windows
rmdir /s media\assignments
rmdir /s media\submissions
mkdir media\assignments
mkdir media\submissions

# Linux/Mac
rm -rf media/assignments media/submissions
mkdir -p media/assignments media/submissions
```

### Rebuild Migrations
```bash
# Only if absolutely necessary
python manage.py migrate assignments zero
rm apps/assignments/migrations/0001_initial.py
python manage.py makemigrations assignments
python manage.py migrate assignments
```

---

## Support Resources

- **API Documentation:** `docs/ASSIGNMENT_MODULE_API.md`
- **Setup Guide:** `docs/ASSIGNMENT_SETUP_GUIDE.md`
- **Quick Reference:** `docs/ASSIGNMENT_API_QUICK_REF.md`
- **Django Docs:** https://docs.djangoproject.com/
- **DRF Docs:** https://www.django-rest-framework.org/
