# Student Registration API - Testing Guide

## Overview

This document provides testing instructions for the newly implemented public student registration API.

## Endpoint Details

### Public Student Registration

**Endpoint:** `POST /api/public/student/register/`  
**Authentication:** None (AllowAny)  
**Description:** Public endpoint for students to register for admission (pre-admission stage)

## Implementation Summary

### 1. Created Students App

- ✅ `students/models.py` - StudentProfile model
- ✅ `students/serializers.py` - StudentRegistrationSerializer
- ✅ `students/views.py` - StudentRegistrationView
- ✅ `students/urls.py` - URL configuration
- ✅ `students/admin.py` - Admin registration (read-only)

### 2. StudentProfile Model

```python
class StudentProfile(models.Model):
    user = OneToOneField(User)
    admission_status = CharField(choices=['PENDING', 'APPROVED', 'REJECTED'], default='PENDING')
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

### 3. Strict Rules Followed

✅ AllowAny permission (public endpoint)  
✅ Only STUDENT role assigned  
✅ NO batch assignment  
✅ NO fees assignment  
✅ NO admission approval  
✅ NO full LMS access  
✅ NO JWT tokens returned  
✅ NO is_staff or is_superuser exposed  
✅ RBAC and audit logging maintained

## Before Testing

### 1. Run Migrations

```bash
python manage.py migrate
```

### 2. Ensure Prerequisites

Ensure the following exist in your database:

- Active STUDENT role (code='STUDENT')
- At least one active Centre

If missing, run:

```bash
# Create default centre
python manage.py migrate centres

# Seed roles
python manage.py migrate roles
```

### 3. Start Development Server

```bash
python manage.py runserver
```

## Testing Scenarios

### Test 1: Successful Registration

**Request:**

```bash
curl -X POST http://localhost:8000/api/public/student/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "username": "jdoe23",
    "email": "john.doe@student.com",
    "password": "StrongPassword123!"
  }'
```

**Expected Response (201 Created):**

```json
{
  "message": "Registration successful. Admission pending approval.",
  "student_id": 1
}
```

**Verify:**

1. Check database: User created with email="john.doe@student.com"
2. User.role.code should be "STUDENT"
3. User.is_staff should be False
4. StudentProfile created with admission_status="PENDING"
5. Audit log entry exists: action="student.registered"

### Test 2: Duplicate Email

**Request:**

```bash
curl -X POST http://localhost:8000/api/public/student/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "username": "jsmith",
    "email": "john.doe@student.com",
    "password": "AnotherPassword123!"
  }'
```

**Expected Response (400 Bad Request):**

```json
{
  "email": ["A user with this email already exists."]
}
```

### Test 3: Weak Password

**Request:**

```bash
curl -X POST http://localhost:8000/api/public/student/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Alice",
    "last_name": "Johnson",
    "username": "ajohnson",
    "email": "alice@student.com",
    "password": "123"
  }'
```

**Expected Response (400 Bad Request):**

```json
{
  "password": [
    "This password is too short. It must contain at least 8 characters.",
    "This password is too common."
  ]
}
```

### Test 4: Missing Required Fields

**Request:**

```bash
curl -X POST http://localhost:8000/api/public/student/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Bob"
  }'
```

**Expected Response (400 Bad Request):**

```json
{
  "last_name": ["This field is required."],
  "username": ["This field is required."],
  "email": ["This field is required."],
  "password": ["This field is required."]
}
```

### Test 5: Invalid Email Format

**Request:**

```bash
curl -X POST http://localhost:8000/api/public/student/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Charlie",
    "last_name": "Brown",
    "username": "cbrown",
    "email": "invalid-email",
    "password": "ValidPassword123!"
  }'
```

**Expected Response (400 Bad Request):**

```json
{
  "email": ["Enter a valid email address."]
}
```

## Database Verification

### Check User Created

```python
from users.models import User

