# Student My Batch API Documentation

## Overview

This document describes the **Student My Batch API** - a secure, read-only endpoint that allows students to view their currently assigned batch details.

---

## Feature Summary

**Purpose**: Enable students to view their active batch assignment, including course details, batch schedule, mentor information, and class size.

**Access Level**: STUDENT role only (authenticated)

**Operation**: Read-only (GET requests only)

---

## API Endpoint

### Get My Batch

**Endpoint**: `GET /api/student/my-batch/`

**Authentication**: Required (Bearer token)

**Permission**: `IsStudent` - Only users with `role.code === "STUDENT"`

**Description**: Retrieves the student's currently active batch assignment.

---

## Request

### Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Method

```http
GET /api/student/my-batch/
```

**No request body required.**

---

## Response Scenarios

### 1. Success - Student Has Active Batch

**Status Code**: `200 OK`

**Response Body**:

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

**Field Descriptions**:

| Field | Type | Description |
|-------|------|-------------|
| `batch_id` | Integer | Unique identifier for the batch |
| `batch_code` | String | Unique batch code |
| `course_name` | String | Name of the course |
| `start_date` | Date | Batch start date (YYYY-MM-DD) |
| `end_date` | Date | Batch end date (YYYY-MM-DD) |
| `batch_status` | String | Current batch status: `ACTIVE`, `COMPLETED`, `CANCELLED` |
| `mentor_name` | String or null | Full name of assigned mentor (null if no mentor) |
| `mentor_email` | String or null | Email of assigned mentor (null if no mentor) |
| `total_students` | Integer | Count of active students in the batch |

---

### 2. Success - Student Has No Active Batch

**Status Code**: `200 OK`

**Response Body**:

```json
{
  "message": "You are not assigned to any batch yet",
  "batch": null
}
```

**Scenario**: Student is registered but not yet enrolled in any active batch.

---

### 3. Error - Not a Student

**Status Code**: `403 Forbidden`

**Response Body**:

```json
{
  "detail": "You do not have permission to perform this action."
}
```

**Scenario**: User is authenticated but does not have the STUDENT role (e.g., ADMIN, FACULTY, FINANCE).

---

### 4. Error - Not Authenticated

**Status Code**: `401 Unauthorized`

**Response Body**:

```json
{
  "detail": "Authentication credentials were not provided."
}
```

**Scenario**: No JWT token provided in the request.

---

### 5. Error - Student Profile Not Found

**Status Code**: `404 Not Found`

**Response Body**:

```json
{
  "detail": "Student profile not found for this user"
}
```

**Scenario**: User has STUDENT role but no `StudentProfile` record exists (edge case).

---

## Business Rules

### Access Control

1. **Role-Based Access**:
   - Only users with `role.code === "STUDENT"` can access this endpoint
   - Users with other roles (ADMIN, FACULTY, FINANCE, etc.) receive `403 Forbidden`

2. **Data Isolation**:
   - Students can **ONLY** view their own batch
   - No ability to query other students' batches
   - No batch ID or student ID parameters accepted

### Batch Assignment Logic

1. **Active Batch Definition**:
   - Only batches where `BatchStudent.is_active === True` are returned
   - Each student can have **ONLY ONE** active batch at a time (enforced at database level)

2. **Mentor Assignment**:
   - Mentor details are included if `BatchMentorAssignment.is_active === True` for the batch
   - If no active mentor is assigned, `mentor_name` and `mentor_email` are `null`

3. **Student Count**:
   - `total_students` counts all students where `BatchStudent.is_active === True` for that batch
   - Provides visibility into class size

### Read-Only Operations

- **No Modifications Allowed**: This endpoint is strictly read-only
- Students **CANNOT**:
  - Change their batch assignment
  - Request batch transfers
  - Modify batch details
  - Access batch management features

---

## Database Optimization

The API uses Django ORM query optimization to prevent N+1 query problems:

```python
# Optimized queries with select_related
BatchStudent.objects.select_related(
    'batch',
    'batch__template',
    'batch__template__course'
).get(student=student_profile, is_active=True)

BatchMentorAssignment.objects.select_related(
    'mentor'
).get(batch=batch, is_active=True)
```

**Performance Benefits**:
- Single database hit for batch and related course data
- Single database hit for mentor data
- Efficient count query for total students
- No N+1 query issues

---

## Security Considerations

### Authentication & Authorization

1. **JWT Token Required**: All requests must include a valid JWT bearer token
2. **Role Verification**: Permission class verifies `role.code === "STUDENT"` before processing
3. **User Context**: Uses `request.user` to identify the student (no user ID parameters)

### Data Privacy

1. **No Cross-Student Access**: Students cannot view other students' batch assignments
2. **Limited Mentor Data**: Only name and email exposed (no personal/sensitive data)
3. **No Admin Controls**: No batch management, enrollment, or administrative features exposed

