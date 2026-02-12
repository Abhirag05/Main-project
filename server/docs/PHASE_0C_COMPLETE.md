# Phase 0C: Governance & Authorization - COMPLETE ✅

## Overview

Phase 0C implements the governance layer with permission enforcement, controlled user registration, lifecycle management, and audit logging. This completes the security and control foundation.

---

## 🎯 What Was Implemented

### 1. **DRF Permission Class** (`common/permissions.py`)

Reusable permission class for business authorization:

```python
from common.permissions import permission_required

class MyView(APIView):
    permission_classes = [IsAuthenticated, permission_required("user.create")]
```

**Logic:**

- ✅ Superusers automatically allowed
- ❌ Inactive users automatically denied
- 🔍 Delegates to `request.user.has_permission(code)`

### 2. **Audit Logging System** (`audit/`)

**Model:** `AuditLog`

- Tracks `action`, `entity`, `entity_id`, `performed_by`, `timestamp`
- JSON `details` field for additional context
- Indexed for performance

**Service:** `AuditService` (`audit/services.py`)

```python
from audit.services import AuditService

# Log user creation
AuditService.log_user_created(user, created_by=request.user)

# Log status change
AuditService.log_user_status_changed(user, changed_by=request.user,
                                     old_status=True, new_status=False)

# Log role assignment
AuditService.log_role_assigned(user, assigned_by=request.user,
                               old_role=old_role, new_role=new_role)
```

### 3. **User Management APIs** (`user_management/`)

All APIs are JWT-protected with permission-based authorization.

#### a) **Create User (Controlled Registration)**

```
POST /api/users/
Permission: user.create

Request:
{
  "email": "faculty@issd.edu",
  "full_name": "Faculty Name",
  "phone": "9876543210",
  "role_code": "FACULTY"
}

Response: (201 Created)
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

**Backend Logic:**

- Assigns default centre automatically (first active centre)
- Validates role exists
- Sets **unusable password** (user must reset via password reset flow)
- Creates audit log entry

#### b) **List Users**

```
GET /api/users/list/
Permission: user.view

Query Parameters:
- role: Filter by role code (e.g., ?role=FACULTY)
- is_active: Filter by status (e.g., ?is_active=true)

Response: (200 OK)
[
  {
    "id": 2,
    "email": "faculty@issd.edu",
    "full_name": "Faculty Name",
    "phone": "9876543210",
    "role": {...},
    "centre": {...},
    "is_active": true,
    "date_joined": "2024-01-15T10:30:00Z",
    "last_login": null
  }
]
```

#### c) **Get User Detail**

```
GET /api/users/{id}/
Permission: user.view

Response: (200 OK)
{
  "id": 2,
  "email": "faculty@issd.edu",
  ...
}
```

#### d) **Enable/Disable User**

```
PATCH /api/users/{id}/status/
Permission: user.manage

Request:
{
  "is_active": false
}

Response: (200 OK)
{
  "id": 2,
  "email": "faculty@issd.edu",
  "is_active": false,
  ...
}
```

**Backend Logic:**

- Logs status change only if it actually changed
- Creates audit log entry with old and new status

### 4. **Permission Seeding** (`roles/management/commands/seed_permissions.py`)

**Command:**

```bash
python manage.py seed_permissions
```

**Canonical Permissions:**

```
User Management:
- user.create      Can create new users
- user.view        Can view user information
- user.manage      Can enable/disable users
- user.delete      Can delete users

Role Management:
- role.view        Can view role information
- role.assign      Can assign roles to users
- role.create      Can create new roles
- role.manage      Can edit and manage role definitions

Permission Management:
- permission.view    Can view permission information
- permission.assign  Can assign permissions to roles
- permission.manage  Can create and manage permissions

Centre Management:
- centre.view      Can view centre information
- centre.create    Can create new centres
- centre.manage    Can edit and manage centres

Audit:
- audit.view       Can view audit log entries

System:
- system.admin     Full system access
```

**Features:**

- Idempotent (can run multiple times safely)
- Uses `get_or_create`
- Does NOT hardcode IDs

---

## 🔐 Security Features

### ✅ **What's Protected:**

1. **All APIs are JWT-protected** (require valid access token)
2. **Explicit permission checks** using `permission_required("code")`
3. **Field whitelisting** - serializers only expose safe fields
4. **No public self-registration** - only admins can create users
5. **Audit logging** for all sensitive operations

### ❌ **What's NEVER Exposed:**

- `is_staff`
- `is_superuser`
- `password` (hashed or otherwise)

### 🔍 **What's Logged:**

- User creation (who, when, what role/centre)
- User status changes (enable/disable)
- Role assignments (old → new)

---

## 📦 Files Created/Modified

### New Files:

```
common/
  __init__.py
  permissions.py              # HasPermission class

audit/
  models.py                   # AuditLog model
  services.py                 # AuditService helper
  admin.py                    # Read-only audit admin
  migrations/
    0001_initial.py           # AuditLog table

user_management/
  __init__.py
  apps.py
  serializers.py              # CreateUser, UserList, UserStatus
  views.py                    # Create, List, Detail, UpdateStatus
  urls.py                     # API routes
  admin.py
  models.py
  tests.py

