# Finance Admin Batch Management Feature

## Overview
Extended the batch management features from Centre Admin to Finance Admin with role-based filtering for eligible students.

## Changes Implemented

### 1. Permission Classes

#### New: `IsCentreOrFinanceAdmin`
- **Location**: `apps/batch_management/views.py`
- **Purpose**: Shared permission class for both Centre Admin and Finance Admin
- **Usage**: Applied to student assignment endpoints
- **Logic**:
  - Allows users with role code `CENTRE_ADMIN` or `FINANCE`
  - Requires user to have a centre assigned
  - Object-level permission checks batch belongs to user's centre

#### Updated: `IsCentreAdminOrSuperAdminReadOnly`
- **Extended to**: Also allow Finance Admin (full access like Centre Admin)
- **Usage**: Applied to batch CRUD operations
- **Logic**:
  - Super Admin: Read-only access to all batches
  - Centre Admin & Finance Admin: Full CRUD access to their centre's batches

### 2. Batch Management Endpoints

All endpoints now support **both CENTRE_ADMIN and FINANCE** roles:

#### a. Create Batch
- **Endpoint**: `POST /api/batches/`
- **Permission**: `IsCentreAdminOrSuperAdminReadOnly`
- **Access**: Centre Admin, Finance Admin

#### b. List/Retrieve Batches
- **Endpoints**: 
  - `GET /api/batches/`
  - `GET /api/batches/{id}/`
- **Permission**: `IsCentreAdminOrSuperAdminReadOnly`
- **Filtering**: Both roles only see their centre's batches

### 3. Student Assignment Endpoints

#### a. Eligible Students (KEY CHANGE)
- **Endpoint**: `GET /api/batches/{id}/eligible-students/`
- **Permission**: `IsCentreOrFinanceAdmin`
- **Role-Based Filtering**:

**Finance Admin sees:**
```python
admission_status__in=['FULL_PAYMENT_VERIFIED', 'INSTALLMENT_VERIFIED']
```

**Centre Admin sees:**
```python
admission_status__in=['APPROVED', 'FULL_PAYMENT_VERIFIED', 'INSTALLMENT_VERIFIED']
```

- **Common Filter**: No active batch assignment
- **Implementation**: Conditional queryset based on `request.user.role.code`

#### b. Assign Students
- **Endpoint**: `POST /api/batches/{id}/assign-students/`
- **Permission**: `IsCentreOrFinanceAdmin`
- **Validation**: Accepts students with statuses:
  - `APPROVED`
  - `FULL_PAYMENT_VERIFIED`
  - `INSTALLMENT_VERIFIED`
- **No role-based validation**: Assignment logic is the same for both roles

#### c. Batch Details
- **Endpoint**: `GET /api/batches/{id}/details/`
- **Permission**: `IsCentreOrFinanceAdmin`
- **Returns**: Batch info with enrolled students

### 4. Audit Logging

Updated to differentiate between roles:

**Finance Admin:**
```python
action='STUDENTS_ASSIGNED_TO_BATCH_BY_FINANCE'
```

**Centre Admin:**
```python
action='STUDENTS_ASSIGNED_TO_BATCH_BY_CENTRE_ADMIN'
```

Additional details logged:
```python
{
    'batch_code': batch.code,
    'student_ids': student_profile_ids,
    'student_count': len(student_profile_ids),
    'centre_id': batch.centre_id,
    'centre_code': batch.centre.code,
    'assigned_by_role': user_role  # NEW
}
```

## Security & Scope

### Centre Scoping
- Finance Admin is **centre-scoped** (same as Centre Admin)
- Can only see/manage batches in their assigned centre
- Cannot access other centres' data

### Student Visibility
- Finance Admin: **Only fee-verified students** in eligible list
- Centre Admin: **All approved students** (including fee-verified)
- This filtering applies **ONLY to eligible students listing**
- No additional checks during assignment (reuses existing validation)

## What Was NOT Changed

### Unchanged Features
- ✓ Batch capacity validation
- ✓ Single active batch per student rule
- ✓ BatchStudent model and logic
- ✓ Batch status management
- ✓ Transfer student logic (if exists)
- ✓ Centre Admin permissions (retained fully)

### Mentor Management
- Currently kept as Centre Admin only
- Can be extended later if needed

## API Usage Examples

### 1. Get Eligible Students (Finance Admin)
```http
GET /api/batches/123/eligible-students/
Authorization: Bearer <finance_admin_token>
```

**Response** (Finance Admin):
```json
[
  {
    "id": 1,
    "user_id": 10,
    "full_name": "John Doe",
    "email": "john@example.com",
    "admission_status": "FULL_PAYMENT_VERIFIED"
  },
  {
    "id": 2,
    "user_id": 11,
    "full_name": "Jane Smith",
    "email": "jane@example.com",
    "admission_status": "INSTALLMENT_VERIFIED"
  }
]
```

### 2. Get Eligible Students (Centre Admin)
```http
GET /api/batches/123/eligible-students/
Authorization: Bearer <centre_admin_token>
```

