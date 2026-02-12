# Phase 0C Testing Guide

## Quick Start

### 1. Seed Permissions (First Time Only)

```bash
python manage.py seed_permissions
```

Output: Creates 16 canonical permissions

### 2. Assign Permissions to Roles (First Time Only)

```bash
python manage.py assign_default_permissions
```

Output: Assigns 34 role-permission mappings

### 3. Start Server

```bash
python manage.py runserver
```

---

## Testing in Postman

### Step 1: Login as Admin

```
POST http://localhost:8000/api/auth/login/

Headers:
Content-Type: application/json

Body (JSON):
{
  "email": "admin@issd.edu",
  "password": "your_password"
}

Expected Response (200 OK):
{
  "access": "eyJhbGc...",
  "refresh": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "admin@issd.edu",
    "full_name": "Admin User",
    "role": {
      "id": 1,
      "code": "SUPER_ADMIN",
      "name": "Super Admin"
    },
    "centre": {
      "id": 1,
      "code": "ISSD-MAIN",
      "name": "ISSD Main Centre"
    },
    "is_active": true
  }
}
```

**Save the `access` token for next requests!**

---

### Step 2: Create a Faculty User

```
POST http://localhost:8000/api/users/

Headers:
Content-Type: application/json
Authorization: Bearer <your_access_token>

Body (JSON):
{
  "email": "faculty@issd.edu",
  "full_name": "Faculty Name",
  "phone": "9876543210",
  "role_code": "FACULTY"
}

Expected Response (201 Created):
{
  "id": 2,
  "email": "faculty@issd.edu",
  "full_name": "Faculty Name",
  "phone": "9876543210",
  "role": {
    "id": 6,
    "code": "FACULTY",
    "name": "Faculty"
  },
  "centre": {
    "id": 1,
    "code": "ISSD-MAIN",
    "name": "ISSD Main Centre"
  },
  "is_active": true,
  "date_joined": "2024-01-15T10:30:00Z",
  "last_login": null
}
```

**✅ Success Indicators:**

- Status: 201 Created
- User has default centre assigned automatically
- User has FACULTY role
- Audit log created (check in Django admin)

---

### Step 3: List All Users

```
GET http://localhost:8000/api/users/list/

Headers:
Authorization: Bearer <your_access_token>

Expected Response (200 OK):
[
  {
    "id": 1,
    "email": "admin@issd.edu",
    "full_name": "Admin User",
    "role": {...},
    "centre": {...},
    "is_active": true
  },
  {
    "id": 2,
    "email": "faculty@issd.edu",
    "full_name": "Faculty Name",
    "role": {...},
    "centre": {...},
    "is_active": true
  }
]
```

---

### Step 4: Filter Users by Role

```
GET http://localhost:8000/api/users/list/?role=FACULTY

Headers:
Authorization: Bearer <your_access_token>

Expected Response (200 OK):
[
  {
    "id": 2,
    "email": "faculty@issd.edu",
    ...
  }
]
```

---

### Step 5: Filter Users by Active Status

```
GET http://localhost:8000/api/users/list/?is_active=true

Headers:
Authorization: Bearer <your_access_token>

Expected Response: All active users
```

---

### Step 6: Get User Detail

```
GET http://localhost:8000/api/users/2/

Headers:
Authorization: Bearer <your_access_token>

Expected Response (200 OK):
{
  "id": 2,
  "email": "faculty@issd.edu",
  "full_name": "Faculty Name",
  ...
}
```

---

### Step 7: Disable a User

```
PATCH http://localhost:8000/api/users/2/status/

Headers:
Content-Type: application/json
Authorization: Bearer <your_access_token>

Body (JSON):
{
  "is_active": false
}

Expected Response (200 OK):
{
  "id": 2,
  "email": "faculty@issd.edu",
  "full_name": "Faculty Name",
  "is_active": false,
  ...
}
```

**✅ Success Indicators:**

- `is_active` is now `false`
- Audit log created with action "user.status_changed"

---

### Step 8: Enable the User Again

```
PATCH http://localhost:8000/api/users/2/status/

Headers:
Content-Type: application/json
Authorization: Bearer <your_access_token>

Body (JSON):
{
  "is_active": true
}

Expected Response (200 OK):
{
  "id": 2,
  "is_active": true,
  ...
}
```

---

## Testing Permission Enforcement

### Create a Student User (for permission testing)

```
POST http://localhost:8000/api/users/

Headers:
Content-Type: application/json
Authorization: Bearer <admin_access_token>

Body:
{
  "email": "student@issd.edu",
  "full_name": "Student Name",
  "phone": "1234567890",
  "role_code": "STUDENT"
}
```

### Try to Access as Student (Should Fail)

1. **Login as the student** - This will fail because student has unusable password:

   ```
   POST /api/auth/login/
   {
     "email": "student@issd.edu",
     "password": "any_password"
   }

   Expected: 401 Unauthorized
   ```

