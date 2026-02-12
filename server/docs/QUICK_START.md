# PHASE 0A - Quick Start Guide

## What Was Implemented

✅ **Centre Model** - Single centre (ISSD Main Centre), future-ready
✅ **Role, Permission, RolePermission Models** - Custom RBAC (NOT Django Groups)
✅ **User Model** - Email-based auth, requires role + centre
✅ **Django Admin** - All models registered, Groups UI removed
✅ **Data Migrations** - Default centre + 10 default roles
✅ **Superuser Command** - Helper to create superuser with role/centre

## Run Migrations

**Note:** Migrations have already been generated. Follow these steps to set up your database:

```bash
# 1. Activate virtual environment
venv\Scripts\activate

# 2. If starting fresh, clear migration history (PostgreSQL only)
python manage.py shell -c "from django.db import connection; cursor = connection.cursor(); cursor.execute('TRUNCATE TABLE django_migrations CASCADE'); print('Migration history cleared')"

# 3. Apply migrations - fake existing Django tables, create our custom tables
python manage.py migrate auth --fake
python manage.py migrate contenttypes --fake
python manage.py migrate sessions --fake
python manage.py migrate admin --fake

# 4. Create our custom app tables
python manage.py migrate centres
python manage.py migrate roles
python manage.py migrate users

# 5. Verify setup
python manage.py shell -c "from centres.models import Centre; from roles.models import Role; print('Centres:', Centre.objects.count()); print('Roles:', Role.objects.count())"
```

After running these commands, you'll have:

- **1 Centre**: ISSD Main Centre (ISSD-MAIN)
- **10 Roles**: SUPER_ADMIN, CENTRE_ADMIN, ACADEMIC_COORDINATOR, COURSE_COORDINATOR, BATCH_MENTOR, FACULTY, STUDENT, FINANCE, PLACEMENT, ALUMNI

## Create First Superuser

### Option 1: Using Custom Command (Recommended)

```bash
python manage.py createsuperuser_with_role
```

Interactive prompts will guide you. Defaults to SUPER_ADMIN role and ISSD-MAIN centre.

Or with arguments:

```bash
python manage.py createsuperuser_with_role --email admin@issd.edu --name "Admin User"
```

### Option 2: Django Shell

```python
python manage.py shell

from users.models import User
from roles.models import Role
from centres.models import Centre

centre = Centre.objects.get(code='ISSD-MAIN')
role = Role.objects.get(code='SUPER_ADMIN')

User.objects.create_superuser(
    email='admin@issd.edu',
    password='secure-password',
    full_name='System Administrator',
    role=role,
    centre=centre
)
```

## Access Django Admin

```bash
python manage.py runserver
```

Navigate to: http://127.0.0.1:8000/admin

Login with the superuser credentials you created.

## What You'll See in Admin

- **Centres**: Manage centres (currently 1)
- **Roles**: Manage roles (10 default roles)
- **Permissions**: Define granular permissions
- **Role Permissions**: Map permissions to roles
- **Users**: Manage users (requires role + centre)

## Important Notes

⚠️ **Role and Centre are REQUIRED** when creating any user
⚠️ **Do NOT use Django Groups** for business logic - use our custom RBAC
⚠️ **is_staff** controls Django admin access ONLY
⚠️ **Business permissions** checked via `user.has_permission('code')`

## Default Roles Created

| Code                 | Name                 | Purpose                   |
| -------------------- | -------------------- | ------------------------- |
| SUPER_ADMIN          | Super Admin          | Full system access        |
| CENTRE_ADMIN         | Centre Admin         | Centre-level admin        |
| ACADEMIC_COORDINATOR | Academic Coordinator | Manages academic programs |
| COURSE_COORDINATOR   | Course Coordinator   | Manages courses           |
| BATCH_MENTOR         | Batch Mentor         | Mentors student batches   |
| FACULTY              | Faculty              | Teaching staff            |
| STUDENT              | Student              | Enrolled students         |
| FINANCE              | Finance              | Financial operations      |
| PLACEMENT            | Placement            | Placement activities      |
| ALUMNI               | Alumni               | Former students           |

## Database Tables

- `centres` - Campus/centre records
- `roles` - User role definitions
- `rbac_permissions` - Granular permissions
- `rbac_role_permissions` - Role ↔ Permission mapping
- `users` - User accounts

## Verify Setup

```python
python manage.py shell

# Check centre
from centres.models import Centre
Centre.objects.get(code='ISSD-MAIN')

# Check roles
from roles.models import Role
print(Role.objects.count())  # Should be 10
print(list(Role.objects.values_list('code', flat=True)))

# Check superuser
from users.models import User
admin = User.objects.get(email='admin@issd.edu')
print(admin.has_permission('any_code'))  # Should be True (superuser)
```

## Next Steps

✅ Phase 0A Complete!

**Phase 0B** (Next):

- JWT Authentication
- API Endpoints for auth
- Token refresh logic
- Permission decorators for views

## Need Help?

See [PHASE_0A_COMPLETE.md](PHASE_0A_COMPLETE.md) for full documentation.
