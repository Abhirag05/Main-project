# Faculty Assignment API - Postman Testing Guide

## Prerequisites

### 1. Get Authentication Token

Before testing assignment endpoints, you need a valid JWT token.

**Endpoint:** `POST http://localhost:8000/api/auth/login/`

**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "email": "your-admin@example.com",
  "password": "your-password"
}
```

**Response:**

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**📝 Copy the `access` token** - you'll need it for all subsequent requests.

---

## Faculty Assignment API Endpoints

### Standard Headers for All Requests

```
Authorization: Bearer YOUR_ACCESS_TOKEN_HERE
Content-Type: application/json
```

---

## 1️⃣ Create Faculty Assignment

**Method:** `POST`  
**URL:** `http://localhost:8000/api/faculty/assignments/`  
**Permission Required:** `faculty.assign`

### Request Body

```json
{
  "faculty_id": 1,
  "batch_id": 1,
  "subject_id": 1
}
```

### Expected Success Response (201 Created)

```json
{
  "id": 1,
  "faculty": {
    "id": 1,
    "employee_code": "FAC001",
    "designation": "Senior Instructor",
    "user": {
      "id": 2,
      "email": "faculty@example.com",
      "full_name": "John Doe",
      "phone": "1234567890"
    }
  },
  "batch": {
    "id": 1,
    "code": "BATCH001",
    "start_date": "2024-01-15",
    "status": "ACTIVE"
  },
  "subject": {
    "id": 1,
    "code": "HTML-CSS",
    "name": "HTML & CSS Fundamentals"
  },
  "is_active": true,
  "assigned_at": "2025-12-18T10:30:00.123456Z"
}
```

### Expected Error Responses

**400 Bad Request - Faculty Not Active:**

```json
{
  "faculty_id": ["Faculty is not active."]
}
```

**400 Bad Request - Batch Not Active:**

```json
{
  "batch_id": ["Batch is not active."]
}
```

**400 Bad Request - Duplicate Assignment:**

```json
{
  "non_field_errors": [
    "This faculty is already assigned to this subject for this batch."
  ]
}
```

**400 Bad Request - Invalid IDs:**

```json
{
  "faculty_id": ["Faculty does not exist."]
}
```

### Test Scenarios

1. ✅ **Valid Assignment** - Use valid active faculty, batch, and subject IDs
2. ❌ **Inactive Faculty** - Try with inactive faculty
3. ❌ **Inactive Batch** - Try with inactive batch
4. ❌ **Duplicate** - Try creating the same assignment twice
5. ❌ **Non-existent IDs** - Use invalid faculty/batch/subject IDs

---

## 2️⃣ List All Assignments (with Filters)

**Method:** `GET`  
**URL:** `http://localhost:8000/api/faculty/assignments/list/`  
**Permission Required:** `faculty.view`

### Query Parameters (All Optional)

#### A. List All Assignments

```
http://localhost:8000/api/faculty/assignments/list/
```

#### B. Filter by Faculty

```
http://localhost:8000/api/faculty/assignments/list/?faculty_id=1
```

#### C. Filter by Batch

```
http://localhost:8000/api/faculty/assignments/list/?batch_id=1
```

#### D. Filter by Subject

```
http://localhost:8000/api/faculty/assignments/list/?subject_id=1
```

#### E. Filter by Active Status

```
http://localhost:8000/api/faculty/assignments/list/?is_active=true
http://localhost:8000/api/faculty/assignments/list/?is_active=false
```

#### F. Multiple Filters Combined

```
http://localhost:8000/api/faculty/assignments/list/?faculty_id=1&is_active=true
http://localhost:8000/api/faculty/assignments/list/?batch_id=1&subject_id=2
```

### Expected Success Response (200 OK)

```json
[
  {
    "id": 1,
    "faculty": {
      "id": 1,
      "employee_code": "FAC001",
      "designation": "Senior Instructor",
      "user": {
        "id": 2,
        "email": "faculty@example.com",
        "full_name": "John Doe",
        "phone": "1234567890"
      }
    },
    "batch": {
      "id": 1,
      "code": "BATCH001",
      "start_date": "2024-01-15",
      "status": "ACTIVE"
    },
    "subject": {
      "id": 1,
      "code": "HTML-CSS",
      "name": "HTML & CSS Fundamentals"
    },
    "is_active": true,
    "assigned_at": "2025-12-18T10:30:00.123456Z"
  },
  {
    "id": 2,
    "faculty": {
      "id": 1,
      "employee_code": "FAC001",
      "designation": "Senior Instructor",
      "user": {
        "id": 2,
        "email": "faculty@example.com",
        "full_name": "John Doe",
        "phone": "1234567890"
      }
    },
    "batch": {
      "id": 1,
      "code": "BATCH001",
      "start_date": "2024-01-15",
      "status": "ACTIVE"
    },
    "subject": {
      "id": 2,
      "code": "JS",
      "name": "JavaScript Essentials"
    },
    "is_active": true,
    "assigned_at": "2025-12-18T10:35:00.123456Z"
  }
]
```

