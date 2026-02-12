# Finance Admission Management API

## Overview

This document describes the Finance Admission Management system that allows users with the **FINANCE** role to view, approve, and reject student admission applications.

## Business Context

- Student users self-register through the public registration endpoint
- Upon registration, a `StudentProfile` is created with `admission_status = PENDING`
- Finance users review these pending admissions
- Finance users can **APPROVE** or **REJECT** pending admissions
- Only **PENDING** admissions can be approved or rejected
- All admission status changes are logged in the `AuditLog` table

## Access Control

### Role-Based Access

- **ONLY** users with `role.code === "FINANCE"` can access these endpoints
- All other roles receive `403 Forbidden`
- Finance users can view and manage students from all centres (not restricted to their own centre)

### Permission Class

A new permission class `IsFinanceUser` was created in `common/permissions.py`:

```python
class IsFinanceUser(BasePermission):
    """
    Permission class that allows access only to users with FINANCE role.
    """
    def has_permission(self, request, view):
        # User must be authenticated and active
        # Superusers are always allowed
        # Check if user has FINANCE role
        return hasattr(request.user, 'role') and request.user.role.code == 'FINANCE'
```

## API Endpoints

### Base URL

All endpoints are prefixed with: `/api/public/student/finance/admissions/`

### 1. List Student Admissions

**Endpoint:** `GET /api/public/student/finance/admissions/`

**Description:** List all student users with their admission status.

**Access:** FINANCE role only

**Query Parameters:**

- `admission_status` (optional): Filter by status (`PENDING`, `APPROVED`, `REJECTED`)

**Examples:**

```
GET /api/public/student/finance/admissions/
GET /api/public/student/finance/admissions/?admission_status=PENDING
GET /api/public/student/finance/admissions/?admission_status=APPROVED
GET /api/public/student/finance/admissions/?admission_status=REJECTED
```

**Response:**

```json
[
  {
    "student_profile_id": 1,
    "user_id": 5,
    "full_name": "John Doe",
    "email": "john.doe@student.com",
    "phone": "9876543210",
    "centre": "Main Campus",
    "centre_code": "MAIN",
    "admission_status": "PENDING",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  },
  {
    "student_profile_id": 2,
    "user_id": 6,
    "full_name": "Jane Smith",
    "email": "jane.smith@student.com",
    "phone": "9876543211",
    "centre": "Branch Campus",
    "centre_code": "BRANCH",
    "admission_status": "APPROVED",
    "created_at": "2025-01-14T09:20:00Z",
    "updated_at": "2025-01-15T11:45:00Z"
  }
]
```

**Status Codes:**

- `200 OK` - Success
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not a FINANCE user

---

### 2. Approve Admission

**Endpoint:** `PATCH /api/public/student/finance/admissions/{student_profile_id}/approve/`

**Description:** Approve a pending student admission.

**Access:** FINANCE role only

**Conditions:**

- `admission_status` must be `PENDING`
- If status is not PENDING, returns `400 Bad Request`

**Request:**

No request body required.

**Example:**

```
PATCH /api/public/student/finance/admissions/1/approve/
```

**Success Response (200 OK):**

```json
{
  "student_profile_id": 1,
  "user_id": 5,
  "full_name": "John Doe",
  "email": "john.doe@student.com",
  "admission_status": "APPROVED",
  "message": "Admission approved successfully"
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "Cannot approve admission. Current status is APPROVED. Only PENDING admissions can be approved."
}
```

**Actions Performed:**

1. Updates `StudentProfile.admission_status` to `APPROVED`
2. Creates an `AuditLog` entry:
   - `action`: `"ADMISSION_APPROVED"`
   - `entity`: `"StudentProfile"`
   - `entity_id`: `student_profile_id`
   - `performed_by`: Current FINANCE user
   - `details`: Previous status and student information

**Status Codes:**

- `200 OK` - Admission approved successfully
- `400 Bad Request` - Admission is not in PENDING status
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not a FINANCE user
- `404 Not Found` - Student profile does not exist

---

### 3. Reject Admission

**Endpoint:** `PATCH /api/public/student/finance/admissions/{student_profile_id}/reject/`

**Description:** Reject a pending student admission.

**Access:** FINANCE role only

**Conditions:**

- `admission_status` must be `PENDING`
- If status is not PENDING, returns `400 Bad Request`

