# Phase 0C - Command Reference

## Setup Commands (First Time)

### 1. Activate Virtual Environment

```bash
venv\Scripts\activate
```

### 2. Apply Database Migrations

```bash
python manage.py migrate
```

**Expected Output:**

```
Applying audit.0001_initial... OK
```

### 3. Seed Permissions

```bash
python manage.py seed_permissions
```

**Expected Output:**

```
Seeding permissions...
  ✓ Created: user.create - Can create new users
  ✓ Created: user.view - Can view user information
  ... (16 total)
Successfully seeded permissions!
  Created: 16
  Already existed: 0
  Total: 16
```

### 4. Assign Permissions to Roles

```bash
python manage.py assign_default_permissions
```

**Expected Output:**

```
Assigning default permissions to roles...
Super Admin (SUPER_ADMIN):
  ✓ Assigned: user.create
  ... (16 total for SUPER_ADMIN)
...
Successfully assigned default permissions!
  New assignments: 34
  Already existed: 0
  Total: 34
```

---

## Verification Commands

### Check Django Configuration

```bash
python manage.py check
```

**Expected:** `System check identified no issues (0 silenced).`

### View All Migrations

```bash
python manage.py showmigrations
```

### Count Permissions

```bash
python manage.py shell -c "from roles.models import Permission; print(Permission.objects.count())"
```

**Expected:** `16`

### Count Role-Permission Mappings

```bash
python manage.py shell -c "from roles.models import RolePermission; print(RolePermission.objects.count())"
```

**Expected:** `34`

### View SUPER_ADMIN Permissions

```bash
python manage.py shell
```

```python
from roles.models import Role
role = Role.objects.get(code='SUPER_ADMIN')
for rp in role.role_permissions.select_related('permission'):
    print(f"  - {rp.permission.code}")
```

---

## Development Commands

### Start Development Server

```bash
python manage.py runserver
```

**Access at:** http://localhost:8000

### Open Django Shell

```bash
python manage.py shell
```

### Create Superuser (if needed)

```bash
python manage.py createsuperuser
```

### Access Django Admin

```
URL: http://localhost:8000/admin/
Login with superuser credentials
```

---

## Database Commands

### Make Migrations (after model changes)

```bash
python manage.py makemigrations
```

### Apply Migrations

```bash
python manage.py migrate
```

### Show Migration Status

```bash
python manage.py showmigrations
```

### SQL for Migration (dry run)

```bash
python manage.py sqlmigrate <app_name> <migration_number>
```

**Example:** `python manage.py sqlmigrate audit 0001`

---

## Testing Commands

### Run Tests (when test cases are added)

```bash
python manage.py test
```

### Run Tests for Specific App

```bash
python manage.py test user_management
```

### Run Tests with Coverage (if coverage installed)

```bash
coverage run --source='.' manage.py test
coverage report
```

---

## Audit & Data Inspection

### View Audit Logs in Shell

```bash
python manage.py shell
```

```python
from audit.models import AuditLog

# Latest audit logs
AuditLog.objects.order_by('-timestamp')[:10]

# User creation logs
AuditLog.objects.filter(action='user.created')

# Status change logs
AuditLog.objects.filter(action='user.status_changed')

# Logs for specific user
AuditLog.objects.filter(entity='User', entity_id='2')
```

### View User Permissions in Shell

```python
from users.models import User

# Get a user
user = User.objects.get(email='admin@issd.edu')

# Check permission
user.has_permission('user.create')  # Returns True/False

# Get user's role permissions
user.role.role_permissions.all()
```

---

## Management Commands (Custom)

### Seed Permissions

```bash
python manage.py seed_permissions
```

**Purpose:** Create 16 canonical permissions  
**Idempotent:** Yes (safe to run multiple times)

### Assign Default Permissions

```bash
python manage.py assign_default_permissions
```

**Purpose:** Create 34 role-permission mappings  
**Idempotent:** Yes (safe to run multiple times)

---

## API Testing Commands (curl)