### Test Scenarios

1. ✅ **List All** - Get all assignments without filters
2. ✅ **Filter by Faculty** - Get all subjects assigned to a specific faculty
3. ✅ **Filter by Batch** - Get all faculty assignments for a batch
4. ✅ **Filter by Subject** - Get all faculty teaching a specific subject
5. ✅ **Active Only** - Get only active assignments
6. ✅ **Inactive Only** - Get only inactive assignments
7. ✅ **Combined Filters** - Test multiple filters together

---

## 3️⃣ Get Assignments for Specific Faculty

**Method:** `GET`  
**URL:** `http://localhost:8000/api/faculty/{faculty_id}/assignments/`  
**Example:** `http://localhost:8000/api/faculty/1/assignments/`  
**Permission Required:** `faculty.view`

### Expected Success Response (200 OK)

```json
[
  {
    "id": 1,
    "faculty": {
      "id": 1,
      "employee_code": "FAC001",
      "designation": "Senior Instructor",
      "user": {
        "id": 2,
        "email": "faculty@example.com",
        "full_name": "John Doe",
        "phone": "1234567890"
      }
    },
    "batch": {
      "id": 1,
      "code": "BATCH001",
      "start_date": "2024-01-15",
      "status": "ACTIVE"
    },
    "subject": {
      "id": 1,
      "code": "HTML-CSS",
      "name": "HTML & CSS Fundamentals"
    },
    "is_active": true,
    "assigned_at": "2025-12-18T10:30:00.123456Z"
  }
]
```

### Expected Error Response

**404 Not Found - Faculty doesn't exist:**

```json
{
  "detail": "Not found."
}
```

### Test Scenarios

1. ✅ **Valid Faculty** - Get assignments for existing faculty
2. ❌ **Non-existent Faculty** - Try with invalid faculty_id
3. ✅ **Empty List** - Faculty with no assignments should return `[]`

---

## 4️⃣ Update Assignment Status (Activate/Deactivate)

**Method:** `PATCH`  
**URL:** `http://localhost:8000/api/faculty/assignments/{assignment_id}/status/`  
**Example:** `http://localhost:8000/api/faculty/assignments/1/status/`  
**Permission Required:** `faculty.assign`

### Request Body - Deactivate

```json
{
  "is_active": false
}
```

### Request Body - Activate

```json
{
  "is_active": true
}
```

### Expected Success Response (200 OK)

```json
{
  "id": 1,
  "faculty": {
    "id": 1,
    "employee_code": "FAC001",
    "designation": "Senior Instructor",
    "user": {
      "id": 2,
      "email": "faculty@example.com",
      "full_name": "John Doe",
      "phone": "1234567890"
    }
  },
  "batch": {
    "id": 1,
    "code": "BATCH001",
    "start_date": "2024-01-15",
    "status": "ACTIVE"
  },
  "subject": {
    "id": 1,
    "code": "HTML-CSS",
    "name": "HTML & CSS Fundamentals"
  },
  "is_active": false,
  "assigned_at": "2025-12-18T10:30:00.123456Z"
}
```

### Expected Error Response

**404 Not Found:**

```json
{
  "detail": "Not found."
}
```

**400 Bad Request - Invalid Data:**

```json
{
  "is_active": ["This field is required."]
}
```

### Test Scenarios

1. ✅ **Deactivate Assignment** - Set `is_active` to `false`
2. ✅ **Reactivate Assignment** - Set `is_active` back to `true`
3. ❌ **Invalid Assignment ID** - Try with non-existent assignment
4. ❌ **Missing Field** - Send empty body or wrong field name

---

## 🧪 Complete Testing Workflow

### Step 1: Setup Data

Before testing assignments, ensure you have:

- ✅ At least one active faculty profile
- ✅ At least one active batch
- ✅ At least one active subject (run `python create_course_data.py` if needed)