user = User.objects.get(email="john.doe@student.com")
print(f"Email: {user.email}")
print(f"Full Name: {user.full_name}")  # Should be "John Doe"
print(f"Role: {user.role.code}")  # Should be "STUDENT"
print(f"Centre: {user.centre.name}")
print(f"is_staff: {user.is_staff}")  # Should be False
print(f"is_active: {user.is_active}")  # Should be True
```

### Check StudentProfile Created

```python
from students.models import StudentProfile

profile = StudentProfile.objects.get(user__email="john.doe@student.com")
print(f"User: {profile.user.full_name}")
print(f"Admission Status: {profile.admission_status}")  # Should be "PENDING"
print(f"Created At: {profile.created_at}")
```

### Check Audit Log

```python
from audit.models import AuditLog

log = AuditLog.objects.filter(action="student.registered").first()
print(f"Action: {log.action}")
print(f"Entity: {log.entity}")  # Should be "Student"
print(f"Entity ID: {log.entity_id}")
print(f"Performed By: {log.performed_by}")  # Should be None (public registration)
print(f"Details: {log.details}")
```

## Admin Panel Verification

### 1. Access Admin Panel

```
http://localhost:8000/admin/
```

### 2. Navigate to Student Profiles

- Login with superuser credentials
- Go to "Students" → "Student Profiles"

### 3. Verify Read-Only Access

- List view should show: ID, Full Name, Email, Admission Status, Created At
- Clicking on a profile should show read-only view
- Cannot add new profiles through admin
- Cannot delete profiles through admin

## Security Checks

### ✅ No JWT Tokens in Response

The registration endpoint does NOT return JWT tokens. Students must login separately using `/api/auth/login/` after registration.

### ✅ Password Hashing

Passwords are hashed using Django's password hashers (PBKDF2 by default).

### ✅ Email Uniqueness

Email validation prevents duplicate registrations.

### ✅ Role Restriction

Only STUDENT role is assigned. No elevation to staff or superuser.

### ✅ Audit Logging

All registrations are logged with action="student.registered" and performed_by=None.

## Next Steps (Future Phases)

This implementation does NOT include:

- ❌ Batch assignment
- ❌ Fee structure
- ❌ Admission approval workflow
- ❌ LMS access provisioning
- ❌ Email verification
- ❌ SMS notifications

These will be implemented in future phases as per the business requirements.

## Troubleshooting

### Error: "Student role is not configured in the system"

**Solution:** Ensure STUDENT role exists and is active:

```bash
python manage.py shell
>>> from roles.models import Role
>>> Role.objects.get_or_create(code='STUDENT', defaults={'name': 'Student', 'is_active': True})
```

### Error: "No active centre found in the system"

**Solution:** Ensure at least one active centre exists:

```bash
python manage.py migrate centres  # This creates default centre
```

### Error: ModuleNotFoundError

**Solution:** Ensure virtual environment is activated and dependencies installed:

```bash
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\Activate.ps1  # Windows PowerShell
pip install -r requirements.txt
```

## API Testing with Postman

### Collection: Student Registration

#### 1. Import Collection

Create a new Postman collection named "Student Registration API"

#### 2. Add Request

- Name: Register Student
- Method: POST
- URL: `http://localhost:8000/api/public/student/register/`
- Headers:
  - Content-Type: application/json
- Body (raw JSON):

```json
{
  "first_name": "Test",
  "last_name": "Student",
  "username": "teststudent123",
  "email": "test.student@example.com",
  "password": "SecurePassword123!"
}
```

## Conclusion

The public student registration API has been successfully implemented following all strict business requirements:

- ✅ Public endpoint (AllowAny)
- ✅ Creates User with STUDENT role
- ✅ Creates StudentProfile with PENDING status
- ✅ Logs audit entry
- ✅ Returns success message without JWT tokens
- ✅ Validates email uniqueness and password strength
- ✅ Read-only admin visibility

This is a minimal, safe, and future-ready implementation for pre-admission student registration.
