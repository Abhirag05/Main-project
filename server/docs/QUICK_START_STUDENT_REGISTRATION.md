# Quick Start - Student Registration API

## Prerequisites Check

Before testing, ensure you have:

- ✅ Virtual environment activated
- ✅ Dependencies installed
- ✅ Database configured
- ✅ STUDENT role exists
- ✅ Active centre exists

## Setup Commands

### 1. Run Migrations

```bash
# Activate virtual environment (if not already active)
.\venv\Scripts\Activate.ps1  # Windows PowerShell
# or
source venv/bin/activate  # Linux/Mac

# Run migrations
python manage.py migrate
```

Expected output:

```
Running migrations:
  Applying students.0001_initial... OK
```

### 2. Verify Prerequisites

#### Check STUDENT Role Exists

```bash
python manage.py shell
```

Then in the shell:

```python
from roles.models import Role
student_role = Role.objects.filter(code='STUDENT', is_active=True).first()
if student_role:
    print(f"✅ STUDENT role exists: {student_role}")
else:
    print("❌ STUDENT role not found - run: python manage.py migrate roles")
exit()
```

#### Check Active Centre Exists

```bash
python manage.py shell
```

Then in the shell:

```python
from centres.models import Centre
centre = Centre.objects.filter(is_active=True).first()
if centre:
    print(f"✅ Active centre exists: {centre}")
else:
    print("❌ No active centre - run: python manage.py migrate centres")
exit()
```

### 3. Start Server

```bash
python manage.py runserver
```

Server should start at: `http://127.0.0.1:8000/`

## Quick Test (PowerShell)

### Test 1: Successful Registration

```powershell
$body = @{
    first_name = "John"
    last_name = "Doe"
    username = "jdoe23"
    email = "john.doe@student.com"
    password = "StrongPassword123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/public/student/register/" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

Expected response:

```json
{
  "message": "Registration successful. Admission pending approval.",
  "student_id": 1
}
```

### Test 2: Duplicate Email (Should Fail)

```powershell
$body = @{
    first_name = "Jane"
    last_name = "Smith"
    username = "jsmith"
    email = "john.doe@student.com"
    password = "AnotherPassword123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/public/student/register/" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

Expected error:

```json
{
  "email": ["A user with this email already exists."]
}
```

## Quick Test (cURL)

### Test 1: Successful Registration

```bash
curl -X POST http://localhost:8000/api/public/student/register/ \
  -H "Content-Type: application/json" \
  -d "{\"first_name\":\"John\",\"last_name\":\"Doe\",\"username\":\"jdoe23\",\"email\":\"john.doe@student.com\",\"password\":\"StrongPassword123!\"}"
```

## Verify in Database

### Check User Created

```bash
python manage.py shell
```

```python
from users.models import User

# Get the registered user
user = User.objects.get(email="john.doe@student.com")

# Verify details
print(f"Email: {user.email}")
print(f"Full Name: {user.full_name}")  # Should be "John Doe"
print(f"Role: {user.role.code}")  # Should be "STUDENT"
print(f"is_staff: {user.is_staff}")  # Should be False
print(f"Centre: {user.centre.name}")
```

### Check StudentProfile Created

```python
from students.models import StudentProfile

# Get the student profile
profile = StudentProfile.objects.get(user__email="john.doe@student.com")

# Verify details
print(f"User: {profile.user.full_name}")
print(f"Admission Status: {profile.admission_status}")  # Should be "PENDING"
print(f"Created: {profile.created_at}")
```

### Check Audit Log

```python
from audit.models import AuditLog

# Get registration audit log
log = AuditLog.objects.filter(action="student.registered").first()

# Verify details
print(f"Action: {log.action}")
print(f"Entity: {log.entity}")  # Should be "Student"
print(f"Performed By: {log.performed_by}")  # Should be None
print(f"Details: {log.details}")
```

## Access Admin Panel

1. **Create superuser** (if not already created):

```bash
python manage.py createsuperuser_with_role
```

2. **Access admin**:

```
http://localhost:8000/admin/
```

3. **Navigate to Student Profiles**:

- Login with superuser credentials
- Go to "Students" → "Student Profiles"
- You should see the registered student with PENDING status

## Common Issues

### Issue: "Student role is not configured"

**Solution:**

```bash
python manage.py migrate roles
# or manually create in Django shell:
python manage.py shell
>>> from roles.models import Role
>>> Role.objects.create(code='STUDENT', name='Student', is_active=True)
```

### Issue: "No active centre found"

**Solution:**

```bash
python manage.py migrate centres
# This migration creates the default centre
```

### Issue: ModuleNotFoundError

**Solution:**

```bash
# Ensure virtual environment is activated
.\venv\Scripts\Activate.ps1  # Windows
source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt
```

### Issue: Port already in use

**Solution:**

```bash
# Use different port
python manage.py runserver 8001
```

## Next Steps

After successful testing:

1. ✅ Review [TESTING_STUDENT_REGISTRATION.md](TESTING_STUDENT_REGISTRATION.md) for comprehensive tests
2. ✅ Review [PHASE_0D_COMPLETE.md](PHASE_0D_COMPLETE.md) for implementation details
3. ✅ Commit changes to version control
4. ✅ Deploy to staging environment
5. ✅ Plan Phase 0E: Admission Approval workflow

## API Summary

| Endpoint                        | Method | Auth | Purpose                     |
| ------------------------------- | ------ | ---- | --------------------------- |
| `/api/public/student/register/` | POST   | None | Public student registration |
| `/api/auth/login/`              | POST   | None | Login after registration    |
| `/api/auth/me/`                 | GET    | JWT  | Get user profile            |

## Success Criteria

You have successfully completed Phase 0D if:

- ✅ Student can register without authentication
- ✅ User is created with STUDENT role
- ✅ StudentProfile is created with PENDING status
- ✅ Audit log is created
- ✅ Email uniqueness is enforced
- ✅ Password strength is validated
- ✅ No JWT tokens are returned
- ✅ Admin can view registrations (read-only)