### Step 2: Create Test Assignments

```bash
# Assignment 1: Faculty 1 → Subject 1 (HTML-CSS) for Batch 1
POST /api/faculty/assignments/
{
  "faculty_id": 1,
  "batch_id": 1,
  "subject_id": 1
}

# Assignment 2: Faculty 1 → Subject 2 (JS) for Batch 1
POST /api/faculty/assignments/
{
  "faculty_id": 1,
  "batch_id": 1,
  "subject_id": 2
}

# Assignment 3: Faculty 1 → Subject 3 (REACT) for Batch 1
POST /api/faculty/assignments/
{
  "faculty_id": 1,
  "batch_id": 1,
  "subject_id": 3
}
```

### Step 3: Test Filters

```bash
# Get all assignments
GET /api/faculty/assignments/list/

# Get assignments for Faculty 1
GET /api/faculty/assignments/list/?faculty_id=1

# Get assignments for Batch 1
GET /api/faculty/assignments/list/?batch_id=1

# Get assignments for Subject 1
GET /api/faculty/assignments/list/?subject_id=1

# Get only active assignments
GET /api/faculty/assignments/list/?is_active=true
```

### Step 4: Test Status Changes

```bash
# Deactivate assignment 1
PATCH /api/faculty/assignments/1/status/
{
  "is_active": false
}

# Verify it's deactivated
GET /api/faculty/assignments/list/?is_active=false

# Reactivate it
PATCH /api/faculty/assignments/1/status/
{
  "is_active": true
}
```

### Step 5: Test Error Cases

```bash
# Duplicate assignment (should fail)
POST /api/faculty/assignments/
{
  "faculty_id": 1,
  "batch_id": 1,
  "subject_id": 1
}

# Non-existent faculty (should fail)
POST /api/faculty/assignments/
{
  "faculty_id": 9999,
  "batch_id": 1,
  "subject_id": 1
}

# Non-existent assignment status update (should fail)
PATCH /api/faculty/assignments/9999/status/
{
  "is_active": false
}
```

---

## 📋 Postman Collection Setup

### Quick Setup in Postman:

1. **Create a new Collection** called "Faculty Assignment APIs"

2. **Add Environment Variable** for the token:

   - Variable: `access_token`
   - Initial Value: (paste your token after login)
   - Current Value: (same as initial)

3. **Set Collection Authorization:**

   - Go to Collection Settings → Authorization
   - Type: Bearer Token
   - Token: `{{access_token}}`

4. **Create Folders:**

   - Authentication
   - Faculty Assignments

5. **Add Requests** as per the endpoints above

### Pro Tips:

- ✅ Use Postman variables: `{{base_url}}` = `http://localhost:8000`
- ✅ Save responses as examples for reference
- ✅ Use Tests tab to auto-verify response status codes
- ✅ Use Pre-request Scripts to refresh token if expired

---

## 🔍 Quick Reference Table

| Endpoint             | Method | URL                                     | Permission     | Body Required |
| -------------------- | ------ | --------------------------------------- | -------------- | ------------- |
| Create Assignment    | POST   | `/api/faculty/assignments/`             | faculty.assign | ✅ Yes        |
| List All Assignments | GET    | `/api/faculty/assignments/list/`        | faculty.view   | ❌ No         |
| Faculty Assignments  | GET    | `/api/faculty/{id}/assignments/`        | faculty.view   | ❌ No         |
| Update Status        | PATCH  | `/api/faculty/assignments/{id}/status/` | faculty.assign | ✅ Yes        |

---

## 🚨 Common Issues & Solutions

### Issue 1: 401 Unauthorized

**Solution:** Token expired or missing. Get a new token from login endpoint.

### Issue 2: 403 Forbidden

**Solution:** User doesn't have required permission. Check user roles and permissions.

### Issue 3: 400 Bad Request - "Batch is not active"

**Solution:** Batch status might not be 'ACTIVE'. Check batch status in database.

### Issue 4: Empty response `[]`

**Solution:** No data exists matching your filters. Create test data first.

---

## 📝 Sample Test Data

If you need to create test data, here are the subject IDs from the course data script:

**Subjects (from create_course_data.py):**

- 1: HTML-CSS
- 2: JS (JavaScript)
- 3: REACT
- 4: NODEJS
- 5: MONGODB
- 6: SQL
- 7: PYTHON
- ... (25 total subjects)

Use these IDs when creating faculty assignments!

---

**Happy Testing! 🚀**
