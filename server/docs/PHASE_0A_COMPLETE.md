# Phase 0A: Administration & Security Foundation

## Completed Implementation

### 1. ✅ RBAC Database Design - Fixed Table Names

**Changed to avoid Django conflicts:**

- `permissions` → `rbac_permissions`
- `role_permissions` → `rbac_role_permissions`
- `roles` → kept as is

**Location:** [roles/models.py](roles/models.py)

### 2. ✅ RBAC Integrity - Enforced Required Fields

**User Model Updates:**

- `role` field: **REQUIRED** (removed `null=True`, `blank=True`)
- `centre` field: **REQUIRED** (removed `null=True`, `blank=True`)

**UserManager Updates:**

- `create_superuser()` now **requires** both `role` and `centre`
- Validates `is_staff=True` and `is_superuser=True`

**Location:** [users/models.py](users/models.py)

### 3. ✅ Business Permission Checks - Improved Logic

**Updated `User.has_permission(permission_code)`:**

- ✅ Superusers automatically return `True` for all permissions
- ✅ Inactive users always return `False`
- ✅ Regular users checked via: Role → RolePermission → Permission

**Location:** [users/models.py](users/models.py) (line ~130)

### 4. ✅ Django Admin - Cleaned Up

**Removed Django Groups UI:**

- Removed `filter_horizontal` for groups/user_permissions
- Removed groups and user_permissions from fieldsets
- Clear messaging: "is_staff: Django admin access only. Business authorization uses Role + Permissions (NOT Groups)"

**All models registered:**

- ✅ Centre - [centres/admin.py](centres/admin.py)
- ✅ Role, Permission, RolePermission - [roles/admin.py](roles/admin.py)
- ✅ User - [users/admin.py](users/admin.py)

### 5. ✅ Default Centre - Data Migration

**Created:** [centres/migrations/0002_create_default_centre.py](centres/migrations/0002_create_default_centre.py)

**Default Centre:**

- Name: `ISSD Main Centre`
- Code: `ISSD-MAIN`
- Created only if no centres exist
- Uses `apps.get_model()` - no hardcoded IDs
- Reversible migration

### 6. ✅ Default Roles - Data Migration

**Created:** [roles/migrations/0002_create_default_roles.py](roles/migrations/0002_create_default_roles.py)

**10 Default Roles:**

1. `SUPER_ADMIN` - Full system access and control
2. `CENTRE_ADMIN` - Centre-level administrative access
3. `ACADEMIC_COORDINATOR` - Manages academic programs and curriculum
4. `COURSE_COORDINATOR` - Manages individual courses and their content
5. `BATCH_MENTOR` - Mentors and manages student batches
6. `FACULTY` - Teaching staff with course delivery responsibilities
7. `STUDENT` - Enrolled student in the campus
8. `FINANCE` - Handles financial operations and billing
9. `PLACEMENT` - Manages placement activities and employer relations
10. `ALUMNI` - Former student with limited access

**Migration Safety:**

- Uses `get_or_create()` - safe for re-runs
- Uses `apps.get_model()` - no hardcoded IDs
- Fully reversible

### 7. ✅ Migration Safety - Best Practices

**All migrations follow:**

- ✅ No hardcoded primary keys
- ✅ Use `apps.get_model()` for historical model access
- ✅ Reversible operations (with reverse functions)
- ✅ Idempotent (safe to run multiple times)

---

## Next Steps: Running Migrations

### Step 1: Generate Initial Migrations

```bash
python manage.py makemigrations centres
python manage.py makemigrations roles
python manage.py makemigrations users
```

### Step 2: Apply All Migrations

```bash
python manage.py migrate
```

This will:

1. Create all tables (centres, roles, rbac_permissions, rbac_role_permissions, users)
2. Auto-create the default centre: **ISSD Main Centre**
3. Auto-create 10 default roles

### Step 3: Create First Superuser

**IMPORTANT:** You MUST provide role and centre when creating a superuser.

```bash
python manage.py shell
```

Then in the shell:

```python
from users.models import User
from roles.models import Role
from centres.models import Centre

# Get the default centre and super admin role
centre = Centre.objects.get(code='ISSD-MAIN')
role = Role.objects.get(code='SUPER_ADMIN')

# Create superuser
User.objects.create_superuser(
    email='admin@issd.edu',
    password='your-secure-password',
    full_name='System Administrator',
    role=role,
    centre=centre
)
```