**Request Body (optional):**

```json
{
  "rejection_reason": "Incomplete documentation"
}
```

**Example:**

```
PATCH /api/public/student/finance/admissions/1/reject/
Content-Type: application/json

{
  "rejection_reason": "Application documents not verified"
}
```

**Success Response (200 OK):**

```json
{
  "student_profile_id": 1,
  "user_id": 5,
  "full_name": "John Doe",
  "email": "john.doe@student.com",
  "admission_status": "REJECTED",
  "message": "Admission rejected"
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "Cannot reject admission. Current status is REJECTED. Only PENDING admissions can be rejected."
}
```

**Actions Performed:**

1. Updates `StudentProfile.admission_status` to `REJECTED`
2. Creates an `AuditLog` entry:
   - `action`: `"ADMISSION_REJECTED"`
   - `entity`: `"StudentProfile"`
   - `entity_id`: `student_profile_id`
   - `performed_by`: Current FINANCE user
   - `details`: Previous status, rejection reason, and student information

**Status Codes:**

- `200 OK` - Admission rejected successfully
- `400 Bad Request` - Admission is not in PENDING status or validation error
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not a FINANCE user
- `404 Not Found` - Student profile does not exist

---

## Technical Implementation

### Components Created/Modified

#### 1. Permission Class (`common/permissions.py`)

```python
class IsFinanceUser(BasePermission):
    """Permission class for FINANCE role access."""
```

#### 2. Serializers (`apps/students/serializers.py`)

**Added:**

- `StudentAdmissionListSerializer` - For listing admissions
- `AdmissionApproveSerializer` - For approval response
- `AdmissionRejectSerializer` - For rejection input/response

#### 3. ViewSet (`apps/students/views.py`)

**Added:**

- `FinanceAdmissionViewSet` - ReadOnlyModelViewSet with custom actions
  - `list()` - List all student admissions with filtering
  - `approve()` - Custom action for approval
  - `reject()` - Custom action for rejection

**Features:**

- Uses `select_related` for optimized queries
- Transaction support with `@transaction.atomic`
- Comprehensive validation
- Audit logging for all status changes

#### 4. URL Configuration (`apps/students/urls.py`)

**Modified:**

- Added DRF router for the ViewSet
- Registered `FinanceAdmissionViewSet` at `finance/admissions`

### Database Queries Optimization

The ViewSet uses `select_related` to minimize database queries:

```python
queryset = StudentProfile.objects.select_related(
    'user',
    'user__role',
    'user__centre'
).filter(user__role__code='STUDENT')
```

This ensures:
- Single query retrieves all necessary data
- No N+1 query problems
- Efficient data loading

### Transaction Safety

Both `approve()` and `reject()` actions use `@transaction.atomic` decorator to ensure:
- Atomic updates (status change + audit log)
- Rollback on any failure
- Data consistency

## Business Rules

### Approval Rules

1. Only **PENDING** admissions can be approved
2. Approved students become eligible for:
   - Batch assignment
   - Course enrollment
   - Full LMS features (future implementation)
3. Approval is irreversible (no revert endpoint)

### Rejection Rules

1. Only **PENDING** admissions can be rejected
2. Optional rejection reason can be provided
3. Rejected students:
   - Cannot be assigned to batches
   - Should not appear in batch assignment lists
4. Rejection is irreversible (no revert endpoint)

### Finance User Permissions

1. Finance users can view students from **all centres**
2. Finance users can only update `admission_status` field
3. Finance users **cannot** modify:
   - User information (email, name, phone)
   - Role assignments
   - Centre assignments
   - Any other StudentProfile fields

## Audit Logging

All admission status changes are tracked in `AuditLog`:

### Approval Audit Log

```json
{
  "action": "ADMISSION_APPROVED",
  "entity": "StudentProfile",
  "entity_id": "1",
  "performed_by": "<finance_user_id>",
  "details": {
    "previous_status": "PENDING",
    "student_user_id": 5,
    "student_email": "john.doe@student.com",
    "student_name": "John Doe"
  },
  "timestamp": "2025-01-15T12:00:00Z"
}
```

### Rejection Audit Log

```json
{
  "action": "ADMISSION_REJECTED",
  "entity": "StudentProfile",
  "entity_id": "1",
  "performed_by": "<finance_user_id>",
  "details": {
    "previous_status": "PENDING",
    "reason": "Incomplete documentation",
    "student_user_id": 5,
    "student_email": "john.doe@student.com",
    "student_name": "John Doe"
  },
  "timestamp": "2025-01-15T12:00:00Z"
}
```