roles/management/commands/
  seed_permissions.py         # Permission seeding command
```

### Modified Files:

```
config/settings/base.py       # Added 'common' and 'user_management' to INSTALLED_APPS
config/urls.py                # Added path('api/users/', include('user_management.urls'))
```

---

## 🧪 Testing the APIs

### Prerequisites:

1. Get JWT access token from login:

```bash
POST /api/auth/login/
{
  "email": "admin@issd.edu",
  "password": "your_password"
}
```

2. Use the `access` token in all requests:

```
Authorization: Bearer <access_token>
```

### Test User Creation:

```bash
POST /api/users/
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "student@issd.edu",
  "full_name": "Student Name",
  "phone": "9876543210",
  "role_code": "STUDENT"
}
```

**Expected Response:** 201 Created with user details

**Audit Check:** Run in Django shell:

```python
from audit.models import AuditLog
AuditLog.objects.filter(action='user.created').latest('timestamp')
```

### Test List Users:

```bash
GET /api/users/list/
Authorization: Bearer <token>
```

**With Filters:**

```bash
GET /api/users/list/?role=FACULTY
GET /api/users/list/?is_active=true
GET /api/users/list/?role=STUDENT&is_active=false
```

### Test User Detail:

```bash
GET /api/users/2/
Authorization: Bearer <token>
```

### Test Enable/Disable:

```bash
PATCH /api/users/2/status/
Authorization: Bearer <token>
Content-Type: application/json

{
  "is_active": false
}
```

**Audit Check:**

```python
AuditLog.objects.filter(action='user.status_changed').latest('timestamp')
```

---

## 🎓 Permission Assignment (Next Step)

Permissions are seeded but NOT yet assigned to roles. To make APIs functional:

### Option 1: Django Admin

1. Go to `/admin/roles/rolepermission/`
2. Create mappings:
   - **SUPER_ADMIN** → all permissions
   - **CENTRE_ADMIN** → user._, centre._, audit.view
   - **FACULTY** → user.view

### Option 2: Django Shell

```python
from roles.models import Role, Permission, RolePermission
from django.contrib.auth import get_user_model
User = get_user_model()

# Grant all permissions to SUPER_ADMIN
super_admin_role = Role.objects.get(code='SUPER_ADMIN')
all_permissions = Permission.objects.all()

for perm in all_permissions:
    RolePermission.objects.get_or_create(
        role=super_admin_role,
        permission=perm,
        defaults={'granted_by': User.objects.get(email='admin@issd.edu')}
    )
```

### Option 3: Management Command (Future Enhancement)

Create `python manage.py assign_default_permissions` to automate role-permission mappings.

---

## 📊 Database Schema (New Tables)

### `audit_logs`

```sql
- id (BigAutoField)
- action (CharField)
- entity (CharField)
- entity_id (CharField)
- performed_by_id (ForeignKey → User)
- details (JSONField)
- timestamp (DateTimeField, indexed)
```

---

## ✅ Phase 0C Completion Checklist

- [x] DRF permission class (`HasPermission`)
- [x] Audit log model and service
- [x] User creation API (controlled registration)
- [x] User list API with filtering
- [x] User detail API
- [x] User enable/disable API
- [x] Permission seeding command
- [x] All APIs JWT-protected
- [x] All APIs use permission-based authorization
- [x] Audit logging for sensitive actions
- [x] Field whitelisting in serializers
- [x] Migration files generated and applied
- [x] 16 canonical permissions seeded

---

## 🚀 What's Next?

### Phase 1A: Core Academic Entities (Suggested)

- Course model
- Batch model
- Student enrollment
- Faculty assignment

### Or: Permission Assignment Automation

- Create `assign_default_permissions` management command
- Define standard role-permission mappings
- Auto-assign on role creation

---

## 🔍 Quick Reference

### Permission Codes:

```
user.create, user.view, user.manage, user.delete
role.view, role.assign, role.create, role.manage
permission.view, permission.assign, permission.manage
centre.view, centre.create, centre.manage
audit.view
system.admin
```

### API Endpoints:

```
POST   /api/users/              Create user
GET    /api/users/list/         List users
GET    /api/users/{id}/         Get user detail
PATCH  /api/users/{id}/status/  Enable/disable user
```

### Audit Actions:

```
user.created
user.status_changed
role.assigned
```

---

## 💡 Best Practices

1. **Always use permission_required()** for business APIs
2. **Log all sensitive operations** via AuditService
3. **Never expose is_staff/is_superuser** in API responses
4. **Use get_or_create** for idempotent operations
5. **Whitelist fields** in all serializers
6. **Validate roles and centres** before user creation

---

## 🎉 Success!

Phase 0C is **COMPLETE**. You now have:

- ✅ Business-level permission enforcement
- ✅ Controlled user registration (no public signup)
- ✅ User lifecycle management (enable/disable)
- ✅ Full audit logging for governance
- ✅ 16 canonical permissions seeded
- ✅ Production-ready authorization layer

**Next:** Assign permissions to roles, then proceed with Phase 1 (Academic entities).