---

## Model Relationships

```
Centre
  └── Users (many)

Role
  ├── Users (many)
  └── RolePermissions (many)
      └── Permission

User
  ├── role → Role (required)
  ├── centre → Centre (required)
  └── has_permission(code) → checks via Role.RolePermissions
```

---

## Key Architectural Decisions

### ✅ Custom RBAC (NOT Django Groups)

- Business authorization uses `Role` + `Permission` models
- Django's built-in Groups/Permissions are NOT used
- `is_staff` controls **Django admin access ONLY**

### ✅ Centre-Aware System

- Currently ONE centre, but system is future-ready
- All users MUST belong to a centre
- Centre validation prevents deletion of last active centre

### ✅ Role Integrity

- All users MUST have a role
- Superusers MUST have both role and centre
- Prevents orphaned users without business authorization

### ✅ Permission Hierarchy

- Superusers bypass permission checks (always `True`)
- Inactive users have no permissions (always `False`)
- Regular users checked via role mappings

---

## File Structure

```
centres/
  ├── models.py (Centre model)
  ├── admin.py (Centre admin registration)
  ├── migrations/
  │   ├── 0001_initial.py (generated)
  │   └── 0002_create_default_centre.py (data migration)
  └── management/commands/
      └── create_default_centre.py (manual command)

roles/
  ├── models.py (Role, Permission, RolePermission)
  ├── admin.py (All RBAC admin registrations)
  └── migrations/
      ├── 0001_initial.py (generated)
      └── 0002_create_default_roles.py (data migration)

users/
  ├── models.py (User, UserManager)
  ├── admin.py (User admin - no Groups)
  └── migrations/
      └── 0001_initial.py (generated)
```

---

## Database Tables

| Table Name              | Purpose                   |
| ----------------------- | ------------------------- |
| `centres`               | Campus/centre records     |
| `roles`                 | User role definitions     |
| `rbac_permissions`      | Granular permissions      |
| `rbac_role_permissions` | Role ↔ Permission mapping |
| `users`                 | Custom user accounts      |

---

## Validation & Safety

### Centre Model

- ✅ At least one centre must always be active
- ✅ Prevents deletion of last active centre
- ✅ Unique name and code constraints

### User Model

- ✅ Email is USERNAME_FIELD (unique)
- ✅ Role is required (PROTECT on delete)
- ✅ Centre is required (PROTECT on delete)
- ✅ Superuser validation in manager

### RBAC Models

- ✅ Role-Permission mapping is unique
- ✅ Cascade deletes for role permissions
- ✅ Audit trail with granted_by field

---

## Testing the Setup

### 1. Verify Default Centre

```python
from centres.models import Centre
Centre.objects.get(code='ISSD-MAIN')
# Should return: ISSD Main Centre (ISSD-MAIN)
```

### 2. Verify Default Roles

```python
from roles.models import Role
Role.objects.count()  # Should return 10
Role.objects.values_list('code', flat=True)
# Should list all 10 role codes
```

### 3. Test Permission Check

```python
from users.models import User
user = User.objects.get(email='admin@issd.edu')

# Superuser should have all permissions
user.has_permission('any_permission_code')  # Returns True

# Regular user (create a test user with a role but no superuser)
# Returns True only if role has that permission
```

---

## Important Notes

⚠️ **Do NOT use Django Groups** for business authorization

- Groups are still available for Django's internal use
- UserAdmin deliberately excludes groups/permissions UI
- All business logic should use `user.has_permission(code)`

⚠️ **is_staff is NOT for business authorization**

- `is_staff=True` → Can access Django admin interface
- `is_superuser=True` → Has all Django permissions + all business permissions
- Business permissions → Checked via `Role` + `Permission`

⚠️ **Migrations are idempotent**

- Safe to re-run
- Won't create duplicates (uses get_or_create)
- Can be reversed

---

## Phase 0A Status: ✅ COMPLETE

All requirements have been implemented:

- ✅ RBAC database design fixed
- ✅ User model enforces role + centre
- ✅ Permission checks handle superusers + inactive users
- ✅ Django Admin cleaned (no Groups UI)
- ✅ Default centre data migration ready
- ✅ Default roles data migration ready
- ✅ Migrations are clean and safe

**Next Phase:** JWT Authentication & API Endpoints