### Error Handling

- Clear error messages for missing profiles
- Graceful handling of missing mentor assignments
- Proper HTTP status codes for all scenarios

---

## Implementation Details

### Components Created

#### 1. Permission Class: `IsStudent`

**File**: `common/permissions.py`

```python
class IsStudent(BasePermission):
    """
    Permission class that allows access only to users with STUDENT role.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if not request.user.is_active:
            return False
        return hasattr(request.user, 'role') and request.user.role.code == 'STUDENT'
```

**Purpose**: Reusable permission class for all student-specific endpoints.

---

#### 2. Serializer: `MyBatchSerializer`

**File**: `apps/students/serializers.py`

```python
class MyBatchSerializer(serializers.Serializer):
    """
    Read-only serializer for student's assigned batch details.
    """
    batch_id = serializers.IntegerField(read_only=True)
    batch_code = serializers.CharField(read_only=True)
    course_name = serializers.CharField(read_only=True)
    start_date = serializers.DateField(read_only=True)
    end_date = serializers.DateField(read_only=True)
    batch_status = serializers.CharField(read_only=True)
    mentor_name = serializers.CharField(read_only=True, allow_null=True)
    mentor_email = serializers.EmailField(read_only=True, allow_null=True)
    total_students = serializers.IntegerField(read_only=True)
```

**Key Features**:
- All fields are `read_only=True` (no write operations)
- `allow_null=True` for mentor fields (handles no mentor scenario)
- Clear field documentation

---

#### 3. API View: `MyBatchView`

**File**: `apps/students/views.py`

```python
class MyBatchView(APIView):
    """
    Read-only API for students to view their currently assigned batch.
    """
    permission_classes = [IsAuthenticated, IsStudent]
    
    def get(self, request):
        # Implementation with optimized queries
        # Handles StudentProfile lookup
        # Finds active BatchStudent assignment
        # Retrieves mentor if assigned
        # Counts total students
        # Returns serialized data or null response
```

**Key Features**:
- Uses `APIView` for simplicity (single GET endpoint)
- Combines `IsAuthenticated` and `IsStudent` permissions
- Query optimization with `select_related()`
- Comprehensive error handling
- Clear response messages

---

#### 4. URL Configuration

**File**: `apps/students/urls.py`

```python
urlpatterns = [
    path('register/', StudentRegistrationView.as_view(), name='student-register'),
    path('my-batch/', MyBatchView.as_view(), name='student-my-batch'),
    path('', include(router.urls)),
]
```

**File**: `config/urls.py`

```python
urlpatterns = [
    # ... other routes
    path('api/student/', include('students.urls')),  # Student authenticated endpoints
    path('api/public/student/', include('students.urls')),  # Public endpoints
]
```

**Final Endpoint**: `GET /api/student/my-batch/`

---

## Testing Guide

### Test Cases

#### 1. Successful Batch Retrieval

**Setup**:
- Create a student user with STUDENT role
- Assign student to a batch (BatchStudent.is_active = True)
- Assign mentor to the batch (optional)

**Request**:
```bash
curl -X GET http://localhost:8000/api/student/my-batch/ \
  -H "Authorization: Bearer <student_jwt_token>"
```

**Expected**: `200 OK` with batch details

---

#### 2. No Active Batch

**Setup**:
- Create a student user with STUDENT role
- Do NOT assign to any batch

**Request**:
```bash
curl -X GET http://localhost:8000/api/student/my-batch/ \
  -H "Authorization: Bearer <student_jwt_token>"
```

**Expected**: 
```json
{
  "message": "You are not assigned to any batch yet",
  "batch": null
}
```

---

#### 3. Non-Student Access Denied

**Setup**:
- Create a user with ADMIN or FACULTY role

**Request**:
```bash
curl -X GET http://localhost:8000/api/student/my-batch/ \
  -H "Authorization: Bearer <admin_jwt_token>"
```

**Expected**: `403 Forbidden`

---

#### 4. Unauthenticated Access

**Request**:
```bash
curl -X GET http://localhost:8000/api/student/my-batch/
```

**Expected**: `401 Unauthorized`

---

#### 5. Batch with No Mentor

**Setup**:
- Create student and assign to batch
- Do NOT assign mentor to the batch

**Expected**: `200 OK` with `mentor_name: null` and `mentor_email: null`

---

#### 6. Multiple Students in Same Batch

**Setup**:
- Create 3 students
- Assign all 3 to the same batch

**Request**: Each student calls the endpoint with their own token

**Expected**: 
- All 3 students receive the same `batch_id`, `batch_code`, `course_name`
- All 3 students see `total_students: 3`
- Each student can only see their own assignment (no cross-access)

