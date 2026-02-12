# PHASE 1A — ACADEMIC MASTER DATA

## Complete Implementation Documentation

---

## **Overview**

This document describes the complete implementation of **PHASE 1A: Academic Master Data** for the ISSD Campus ERP + LMS System. This phase establishes the foundation for managing courses, subjects, and their relationships.

**Implemented Features:**

- ✅ Course management (create, list)
- ✅ Subject management (create, list)
- ✅ Course-Subject mapping (create, retrieve by course)
- ✅ JWT authentication on all endpoints
- ✅ Permission-based authorization
- ✅ Comprehensive audit logging
- ✅ Input validation and error handling

**What is NOT implemented (as per Phase 1A requirements):**

- ❌ Timetables
- ❌ Sessions/periods
- ❌ Workload calculation
- ❌ Attendance tracking
- ❌ Examinations/results
- ❌ Fee payments

---

## **Database Schema**

### **1. Course Model**

**Table:** `academics_courses`

| Field       | Type           | Constraints      | Description               |
| ----------- | -------------- | ---------------- | ------------------------- |
| id          | BigAutoField   | PRIMARY KEY      | Auto-incrementing ID      |
| code        | CharField(20)  | UNIQUE, NOT NULL | Course code (e.g., "BCA") |
| name        | CharField(200) | NOT NULL         | Course name               |
| description | TextField      | Optional         | Detailed description      |
| is_active   | BooleanField   | DEFAULT TRUE     | Active status             |
| created_at  | DateTimeField  | AUTO_NOW_ADD     | Timestamp                 |
| updated_at  | DateTimeField  | AUTO_NOW         | Timestamp                 |

**Indexes:**

- PRIMARY KEY on `id`
- UNIQUE on `code`
- Index on `is_active`

**Example Data:**