### Login

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@issd.edu\",\"password\":\"your_password\"}"
```

### Create User

```bash
curl -X POST http://localhost:8000/api/users/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d "{\"email\":\"faculty@issd.edu\",\"full_name\":\"Faculty Name\",\"phone\":\"9876543210\",\"role_code\":\"FACULTY\"}"
```

### List Users

```bash
curl -X GET http://localhost:8000/api/users/list/ \
  -H "Authorization: Bearer <your_token>"
```

### Get User Detail

```bash
curl -X GET http://localhost:8000/api/users/2/ \
  -H "Authorization: Bearer <your_token>"
```

### Disable User

```bash
curl -X PATCH http://localhost:8000/api/users/2/status/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d "{\"is_active\":false}"
```

---

## Troubleshooting Commands

### Check Python Version

```bash
python --version
```

**Expected:** Python 3.10 or higher

### Check Django Version

```bash
python -c "import django; print(django.get_version())"
```

**Expected:** 5.2.9

### Check Installed Packages

```bash
pip list
```

### Check Database Connection

```bash
python manage.py shell -c "from django.db import connection; connection.ensure_connection(); print('Database connected successfully!')"
```

### Check Environment Variables

```bash
python -c "import environ; env = environ.Env(); environ.Env.read_env('.env'); print('SECRET_KEY loaded:', bool(env('SECRET_KEY')))"
```

### Flush Database (DANGER - deletes all data)

```bash
python manage.py flush
```

**⚠️ WARNING:** This deletes all data! Only use in development.

---

## Useful Shell Snippets

### Create Test User Programmatically

```python
python manage.py shell
```

```python
from users.models import User
from roles.models import Role
from centres.models import Centre

role = Role.objects.get(code='FACULTY')
centre = Centre.objects.filter(is_active=True).first()

user = User.objects.create(
    email='test@issd.edu',
    full_name='Test User',
    phone='1234567890',
    role=role,
    centre=centre,
    is_active=True
)
user.set_password('testpass123')
user.save()

print(f"Created user: {user.email}")
```

### Check User Permissions

```python
from users.models import User

user = User.objects.get(email='admin@issd.edu')
print(f"Is superuser: {user.is_superuser}")
print(f"Is active: {user.is_active}")
print(f"Has user.create: {user.has_permission('user.create')}")
print(f"Has user.view: {user.has_permission('user.view')}")
```

### List All Permissions by Module

```python
from roles.models import Permission

for module in Permission.objects.values_list('module', flat=True).distinct():
    print(f"\n{module.upper()}:")
    perms = Permission.objects.filter(module=module)
    for perm in perms:
        print(f"  - {perm.code}: {perm.description}")
```

---

## Common Workflows

### After Code Changes

```bash
# 1. Make migrations
python manage.py makemigrations

# 2. Review migration file
# (check the file in migrations/ directory)

# 3. Apply migrations
python manage.py migrate

# 4. Verify
python manage.py check
```

### After Fresh Clone

```bash
# 1. Create virtual environment
python -m venv venv

# 2. Activate it
venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create .env file (copy from example)
# Add your SECRET_KEY and DATABASE_URL

# 5. Run migrations
python manage.py migrate

# 6. Seed permissions
python manage.py seed_permissions

# 7. Assign permissions to roles
python manage.py assign_default_permissions

# 8. Create superuser
python manage.py createsuperuser

# 9. Start server
python manage.py runserver
```

### Daily Development

```bash
# 1. Activate venv
venv\Scripts\activate

# 2. Pull latest changes
git pull

# 3. Apply any new migrations
python manage.py migrate

# 4. Start server
python manage.py runserver
```

---

## Quick Reference

| Task               | Command                                       |
| ------------------ | --------------------------------------------- |
| Activate venv      | `venv\Scripts\activate`                       |
| Start server       | `python manage.py runserver`                  |
| Open shell         | `python manage.py shell`                      |
| Admin panel        | http://localhost:8000/admin/                  |
| Check config       | `python manage.py check`                      |
| Make migrations    | `python manage.py makemigrations`             |
| Apply migrations   | `python manage.py migrate`                    |
| Seed permissions   | `python manage.py seed_permissions`           |
| Assign permissions | `python manage.py assign_default_permissions` |

---

**Tip:** Always activate the virtual environment before running any command!

```bash
venv\Scripts\activate
```

You'll see `(venv)` in your terminal prompt when activated.