2. **To test permission denial, you would need to:**
   - Set a password for the student via Django shell
   - Login as student
   - Try to create a user (should fail with permission error)

---

## Verify in Django Admin

### Check Audit Logs

1. Go to: `http://localhost:8000/admin/`
2. Navigate to: **Audit Logs > Audit logs**
3. You should see entries for:
   - `user.created` (when you created faculty/student)
   - `user.status_changed` (when you disabled/enabled)

### Check Role Permissions

1. Navigate to: **Roles > Role permissions**
2. You should see 34 mappings
3. Filter by role: **SUPER_ADMIN** → should have 16 permissions
4. Filter by role: **STUDENT** → should have 0 permissions

---

## Error Scenarios to Test

### 1. Create User with Invalid Role

```
POST /api/users/
{
  "email": "test@issd.edu",
  "full_name": "Test",
  "role_code": "INVALID_ROLE"
}

Expected (400 Bad Request):
{
  "role_code": ["Role with code 'INVALID_ROLE' does not exist."]
}
```

### 2. Create User with Duplicate Email

```
POST /api/users/
{
  "email": "faculty@issd.edu",  // Already exists
  "full_name": "Another Faculty",
  "role_code": "FACULTY"
}

Expected (400 Bad Request):
{
  "email": ["A user with this email already exists."]
}
```

### 3. Access Without Token

```
GET /api/users/list/

Headers:
(No Authorization header)

Expected (401 Unauthorized):
{
  "detail": "Authentication credentials were not provided."
}
```

### 4. Access With Invalid Token

```
GET /api/users/list/

Headers:
Authorization: Bearer invalid_token_here

Expected (401 Unauthorized):
{
  "detail": "Given token not valid for any token type"
}
```

---

## Django Shell Testing

### Check User's Permissions

```python
python manage.py shell

from users.models import User

# Get admin user
admin = User.objects.get(email='admin@issd.edu')

# Check permissions
admin.has_permission('user.create')  # Should return True (is superuser)
admin.has_permission('anything')     # Should return True (is superuser)

# Get faculty user
faculty = User.objects.get(email='faculty@issd.edu')

faculty.has_permission('user.view')    # Should return True (has permission)
faculty.has_permission('user.create')  # Should return False (no permission)
```

### Check Audit Logs

```python
from audit.models import AuditLog

# Get latest user creation log
AuditLog.objects.filter(action='user.created').latest('timestamp')

# Get all status changes
AuditLog.objects.filter(action='user.status_changed').order_by('-timestamp')

# Get logs for specific user
AuditLog.objects.filter(entity='User', entity_id='2').order_by('-timestamp')
```

### Check Role Permissions

```python
from roles.models import Role, Permission, RolePermission

# Get all permissions for SUPER_ADMIN
super_admin = Role.objects.get(code='SUPER_ADMIN')
super_admin.role_permissions.all()

# Count permissions by role
for role in Role.objects.all():
    count = role.role_permissions.count()
    print(f"{role.code}: {count} permissions")

# Expected output:
# SUPER_ADMIN: 16 permissions
# CENTRE_ADMIN: 8 permissions
# FACULTY: 1 permission
# STUDENT: 0 permissions
# etc.
```

---

## Success Criteria ✅

Phase 0C is working correctly if:

- [x] Can seed 16 permissions
- [x] Can assign 34 role-permission mappings
- [x] Can create users via API (admin only)
- [x] Can list/filter users via API
- [x] Can enable/disable users via API
- [x] All operations create audit logs
- [x] Permission checks work (superuser always allowed)
- [x] Invalid requests return proper error messages
- [x] No sensitive fields exposed in API responses

---

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'environ'"

**Solution:** Activate virtual environment first

```bash
venv\Scripts\activate
```

### Issue: "Permission denied" when creating user

**Solution:**

1. Check if you're logged in as admin/super_admin
2. Verify token is valid and not expired
3. Check role has `user.create` permission

### Issue: "No active centre available"

**Solution:**

```python
python manage.py shell

from centres.models import Centre
Centre.objects.filter(is_active=True).exists()  # Should be True

# If False, activate a centre:
centre = Centre.objects.first()
centre.is_active = True
centre.save()
```

### Issue: Audit logs not appearing

**Solution:**

1. Check if operation actually succeeded (201/200 status)
2. Verify in Django admin: `/admin/audit/auditlog/`
3. Check timestamp filtering

---

## Next Steps

After successful testing:

1. **Assign permissions to more roles** if needed
2. **Create password reset flow** for users with unusable passwords
3. **Implement Phase 1A** (Academic entities: Course, Batch, etc.)
4. **Add more API endpoints** as needed
5. **Integrate with Next.js frontend**

---

**Phase 0C is COMPLETE and TESTED! 🎉**