```json
{
  "id": 1,
  "code": "BCA",
  "name": "Bachelor of Computer Applications",
  "description": "3-year undergraduate program in computer science",
  "is_active": true,
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### **2. Subject Model**

**Table:** `academics_subjects`

| Field       | Type           | Constraints      | Description                  |
| ----------- | -------------- | ---------------- | ---------------------------- |
| id          | BigAutoField   | PRIMARY KEY      | Auto-incrementing ID         |
| code        | CharField(20)  | UNIQUE, NOT NULL | Subject code (e.g., "CS101") |
| name        | CharField(200) | NOT NULL         | Subject name                 |
| description | TextField      | Optional         | Detailed description         |
| is_active   | BooleanField   | DEFAULT TRUE     | Active status                |
| created_at  | DateTimeField  | AUTO_NOW_ADD     | Timestamp                    |
| updated_at  | DateTimeField  | AUTO_NOW         | Timestamp                    |

**Indexes:**

- PRIMARY KEY on `id`
- UNIQUE on `code`
- Index on `is_active`

**Example Data:**

```json
{
  "id": 5,
  "code": "CS101",
  "name": "Introduction to Programming",
  "description": "Basic programming concepts using Python",
  "is_active": true,
  "created_at": "2025-01-15T11:00:00Z",
  "updated_at": "2025-01-15T11:00:00Z"
}
```

### **3. CourseSubject Model**

**Table:** `academics_course_subjects`

| Field          | Type                 | Constraints                 | Description                    |
| -------------- | -------------------- | --------------------------- | ------------------------------ |
| id             | BigAutoField         | PRIMARY KEY                 | Auto-incrementing ID           |
| course_id      | ForeignKey           | NOT NULL, ON DELETE CASCADE | Reference to Course            |
| subject_id     | ForeignKey           | NOT NULL, ON DELETE CASCADE | Reference to Subject           |
| sequence_order | PositiveIntegerField | NOT NULL                    | Order of subject in curriculum |
| is_active      | BooleanField         | DEFAULT TRUE                | Active status                  |

**Constraints:**

- UNIQUE(course_id, subject_id) - Prevents duplicate assignments
- CHECK(sequence_order >= 1)

**Indexes:**

- PRIMARY KEY on `id`
- UNIQUE on (course_id, subject_id)
- Index on `course_id`
- Index on `is_active`

**Example Data:**

```json
{
  "id": 10,
  "course": 1,
  "subject": 5,
  "sequence_order": 1,
  "is_active": true
}
```

---

## **API Endpoints**

All endpoints require **JWT authentication** via `Authorization: Bearer <token>` header.

### **1. Create Course**

**Endpoint:** `POST /api/academics/courses/`

**Required Permission:** `academics.create`

**Request Body:**

```json
{
  "code": "BCA",
  "name": "Bachelor of Computer Applications",
  "description": "3-year undergraduate program",
  "is_active": true
}
```

**Success Response (201):**

```json
{
  "status": "success",
  "message": "Course created successfully",
  "data": {
    "id": 1,
    "code": "BCA",
    "name": "Bachelor of Computer Applications",
    "description": "3-year undergraduate program",
    "is_active": true,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

**Validation Errors (400):**

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "code": ["Course with code 'BCA' already exists."]
  }
}
```

**Permission Denied (403):**

```json
{
  "status": "error",
  "message": "You do not have permission to create courses"
}
```

**Audit Event Created:**

```
Action: course.created
Details: {"course_id": 1, "course_code": "BCA", "course_name": "Bachelor of Computer Applications"}
```

---

### **2. List Courses**

**Endpoint:** `GET /api/academics/courses/`

**Required Permission:** `academics.view`

**Query Parameters:**

- `is_active` (optional): Filter by active status (`true`/`false`)
- `search` (optional): Search in code or name

**Success Response (200):**

```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": 1,
      "code": "BCA",
      "name": "Bachelor of Computer Applications",
      "description": "3-year undergraduate program",
      "is_active": true,
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "code": "MCA",
      "name": "Master of Computer Applications",
      "description": "2-year postgraduate program",
      "is_active": true,
      "created_at": "2025-01-15T10:35:00Z",
      "updated_at": "2025-01-15T10:35:00Z"
    }
  ]
}
```

**Filtered Example:**

```
GET /api/academics/courses/?is_active=true&search=computer

Response:
{
    "status": "success",
    "count": 2,
    "data": [...]  // Only active courses with "computer" in code or name
}
```

---

### **3. Create Subject**

**Endpoint:** `POST /api/academics/subjects/`

**Required Permission:** `academics.create`

**Request Body:**

```json
{
  "code": "CS101",
  "name": "Introduction to Programming",
  "description": "Basic programming concepts using Python",
  "is_active": true
}
```

**Success Response (201):**

```json
{
  "status": "success",
  "message": "Subject created successfully",
  "data": {
    "id": 5,
    "code": "CS101",
    "name": "Introduction to Programming",
    "description": "Basic programming concepts using Python",
    "is_active": true,
    "created_at": "2025-01-15T11:00:00Z",
    "updated_at": "2025-01-15T11:00:00Z"
  }
}
```

**Validation Errors (400):**

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "code": ["Subject with code 'CS101' already exists."]
  }
}
```

**Audit Event Created:**

```
Action: subject.created
Details: {"subject_id": 5, "subject_code": "CS101", "subject_name": "Introduction to Programming"}
```

---

### **4. List Subjects**

**Endpoint:** `GET /api/academics/subjects/`

**Required Permission:** `academics.view`

**Query Parameters:**

- `is_active` (optional): Filter by active status (`true`/`false`)
- `search` (optional): Search in code or name

**Success Response (200):**

```json
{
  "status": "success",
  "count": 3,
  "data": [
    {
      "id": 5,
      "code": "CS101",
      "name": "Introduction to Programming",
      "description": "Basic programming concepts using Python",
      "is_active": true,
      "created_at": "2025-01-15T11:00:00Z",
      "updated_at": "2025-01-15T11:00:00Z"
    },
    {
      "id": 6,
      "code": "CS102",
      "name": "Data Structures",
      "description": "Arrays, linked lists, trees, graphs",
      "is_active": true,
      "created_at": "2025-01-15T11:05:00Z",
      "updated_at": "2025-01-15T11:05:00Z"
    }
  ]
}
```