**Response** (Centre Admin - includes APPROVED):
```json
[
  {
    "id": 1,
    "user_id": 10,
    "full_name": "John Doe",
    "email": "john@example.com",
    "admission_status": "FULL_PAYMENT_VERIFIED"
  },
  {
    "id": 2,
    "user_id": 11,
    "full_name": "Jane Smith",
    "email": "jane@example.com",
    "admission_status": "INSTALLMENT_VERIFIED"
  },
  {
    "id": 3,
    "user_id": 12,
    "full_name": "Bob Johnson",
    "email": "bob@example.com",
    "admission_status": "APPROVED"
  }
]
```

### 3. Assign Students (Both Roles)
```http
POST /api/batches/123/assign-students/
Authorization: Bearer <token>
Content-Type: application/json

{
  "student_profile_ids": [1, 2]
}
```

**Response**:
```json
{
  "message": "Successfully assigned 2 students to batch BATCH-001.",
  "batch_id": 123,
  "batch_code": "BATCH-001",
  "assigned_student_ids": [1, 2],
  "current_student_count": 15,
  "max_students": 30
}
```

## Testing

### Run Test Script
```bash
cd Issd-Backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python test_finance_batch_management.py
```

### Manual API Testing

#### Prerequisites
1. Create a Finance Admin user:
```python
from django.contrib.auth import get_user_model
from apps.roles.models import Role
from apps.centres.models import Centre

User = get_user_model()
finance_role = Role.objects.get(code='FINANCE')
centre = Centre.objects.first()

finance_admin = User.objects.create_user(
    username='finance1',
    email='finance1@example.com',
    full_name='Finance Admin 1',
    password='password123',
    role=finance_role,
    centre=centre,
    is_active=True
)
```

2. Create test students with different statuses:
```python
from students.models import StudentProfile

# Create APPROVED student
approved_user = User.objects.create_user(
    username='student1',
    email='student1@example.com',
    full_name='Approved Student',
    role=student_role,
    centre=centre
)
StudentProfile.objects.create(
    user=approved_user,
    admission_status='APPROVED'
)

# Create FULL_PAYMENT_VERIFIED student
verified_user = User.objects.create_user(
    username='student2',
    email='student2@example.com',
    full_name='Verified Student',
    role=student_role,
    centre=centre
)
StudentProfile.objects.create(
    user=verified_user,
    admission_status='FULL_PAYMENT_VERIFIED'
)
```

#### Test Cases

**Test 1: Finance Admin sees only fee-verified**
```bash
# Login as Finance Admin
curl -X GET http://localhost:8000/api/batches/1/eligible-students/ \
  -H "Authorization: Bearer <finance_token>"

# Should NOT include APPROVED students
```

**Test 2: Centre Admin sees all**
```bash
# Login as Centre Admin
curl -X GET http://localhost:8000/api/batches/1/eligible-students/ \
  -H "Authorization: Bearer <centre_token>"

# Should include APPROVED + fee-verified students
```

**Test 3: Finance Admin can assign students**
```bash
curl -X POST http://localhost:8000/api/batches/1/assign-students/ \
  -H "Authorization: Bearer <finance_token>" \
  -H "Content-Type: application/json" \
  -d '{"student_profile_ids": [1, 2]}'

# Should succeed
```

**Test 4: Check audit log**
```python
from apps.audit.models import AuditLog

log = AuditLog.objects.filter(
    action='STUDENTS_ASSIGNED_TO_BATCH_BY_FINANCE'
).latest('timestamp')

print(log.details)  # Should show assigned_by_role: 'FINANCE'
```

## Database Changes

**No migrations required!**

All changes are code-only:
- New permission classes
- Updated queryset filtering
- Extended role checks in existing permissions

## Rollback Plan

If needed, rollback changes in `apps/batch_management/views.py`:

1. Revert `IsCentreAdminOrSuperAdminReadOnly` to check only `CENTRE_ADMIN`
2. Revert `IsCentreOrFinanceAdmin` → back to `IsCentreAdmin`
3. Revert eligible_students filtering logic
4. Revert audit log action names

All other functionality remains unchanged.

## Future Enhancements

### Possible Extensions
1. **Mentor Assignment**: Extend to Finance Admin if needed
2. **Batch Status Updates**: Currently via IsCentreAdminOrSuperAdminReadOnly (already works)
3. **Separate Finance Dashboard**: Custom stats for Finance Admin
4. **Bulk Operations**: Batch-assign students across multiple batches
5. **Student Transfer**: Between batches (if not already implemented)

## Summary

✅ **Implemented**:
- Finance Admin can create batches
- Finance Admin can list/view batches (centre-scoped)
- Finance Admin sees only fee-verified students in eligible list
- Finance Admin can assign students to batches
- Audit logs differentiate between Finance and Centre Admin actions
- Zero code duplication (reused existing logic with role checks)

✅ **Preserved**:
- Centre Admin functionality unchanged
- All business rules maintained
- Security model intact (centre-scoped)
- Database schema unchanged

✅ **Security**:
- Role-based access control enforced
- Centre scoping maintained
- Object-level permissions checked
- No privilege escalation possible