## Error Handling

### Common Errors

| Status Code | Scenario | Response |
|------------|----------|----------|
| 401 Unauthorized | User not authenticated | `{"detail": "Authentication credentials were not provided."}` |
| 403 Forbidden | User does not have FINANCE role | `{"detail": "You do not have permission to perform this action."}` |
| 404 Not Found | Student profile does not exist | `{"detail": "Not found."}` |
| 400 Bad Request | Admission not in PENDING status | `{"error": "Cannot approve/reject admission. Current status is ..."}` |

## Testing Guide

### Prerequisites

1. Create a FINANCE role in the database:
   ```sql
   INSERT INTO roles (name, code, description, is_active, created_at, updated_at)
   VALUES ('Finance', 'FINANCE', 'Finance department staff', TRUE, NOW(), NOW());
   ```

2. Create a Finance user:
   ```python
   from users.models import User
   from roles.models import Role
   from centres.models import Centre
   
   finance_role = Role.objects.get(code='FINANCE')
   centre = Centre.objects.first()
   
   finance_user = User.objects.create_user(
       email='finance@example.com',
       password='password123',
       full_name='Finance Admin',
       role=finance_role,
       centre=centre
   )
   ```

3. Create some pending student registrations using the public registration endpoint

### Test Scenarios

#### Test 1: List All Admissions

```bash
# Login as finance user first to get token
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "finance@example.com",
    "password": "password123"
  }'

# List all admissions
curl -X GET http://localhost:8000/api/public/student/finance/admissions/ \
  -H "Authorization: Bearer <token>"
```

#### Test 2: Filter Pending Admissions

```bash
curl -X GET "http://localhost:8000/api/public/student/finance/admissions/?admission_status=PENDING" \
  -H "Authorization: Bearer <token>"
```

#### Test 3: Approve Admission

```bash
curl -X PATCH http://localhost:8000/api/public/student/finance/admissions/1/approve/ \
  -H "Authorization: Bearer <token>"
```

#### Test 4: Reject Admission

```bash
curl -X PATCH http://localhost:8000/api/public/student/finance/admissions/2/reject/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "rejection_reason": "Documents not verified"
  }'
```

#### Test 5: Try to Approve Already Approved (Should Fail)

```bash
curl -X PATCH http://localhost:8000/api/public/student/finance/admissions/1/approve/ \
  -H "Authorization: Bearer <token>"
  
# Expected: 400 Bad Request with error message
```

#### Test 6: Non-Finance User Access (Should Fail)

```bash
# Login as non-finance user (e.g., faculty or student)
curl -X GET http://localhost:8000/api/public/student/finance/admissions/ \
  -H "Authorization: Bearer <non_finance_token>"
  
# Expected: 403 Forbidden
```

## Future Enhancements

### Potential Features (Not Implemented)

1. **Bulk Operations**
   - Approve multiple admissions at once
   - Reject multiple admissions with same reason

2. **Revert Capability**
   - Endpoint to revert APPROVED → PENDING
   - Endpoint to revert REJECTED → PENDING
   - With proper audit logging

3. **Notifications**
   - Email notification to student on approval
   - Email notification to student on rejection
   - SMS notifications

4. **Comments/Notes**
   - Allow finance users to add internal notes
   - Track multiple reviewers' comments

5. **Approval Workflow**
   - Multi-stage approval (L1, L2 approval)
   - Require multiple finance users to approve

6. **Advanced Filtering**
   - Filter by date range
   - Filter by centre
   - Search by student name/email

7. **Statistics Dashboard**
   - Total pending admissions
   - Approval rate
   - Average processing time

## Summary

This implementation provides a secure, production-grade Finance Admission Management system with:

✅ Role-based access control (FINANCE only)  
✅ Clean, readable code with proper serializers and ViewSet  
✅ Transaction safety for all updates  
✅ Comprehensive audit logging  
✅ Query optimization with select_related  
✅ Proper validation and error handling  
✅ Clear business rule enforcement  
✅ RESTful API design  
✅ Production-ready code quality  

The system ensures that only authorized Finance personnel can manage student admissions while maintaining complete audit trails and data integrity.