---

### **5. Assign Subject to Course**

**Endpoint:** `POST /api/academics/course-subjects/`

**Required Permission:** `academics.create`

**Request Body:**

```json
{
  "course": 1,
  "subject": 5,
  "sequence_order": 1,
  "is_active": true
}
```

**Success Response (201):**

```json
{
  "status": "success",
  "message": "Subject assigned to course successfully",
  "data": {
    "id": 10,
    "course": 1,
    "course_code": "BCA",
    "course_name": "Bachelor of Computer Applications",
    "subject": 5,
    "subject_code": "CS101",
    "subject_name": "Introduction to Programming",
    "subject_description": "Basic programming concepts using Python",
    "sequence_order": 1,
    "is_active": true
  }
}
```

**Validation Errors (400):**

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "non_field_errors": ["Subject 'CS101' is already assigned to course 'BCA'."]
  }
}
```

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "course": ["Course 'BCA' is not active."]
  }
}
```

**Audit Event Created:**

```
Action: course_subject.assigned
Details: {"course_subject_id": 10, "course_code": "BCA", "subject_code": "CS101", "sequence_order": 1}
```

---

### **6. Get Subjects for a Course**

**Endpoint:** `GET /api/academics/courses/{course_id}/subjects/`

**Required Permission:** `academics.view`

**Query Parameters:**

- `is_active` (optional): Filter by active status (`true`/`false`)

**Success Response (200):**

```json
{
  "status": "success",
  "course": {
    "id": 1,
    "code": "BCA",
    "name": "Bachelor of Computer Applications"
  },
  "count": 3,
  "subjects": [
    {
      "id": 10,
      "course": 1,
      "course_code": "BCA",
      "course_name": "Bachelor of Computer Applications",
      "subject": 5,
      "subject_code": "CS101",
      "subject_name": "Introduction to Programming",
      "subject_description": "Basic programming concepts",
      "sequence_order": 1,
      "is_active": true
    },
    {
      "id": 11,
      "course": 1,
      "course_code": "BCA",
      "course_name": "Bachelor of Computer Applications",
      "subject": 6,
      "subject_code": "CS102",
      "subject_name": "Data Structures",
      "subject_description": "Arrays, trees, graphs",
      "sequence_order": 2,
      "is_active": true
    }
  ]
}
```

**Course Not Found (404):**

```json
{
  "status": "error",
  "message": "Course with ID 999 not found"
}
```

---

## **Files Modified/Created**

### **Created Files**

1. **`apps/academics/serializers.py`**

   - CourseCreateSerializer
   - CourseListSerializer
   - SubjectCreateSerializer
   - SubjectListSerializer
   - CourseSubjectCreateSerializer
   - CourseSubjectListSerializer

2. **`apps/academics/views.py`**

   - CourseListCreateAPIView
   - SubjectListCreateAPIView
   - CourseSubjectCreateAPIView
   - CourseSubjectsAPIView

3. **`apps/academics/urls.py`**

   - URL patterns for all endpoints

4. **`apps/academics/migrations/0003_remove_course_duration_months_and_more.py`**
   - Removed `duration_months` from Course
   - Added `is_active` to CourseSubject
   - Renamed tables to `academics_` prefix

### **Modified Files**

1. **`apps/academics/models.py`**

   - Updated Course model (removed duration_months)
   - Updated Subject model (table name)
   - Updated CourseSubject model (added is_active, table name)

2. **`apps/academics/apps.py`**

   - Changed `name = 'academics'` to `name = 'apps.academics'`

3. **`apps/academics/admin.py`**

   - Updated admin configurations to match new model schema

4. **`config/urls.py`**

   - Added `path('api/academics/', include('apps.academics.urls'))`

