# Student My Batch API - Quick Reference

## Endpoint
```
GET /api/student/my-batch/
```

## Authentication
- **Required**: Yes (JWT Bearer token)
- **Permission**: `IsStudent` (role.code === "STUDENT")

## Request
```bash
curl -X GET http://localhost:8000/api/student/my-batch/ \
  -H "Authorization: Bearer <jwt_token>"
```

## Response: Success (Has Batch)
```json
{
  "batch_id": 1,
  "batch_code": "FSWD-2024-001",
  "course_name": "Full Stack Web Development",
  "start_date": "2024-01-15",
  "end_date": "2024-07-15",
  "batch_status": "ACTIVE",
  "mentor_name": "Dr. Sarah Johnson",
  "mentor_email": "sarah.johnson@institution.com",
  "total_students": 25
}
```

## Response: Success (No Batch)
```json
{
  "message": "You are not assigned to any batch yet",
  "batch": null
}
```

## Error Responses
| Status | Scenario |
|--------|----------|
| 401 | Not authenticated |
| 403 | Not a STUDENT role |
| 404 | StudentProfile not found |

## Files Modified

### 1. Permission Class
**File**: `common/permissions.py`
- Added `IsStudent` permission class

### 2. Serializer
**File**: `apps/students/serializers.py`
- Added `MyBatchSerializer` (read-only)

### 3. View
**File**: `apps/students/views.py`
- Added `MyBatchView` class
- Imported `IsStudent`, `MyBatchSerializer`
- Imported batch models

### 4. URLs
**File**: `apps/students/urls.py`
- Added `/my-batch/` route

**File**: `config/urls.py`
- Added `/api/student/` path

## Key Features

✅ Read-only access (no modifications)
✅ Role-based security (STUDENT only)
✅ Query optimization (select_related)
✅ Handles no-batch scenario gracefully
✅ Includes mentor information if assigned
✅ Returns total students in batch

## Business Rules

1. Only ONE active batch per student
2. Only students with `role.code === "STUDENT"` can access
3. Students can ONLY see their own batch
4. No cross-student data exposure
5. No batch modification capabilities

## Testing Checklist

- [ ] Student with active batch gets 200 OK with data
- [ ] Student with no batch gets 200 OK with null
- [ ] Non-STUDENT role gets 403 Forbidden
- [ ] Unauthenticated request gets 401
- [ ] Mentor data is null when no mentor assigned
- [ ] total_students count is accurate

## Quick Start for Development

1. Ensure migrations are applied:
   ```bash
   python manage.py migrate
   ```

2. Create test student with batch:
   ```python
   # In Django shell
   from users.models import User
   from students.models import StudentProfile
   from batch_management.models import Batch, BatchStudent
   
   # Create student user
   student = User.objects.create_user(
       email="student@test.com",
       password="test123",
       first_name="John",
       last_name="Doe"
   )
   
   # Assign STUDENT role (assuming role exists)
   from roles.models import Role
   student_role = Role.objects.get(code="STUDENT")
   student.role = student_role
   student.save()
   
   # Create profile
   profile = StudentProfile.objects.create(user=student)
   
   # Create batch assignment
   batch = Batch.objects.first()  # Use existing batch
   BatchStudent.objects.create(
       student=profile,
       batch=batch,
       is_active=True
   )
   ```

3. Test the API:
   ```bash
   # Login to get token
   curl -X POST http://localhost:8000/api/auth/login/ \
     -H "Content-Type: application/json" \
     -d '{"email":"student@test.com","password":"test123"}'
   
   # Use token to get batch
   curl -X GET http://localhost:8000/api/student/my-batch/ \
     -H "Authorization: Bearer <token_from_login>"
   ```

## Production Checklist

- [x] Permission class implemented
- [x] Serializer with all required fields
- [x] View with query optimization
- [x] URL routing configured
- [x] Error handling for all scenarios
- [x] Documentation complete
- [ ] Unit tests written (TODO)
- [ ] Integration tests written (TODO)
- [ ] Load testing performed (TODO)

---

For detailed documentation, see [STUDENT_MY_BATCH_API.md](./STUDENT_MY_BATCH_API.md)