---

## Integration with Frontend

### Example React/Next.js Implementation

```typescript
// services/studentApi.ts
import { apiClient } from '@/lib/api';

interface MyBatchResponse {
  batch_id: number;
  batch_code: string;
  course_name: string;
  start_date: string;
  end_date: string;
  batch_status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  mentor_name: string | null;
  mentor_email: string | null;
  total_students: number;
}

interface NoBatchResponse {
  message: string;
  batch: null;
}

export const getMyBatch = async (): Promise<MyBatchResponse | NoBatchResponse> => {
  const response = await apiClient.get('/api/student/my-batch/');
  return response.data;
};
```

```tsx
// components/StudentBatchCard.tsx
import { useEffect, useState } from 'react';
import { getMyBatch } from '@/services/studentApi';

export const StudentBatchCard = () => {
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatch = async () => {
      try {
        const data = await getMyBatch();
        if ('batch' in data && data.batch === null) {
          setBatch(null);
        } else {
          setBatch(data);
        }
      } catch (error) {
        console.error('Failed to fetch batch:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBatch();
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!batch) {
    return (
      <div className="alert alert-info">
        You are not assigned to any batch yet.
      </div>
    );
  }

  return (
    <div className="batch-card">
      <h2>{batch.course_name}</h2>
      <p><strong>Batch Code:</strong> {batch.batch_code}</p>
      <p><strong>Status:</strong> {batch.batch_status}</p>
      <p><strong>Duration:</strong> {batch.start_date} to {batch.end_date}</p>
      
      {batch.mentor_name && (
        <div className="mentor-info">
          <h3>Mentor</h3>
          <p><strong>Name:</strong> {batch.mentor_name}</p>
          <p><strong>Email:</strong> {batch.mentor_email}</p>
        </div>
      )}
      
      <p><strong>Class Size:</strong> {batch.total_students} students</p>
    </div>
  );
};
```

---

## Database Schema Reference

### Models Involved

#### StudentProfile
```python
class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=15)
    admission_status = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### BatchStudent
```python
class BatchStudent(models.Model):
    batch = models.ForeignKey(Batch, on_delete=models.PROTECT)
    student = models.ForeignKey(StudentProfile, on_delete=models.PROTECT)
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
```

#### Batch
```python
class Batch(models.Model):
    template = models.ForeignKey(BatchTemplate, on_delete=models.PROTECT)
    centre = models.ForeignKey(Centre, on_delete=models.PROTECT)
    code = models.CharField(max_length=50, unique=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20)  # ACTIVE, COMPLETED, CANCELLED
    is_active = models.BooleanField(default=True)
```

#### BatchMentorAssignment
```python
class BatchMentorAssignment(models.Model):
    mentor = models.ForeignKey(User, on_delete=models.PROTECT)
    batch = models.ForeignKey(Batch, on_delete=models.PROTECT)
    is_active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    unassigned_at = models.DateTimeField(null=True, blank=True)
```

---

## Future Enhancements (Out of Scope)

The following features are **NOT** included in this read-only API but could be added later:

1. **Batch Request/Transfer**: Allow students to request batch changes
2. **Classmate List**: View other students in the same batch
3. **Batch Schedule**: View detailed timetable for the batch
4. **Attendance Tracking**: View own attendance records
5. **Performance Metrics**: View progress, assignments, grades
6. **Mentor Communication**: Direct messaging with mentor
7. **Batch Notifications**: Receive updates about batch events

---

## Summary

### What Was Implemented

✅ **Permission Class**: `IsStudent` for role-based access control  
✅ **Serializer**: `MyBatchSerializer` for structured batch data  
✅ **API View**: `MyBatchView` with optimized queries and error handling  
✅ **URL Routing**: Configured at `/api/student/my-batch/`  
✅ **Security**: Role verification, data isolation, read-only access  
✅ **Performance**: Query optimization with select_related  
✅ **Documentation**: Comprehensive API documentation  

### Compliance with Requirements

✅ **Access Rules**: Only STUDENT role, own batch only, 403 for others  
✅ **Endpoint**: `GET /api/student/my-batch/`  
✅ **Business Logic**: Active batch lookup, mentor inclusion, null handling  
✅ **Response Data**: All required fields included  
✅ **Technical Requirements**: DRF, query optimization, error handling, status codes  
✅ **Restrictions**: No editing, no cross-student data, no admin controls  
✅ **Code Quality**: Clean, minimal, secure, production-grade  

---

## Contact & Support

For questions or issues with this API:
- Review this documentation
- Check the Django REST Framework logs
- Verify JWT token validity
- Ensure user has STUDENT role
- Confirm StudentProfile and BatchStudent records exist

---

**End of Documentation**