5. **`config/settings/base.py`**

   - Changed `'academics'` to `'apps.academics'` in INSTALLED_APPS

6. **Import Path Fixes**
   - `apps/faculty/serializers.py` - Fixed import from `academics.models` to `apps.academics.models`
   - `apps/batch_management/serializers.py` - Fixed import
   - `apps/batch_management/views.py` - Fixed import

---

## **Authorization & Security**

### **Permissions Required**

| Action                   | Permission Code    |
| ------------------------ | ------------------ |
| Create Course            | `academics.create` |
| List Courses             | `academics.view`   |
| Create Subject           | `academics.create` |
| List Subjects            | `academics.view`   |
| Assign Subject to Course | `academics.create` |
| View Course Subjects     | `academics.view`   |

### **Permission Checks**

All views manually check permissions using:

```python
if not request.user.has_permission("academics.create"):
    return Response(
        {'status': 'error', 'message': 'You do not have permission...'},
        status=status.HTTP_403_FORBIDDEN
    )
```

This ensures:

- Only authenticated users can access endpoints
- Only users with correct permissions can perform actions
- Clear error messages for authorization failures

---

## **Audit Logging**

All write operations are logged using `AuditService.log()`:

### **Audit Events**

1. **course.created**

   ```python
   AuditService.log(
       action='course.created',
       user=request.user,
       details={
           'course_id': course.id,
           'course_code': course.code,
           'course_name': course.name,
       }
   )
   ```

2. **subject.created**

   ```python
   AuditService.log(
       action='subject.created',
       user=request.user,
       details={
           'subject_id': subject.id,
           'subject_code': subject.code,
           'subject_name': subject.name,
       }
   )
   ```

3. **course_subject.assigned**
   ```python
   AuditService.log(
       action='course_subject.assigned',
       user=request.user,
       details={
           'course_subject_id': course_subject.id,
           'course_code': course_subject.course.code,
           'subject_code': course_subject.subject.code,
           'sequence_order': course_subject.sequence_order,
       }
   )
   ```

---

## **Testing Guide**

### **1. Authentication Setup**

First, obtain a JWT token:

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@issd.edu",
    "password": "admin123"
  }'
```

Response:

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJh..."
}
```

Use the `access` token in all subsequent requests:

```bash
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

### **2. Create Test Course**

```bash
curl -X POST http://localhost:8000/api/academics/courses/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "code": "BCA",
    "name": "Bachelor of Computer Applications",
    "description": "3-year undergraduate program",
    "is_active": true
  }'
```

### **3. Create Test Subjects**

```bash
# Subject 1
curl -X POST http://localhost:8000/api/academics/subjects/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "code": "CS101",
    "name": "Introduction to Programming",
    "description": "Python basics",
    "is_active": true
  }'

# Subject 2
curl -X POST http://localhost:8000/api/academics/subjects/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "code": "CS102",
    "name": "Data Structures",
    "description": "Arrays, lists, trees",
    "is_active": true
  }'
```

### **4. Assign Subjects to Course**

```bash
# Assign CS101 as first subject
curl -X POST http://localhost:8000/api/academics/course-subjects/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "course": 1,
    "subject": 1,
    "sequence_order": 1,
    "is_active": true
  }'

# Assign CS102 as second subject
curl -X POST http://localhost:8000/api/academics/course-subjects/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "course": 1,
    "subject": 2,
    "sequence_order": 2,
    "is_active": true
  }'
```

### **5. Retrieve Course Subjects**

```bash
curl -X GET "http://localhost:8000/api/academics/courses/1/subjects/" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### **6. List All Courses**

