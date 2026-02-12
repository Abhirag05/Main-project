# Assignment File Upload - Quick Reference

**Status**: ✅ Complete | **Date**: February 5, 2026

## What's New?

### Model Field
```python
# OLD: attachment = models.FileField(...)
# NEW:
assignment_file = models.FileField(
    upload_to=faculty_assignment_upload_path,  # Custom path function
    null=True,
    blank=True
)
```

### Upload Path Pattern
```
media/assignments/faculty_{faculty_id}/assignment_{assignment_id}/{filename}
```

**Example**:
```
media/assignments/faculty_5/assignment_123/Python_Assignment.pdf
```

---

## File Validation

✅ Allowed Types: `.pdf`, `.doc`, `.docx`, `.zip`  
✅ Max Size: 10 MB  
✅ Custom error messages for validation failures

---

## API Endpoints

### Faculty: Create Assignment with File
```bash
POST /api/assignments/faculty/assignments/

Content-Type: multipart/form-data

Parameters:
- batch (required): integer
- module (required): integer  
- title (required): string
- description (required): string
- assignment_file (optional): file
- max_marks (required): decimal
- due_date (required): datetime
- is_active (required): boolean
```

### Student: View Assignment with File URL
```bash
GET /api/student/assignments/

Response includes:
- assignment_file: relative path
- assignment_file_url: absolute URL for download
- has_file: boolean flag
```

---

## Database Changes

### Migration Applied
- **File**: `apps/assignments/migrations/0003_remove_assignment_attachment_and_more.py`
- **Change**: Renamed `attachment` → `assignment_file`
- **Status**: ✅ Applied

### Run Migrations
```bash
python manage.py migrate assignments
```

---

## Settings (Already Configured)

```python
# config/settings/base.py
MEDIA_ROOT = BASE_DIR / "media"
MEDIA_URL = "/media/"

# config/urls.py - Media serving in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## Frontend Updates

### Updated Files
- ✅ `lib/assignmentAPI.ts` - API client
- ✅ `app/dashboards/faculty/assignments/create/page.tsx` - Upload form

### Field Name Changes
```
attachment → assignment_file
```

---

## File Structure in Media Directory

```
media/
└── assignments/
    └── faculty_5/
        ├── assignment_123/
        │   ├── Python_Assignment_01.pdf
        │   └── References.zip
        └── assignment_124/
            └── WebDev_Guide.docx
```

---

## Serializer Validation

### FacultyAssignmentCreateSerializer
- Validates file extension
- Validates file size (< 10MB)
- Provides clear error messages

### Example Error Response
```json
{
  "assignment_file": [
    "File type not allowed. Allowed types: .pdf, .doc, .docx, .zip"
  ]
}
```

---

## Access Control

### Faculty Upload
1. Must have `IsFaculty` role
2. Must be assigned to teach the module
3. File validation enforced

### Student Download
1. Must have `IsStudent` role
2. Must belong to assignment's batch
3. Access via API (not direct file path)

---

## Testing Commands

### Create Assignment with File (Faculty)
```bash
curl -X POST http://localhost:8000/api/assignments/faculty/assignments/ \
  -H "Authorization: Bearer {token}" \
  -F "batch=5" \
  -F "module=12" \
  -F "title=Python Assignment 01" \
  -F "description=Write a program..." \
  -F "assignment_file=@assignment.pdf" \
  -F "max_marks=100" \
  -F "due_date=2026-02-28T17:30:00Z" \
  -F "is_active=true"
```

### View Assignments (Student)
```bash
curl -X GET http://localhost:8000/api/student/assignments/ \
  -H "Authorization: Bearer {token}"
```

### Download File from Response URL
```bash
# File URL is in response as: assignment_file_url
# Simply access the URL in browser or with curl
curl -O http://localhost:8000/media/assignments/faculty_5/assignment_123/Python_Assignment_01.pdf
```

---

## Production Deployment Notes

### Before Production
1. Set `DEBUG = False`
2. Configure web server (Nginx) to serve media files
3. Set up regular backups for `media/` directory
4. Consider S3/cloud storage alternative
5. Add virus scanning for uploaded files

### Nginx Configuration
```nginx
location /media/ {
    alias /path/to/app/media/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| File not uploaded | Check file size < 10MB, extension allowed |
| File URL returns 404 | Ensure Django is serving media (DEBUG=True in dev) |
| Permission denied on upload | Verify faculty role and module assignment |
| Student can't access file | Check student belongs to batch |

---

## Files Modified

1. ✅ `apps/assignments/models.py` - Field renamed, path function updated
2. ✅ `apps/assignments/serializers.py` - File validation added
3. ✅ `apps/assignments/admin.py` - Admin fieldset updated
4. ✅ `apps/assignments/migrations/0001_initial.py` - Reference updated
5. ✅ `apps/assignments/migrations/0003_*.py` - New migration created
6. ✅ `config/settings/base.py` - MEDIA settings added
7. ✅ `config/urls.py` - Media serving configured
8. ✅ `lib/assignmentAPI.ts` - Field names updated
9. ✅ `app/dashboards/faculty/assignments/create/page.tsx` - Form updated

---

## Documentation

📖 Full documentation: `docs/ASSIGNMENT_FILE_UPLOAD_IMPLEMENTATION.md`