```bash
# All courses
curl -X GET "http://localhost:8000/api/academics/courses/" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Only active courses
curl -X GET "http://localhost:8000/api/academics/courses/?is_active=true" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Search courses
curl -X GET "http://localhost:8000/api/academics/courses/?search=computer" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## **Validation Rules**

### **Course Validation**

1. **Code:**

   - Must be unique
   - Automatically converted to uppercase
   - Cannot be empty

2. **Name:**
   - Cannot be empty after stripping whitespace

### **Subject Validation**

1. **Code:**

   - Must be unique
   - Automatically converted to uppercase
   - Cannot be empty

2. **Name:**
   - Cannot be empty after stripping whitespace

### **CourseSubject Validation**

1. **Course:**

   - Must exist
   - Must be active

2. **Subject:**

   - Must exist
   - Must be active

3. **Combination:**

   - Course-Subject pair must be unique
   - Prevents duplicate assignments

4. **Sequence Order:**
   - Must be >= 1

---

## **Error Handling**

All endpoints return consistent error formats:

### **400 Bad Request - Validation Error**

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "field_name": ["Error message"]
  }
}
```

### **403 Forbidden - Permission Denied**

```json
{
  "status": "error",
  "message": "You do not have permission to..."
}
```

### **404 Not Found - Resource Missing**

```json
{
  "status": "error",
  "message": "Course with ID 999 not found"
}
```

---

## **Implementation Notes**

### **Import Path Fix**

Due to a duplicate `academics/` folder at the project root, the app configuration was updated:

**Before:**

```python
# apps/academics/apps.py
name = 'academics'

# settings/base.py
INSTALLED_APPS = [..., 'academics', ...]
```

**After:**

```python
# apps/academics/apps.py
name = 'apps.academics'

# settings/base.py
INSTALLED_APPS = [..., 'apps.academics', ...]
```

All imports across the project were updated:

- `from academics.models import Course` → `from apps.academics.models import Course`

### **Permission Implementation**

Instead of using `@permission_required()` as a decorator (which doesn't work with methods), permissions are checked manually:

```python
def post(self, request):
    if not request.user.has_permission("academics.create"):
        return Response({'status': 'error', ...}, status=403)
    # ... rest of implementation
```

---

## **Database Migration Summary**

**Migration:** `0003_remove_course_duration_months_and_more.py`

**Operations:**

1. Removed `duration_months` field from Course model
2. Added `is_active` field to CourseSubject model (default=True)
3. Renamed table `courses` → `academics_courses`
4. Renamed table `subjects` → `academics_subjects`
5. Renamed table `course_subjects` → `academics_course_subjects`

**Applied Successfully:** ✅

---

## **Admin Interface**

All models are registered in Django Admin with enhanced features:

### **CourseAdmin**

- List Display: code, name, is_active, created_at
- Filters: is_active
- Search: code, name, description
- Ordering: code

### **SubjectAdmin**

- List Display: code, name, is_active, created_at
- Filters: is_active
- Search: code, name, description
- Ordering: name

### **CourseSubjectAdmin**

- List Display: course, subject, sequence_order, is_active
- Filters: course, is_active
- Search: course**code, course**name, subject**code, subject**name
- Ordering: course, sequence_order
- Raw ID Fields: course, subject (for better performance)

---

## **Next Steps (Future Phases)**

Phase 1A is **COMPLETE**. Future phases will build upon this foundation:

- **Phase 1B:** Batch management (using Course data)
- **Phase 1C:** Timetable creation (using CourseSubject data)
- **Phase 1D:** Session management
- **Phase 1E:** Workload calculations
- **Phase 2:** Attendance tracking
- **Phase 3:** Examinations and results
- **Phase 4:** Fee management

---

## **Summary**

✅ **Models:** Course, Subject, CourseSubject with proper constraints  
✅ **APIs:** 6 endpoints (2 for courses, 2 for subjects, 2 for course-subject mapping)  
✅ **Security:** JWT authentication + permission checks  
✅ **Audit:** Complete logging of all write operations  
✅ **Validation:** Comprehensive input validation with clear error messages  
✅ **Admin:** Enhanced Django admin interfaces  
✅ **Migrations:** Applied successfully  
✅ **Testing:** System check passes with no issues

**PHASE 1A is production-ready.** 🚀
