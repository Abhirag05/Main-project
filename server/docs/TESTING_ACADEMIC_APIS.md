# Testing Academic Master Data APIs in Postman

## Updated for Phase 1A with Course Duration

**Last Updated:** December 18, 2025  
**New Field:** `duration_months` now required for courses

---

## Prerequisites

✅ Virtual environment activated  
✅ Database migrated (migration 0004 applied)  
✅ Server running: `python manage.py runserver`  
✅ Admin user created with JWT token

---

## Step 1: Get JWT Token

### Login to Get Access Token

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/auth/login/`  
**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "email": "admin@issd.edu",
  "password": "your-password-here"
}
```

**Expected Response (200 OK):**

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "admin@issd.edu",
    "full_name": "Admin User"
  }
}
```

**⚠️ SAVE THE ACCESS TOKEN** - You'll need it for all subsequent requests!

---

## Step 2: Set Up Authorization in Postman

### Option A: Collection-level Authorization (Recommended)

1. Create a new Collection: "Academic Master Data APIs"
2. Click on the collection → **Authorization** tab
3. Type: **Bearer Token**
4. Token: Paste your access token
5. All requests in this collection will inherit this token

### Option B: Request-level Authorization

For each request:

1. Go to **Authorization** tab
2. Type: **Bearer Token**
3. Token: Paste your access token

---

## Step 3: Create Courses (WITH duration_months)

### Example 1: Create 3-Year Degree Course (Hospitality Management)

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/courses/`  
**Headers:**

```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Body (raw JSON):**

```json
{
  "code": "BHM",
  "name": "Bachelor of Hospitality Management",
  "description": "3-year undergraduate program in hospitality and hotel management",
  "duration_months": 36,
  "is_active": true
}
```

**Expected Response (201 Created):**

```json
{
  "status": "success",
  "message": "Course created successfully",
  "data": {
    "id": 1,
    "code": "BHM",
    "name": "Bachelor of Hospitality Management",
    "description": "3-year undergraduate program in hospitality and hotel management",
    "duration_months": 36,
    "is_active": true,
    "created_at": "2025-12-18T10:30:00Z",
    "updated_at": "2025-12-18T10:30:00Z"
  }
}
```

---

### Example 2: Create 6-Month Bootcamp Course

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/courses/`

**Body (raw JSON):**

```json
{
  "code": "FSWD",
  "name": "Full Stack Web Development",
  "description": "6-month intensive bootcamp covering frontend, backend, and deployment",
  "duration_months": 6,
  "is_active": true
}
```

**Expected Response (201 Created):**

```json
{
  "status": "success",
  "message": "Course created successfully",
  "data": {
    "id": 2,
    "code": "FSWD",
    "name": "Full Stack Web Development",
    "description": "6-month intensive bootcamp covering frontend, backend, and deployment",
    "duration_months": 6,
    "is_active": true,
    "created_at": "2025-12-18T10:35:00Z",
    "updated_at": "2025-12-18T10:35:00Z"
  }
}
```

---

### Example 3: Create 2-Year Diploma Course

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/courses/`

**Body (raw JSON):**

```json
{
  "code": "DHM",
  "name": "Diploma in Hotel Management",
  "description": "2-year diploma program in hotel management",
  "duration_months": 24,
  "is_active": true
}
```

---

### Example 4: Create 1-Year Certificate Course

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/courses/`

**Body (raw JSON):**

```json
{
  "code": "CCFB",
  "name": "Certificate in Food & Beverage Service",
  "description": "1-year certificate program in F&B operations",
  "duration_months": 12,
  "is_active": true
}
```

---

## Step 4: Test Validation Errors

### Test 1: Missing duration_months (Should Fail)

**Body (raw JSON):**

```json
{
  "code": "TEST",
  "name": "Test Course",
  "description": "This should fail",
  "is_active": true
}
```

**Expected Response (400 Bad Request):**

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "duration_months": ["This field is required."]
  }
}
```

---

### Test 2: Invalid duration_months = 0 (Should Fail)

**Body (raw JSON):**

```json
{
  "code": "TEST2",
  "name": "Test Course 2",
  "duration_months": 0,
  "is_active": true
}
```

**Expected Response (400 Bad Request):**

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "duration_months": ["Course duration must be at least 1 month."]
  }
}
```

---

### Test 3: Duplicate Course Code (Should Fail)

**Body (raw JSON):**

```json
{
  "code": "BHM",
  "name": "Another Hospitality Course",
  "duration_months": 24,
  "is_active": true
}
```

**Expected Response (400 Bad Request):**

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "code": ["Course with code 'BHM' already exists."]
  }
}
```

---

## Step 5: List All Courses

**Method:** `GET`  
**URL:** `http://127.0.0.1:8000/api/academics/courses/`  
**Headers:**

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Expected Response (200 OK):**

```json
{
  "status": "success",
  "count": 4,
  "data": [
    {
      "id": 1,
      "code": "BHM",
      "name": "Bachelor of Hospitality Management",
      "description": "3-year undergraduate program in hospitality and hotel management",
      "duration_months": 36,
      "is_active": true,
      "created_at": "2025-12-18T10:30:00Z",
      "updated_at": "2025-12-18T10:30:00Z"
    },
    {
      "id": 2,
      "code": "FSWD",
      "name": "Full Stack Web Development",
      "description": "6-month intensive bootcamp covering frontend, backend, and deployment",
      "duration_months": 6,
      "is_active": true,
      "created_at": "2025-12-18T10:35:00Z",
      "updated_at": "2025-12-18T10:35:00Z"
    },
    {
      "id": 3,
      "code": "DHM",
      "name": "Diploma in Hotel Management",
      "description": "2-year diploma program in hotel management",
      "duration_months": 24,
      "is_active": true,
      "created_at": "2025-12-18T10:40:00Z",
      "updated_at": "2025-12-18T10:40:00Z"
    },
    {
      "id": 4,
      "code": "CCFB",
      "name": "Certificate in Food & Beverage Service",
      "description": "1-year certificate program in F&B operations",
      "duration_months": 12,
      "is_active": true,
      "created_at": "2025-12-18T10:45:00Z",
      "updated_at": "2025-12-18T10:45:00Z"
    }
  ]
}
```

---

## Step 6: Create Subjects for BHM Course

Now let's create 10 subjects for the Bachelor of Hospitality Management course.

### Subject 1: Hotel Management Fundamentals

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/subjects/`

**Body (raw JSON):**

```json
{
  "code": "HM101",
  "name": "Hotel Management Fundamentals",
  "description": "Introduction to hotel operations and management principles",
  "is_active": true
}
```

---

### Subject 2: Front Office Operations

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/subjects/`

**Body (raw JSON):**

```json
{
  "code": "FO201",
  "name": "Front Office Operations",
  "description": "Front desk management, reservations, and guest services",
  "is_active": true
}
```

---

### Subject 3: Food & Beverage Service

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/subjects/`

**Body (raw JSON):**

```json
{
  "code": "FB202",
  "name": "Food & Beverage Service",
  "description": "Restaurant operations and beverage management",
  "is_active": true
}
```

---

### Subject 4: Housekeeping Management

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/subjects/`

**Body (raw JSON):**

```json
{
  "code": "HK203",
  "name": "Housekeeping Management",
  "description": "Housekeeping operations and room maintenance",
  "is_active": true
}
```

---

### Subject 5: Culinary Arts

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/subjects/`

**Body (raw JSON):**

```json
{
  "code": "CA301",
  "name": "Culinary Arts",
  "description": "Basic and advanced cooking techniques",
  "is_active": true
}
```

---

### Subject 6: Event Management

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/subjects/`

**Body (raw JSON):**

```json
{
  "code": "EM302",
  "name": "Event Management",
  "description": "Planning and executing hotel events and conferences",
  "is_active": true
}
```

---

### Subject 7: Tourism Management

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/subjects/`

**Body (raw JSON):**

```json
{
  "code": "TM303",
  "name": "Tourism Management",
  "description": "Tourism industry and destination management",
  "is_active": true
}
```

---

### Subject 8: Hospitality Marketing

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/subjects/`

**Body (raw JSON):**

```json
{
  "code": "HM401",
  "name": "Hospitality Marketing",
  "description": "Marketing strategies for hospitality industry",
  "is_active": true
}
```

---

### Subject 9: Hotel Accounting

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/subjects/`

**Body (raw JSON):**

```json
{
  "code": "HA402",
  "name": "Hotel Accounting",
  "description": "Financial management and accounting in hotels",
  "is_active": true
}
```

---

### Subject 10: Guest Relations

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/subjects/`

**Body (raw JSON):**

```json
{
  "code": "GR403",
  "name": "Guest Relations",
  "description": "Customer service and guest satisfaction management",
  "is_active": true
}
```

**Expected Response for Each Subject (201 Created):**

```json
{
  "status": "success",
  "message": "Subject created successfully",
  "data": {
    "id": 1,
    "code": "HM101",
    "name": "Hotel Management Fundamentals",
    "description": "Introduction to hotel operations and management principles",
    "is_active": true,
    "created_at": "2025-12-18T11:00:00Z",
    "updated_at": "2025-12-18T11:00:00Z"
  }
}
```

---

## Step 7: List All Subjects

**Method:** `GET`  
**URL:** `http://127.0.0.1:8000/api/academics/subjects/`

**Expected Response (200 OK):**

```json
{
  "status": "success",
  "count": 10,
  "data": [
    {
      "id": 1,
      "code": "HM101",
      "name": "Hotel Management Fundamentals",
      "description": "Introduction to hotel operations and management principles",
      "is_active": true,
      "created_at": "2025-12-18T11:00:00Z",
      "updated_at": "2025-12-18T11:00:00Z"
    }
    // ... 9 more subjects
  ]
}
```

---

## Step 8: Assign Subjects to BHM Course

Now assign all 10 subjects to the BHM course (ID: 2) in sequence.

### Assignment 1: HM101 (Sequence 1)

**Method:** `POST`  
**URL:** `http://127.0.0.1:8000/api/academics/course-subjects/`

**Body (raw JSON):**

```json
{
  "course": 1,
  "subject": 1,
  "sequence_order": 1,
  "is_active": true
}
```

**Expected Response (201 Created):**

```json
{
  "status": "success",
  "message": "Subject assigned to course successfully",
  "data": {
    "id": 1,
    "course": 1,
    "course_code": "BHM",
    "course_name": "Bachelor of Hospitality Management",
    "subject": 1,
    "subject_code": "HM101",
    "subject_name": "Hotel Management Fundamentals",
    "subject_description": "Introduction to hotel operations and management principles",
    "sequence_order": 1,
    "is_active": true
  }
}
```

---

### Assignment 2-10: Remaining Subjects

Repeat the same POST request with:

**FO201 (Sequence 2):**

```json
{ "course": 1, "subject": 2, "sequence_order": 2, "is_active": true }
```

**FB202 (Sequence 3):**

```json
{ "course": 1, "subject": 3, "sequence_order": 3, "is_active": true }
```

**HK203 (Sequence 4):**

```json
{ "course": 1, "subject": 4, "sequence_order": 4, "is_active": true }
```

**CA301 (Sequence 5):**

```json
{ "course": 1, "subject": 5, "sequence_order": 5, "is_active": true }
```

**EM302 (Sequence 6):**

```json
{ "course": 1, "subject": 6, "sequence_order": 6, "is_active": true }
```

**TM303 (Sequence 7):**

```json
{ "course": 1, "subject": 7, "sequence_order": 7, "is_active": true }
```

**HM401 (Sequence 8):**

```json
{ "course": 1, "subject": 8, "sequence_order": 8, "is_active": true }
```

**HA402 (Sequence 9):**

```json
{ "course": 1, "subject": 9, "sequence_order": 9, "is_active": true }
```

**GR403 (Sequence 10):**

```json
{ "course": 1, "subject": 10, "sequence_order": 10, "is_active": true }
```

---

## Step 9: Get All Subjects for BHM Course

**Method:** `GET`  
**URL:** `http://127.0.0.1:8000/api/academics/courses/1/subjects/`

**Expected Response (200 OK):**

```json
{
  "status": "success",
  "course": {
    "id": 1,
    "code": "BHM",
    "name": "Bachelor of Hospitality Management"
  },
  "count": 10,
  "subjects": [
    {
      "id": 1,
      "course": 1,
      "course_code": "BHM",
      "course_name": "Bachelor of Hospitality Management",
      "subject": 1,
      "subject_code": "HM101",
      "subject_name": "Hotel Management Fundamentals",
      "subject_description": "Introduction to hotel operations and management principles",
      "sequence_order": 1,
      "is_active": true
    },
    {
      "id": 2,
      "course": 1,
      "course_code": "BHM",
      "course_name": "Bachelor of Hospitality Management",
      "subject": 2,
      "subject_code": "FO201",
      "subject_name": "Front Office Operations",
      "subject_description": "Front desk management, reservations, and guest services",
      "sequence_order": 2,
      "is_active": true
    }
    // ... 8 more subjects in sequence
  ]
}
```

---

## Step 10: Filter Queries

### Filter Active Courses Only

**Method:** `GET`  
**URL:** `http://127.0.0.1:8000/api/academics/courses/?is_active=true`

---

### Search Courses by Name

**Method:** `GET`  
**URL:** `http://127.0.0.1:8000/api/academics/courses/?search=hospitality`

---

### Filter Active Subjects Only

**Method:** `GET`  
**URL:** `http://127.0.0.1:8000/api/academics/subjects/?is_active=true`

---

### Search Subjects by Code

**Method:** `GET`  
**URL:** `http://127.0.0.1:8000/api/academics/subjects/?search=HM`

---

## Step 11: Test Course-Subject Validation

### Test 1: Duplicate Assignment (Should Fail)

Try assigning HM101 to BHM again:

**Body:**

```json
{
  "course": 1,
  "subject": 1,
  "sequence_order": 11,
  "is_active": true
}
```

**Expected Response (400 Bad Request):**

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "non_field_errors": ["Subject 'HM101' is already assigned to course 'BHM'."]
  }
}
```

---

## Quick Reference: All Endpoints

| Method | Endpoint                                | Description                              |
| ------ | --------------------------------------- | ---------------------------------------- |
| POST   | `/api/academics/courses/`               | Create course (requires duration_months) |
| GET    | `/api/academics/courses/`               | List all courses                         |
| POST   | `/api/academics/subjects/`              | Create subject                           |
| GET    | `/api/academics/subjects/`              | List all subjects                        |
| POST   | `/api/academics/course-subjects/`       | Assign subject to course                 |
| GET    | `/api/academics/courses/{id}/subjects/` | Get subjects for specific course         |

---

## Important Notes

### ⚠️ Breaking Change Alert

**duration_months is now REQUIRED** when creating courses. Previous API calls without this field will fail with:

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "duration_months": ["This field is required."]
  }
}
```

### Common Duration Values

| Duration (months) | Typical Course Type            |
| ----------------- | ------------------------------ |
| 3-6               | Short courses, bootcamps       |
| 12                | Certificate programs, diplomas |
| 24                | Advanced diplomas              |
| 36                | Bachelor's degrees (3 years)   |
| 48                | Professional degrees (4 years) |

### Validation Rules

| Field           | Rule                             |
| --------------- | -------------------------------- |
| duration_months | Required, integer, minimum 1     |
| code            | Required, unique, auto-uppercase |
| name            | Required, not empty              |
| description     | Optional                         |
| is_active       | Optional (default: true)         |

---

## Troubleshooting

### 401 Unauthorized

**Problem:** Token expired or missing  
**Solution:** Get a new access token from `/api/auth/login/`

### 403 Forbidden

**Problem:** User doesn't have `academics.create` or `academics.view` permission  
**Solution:** Ensure your user has the correct role/permissions

### 400 Bad Request - duration_months

**Problem:** Missing or invalid duration_months  
**Solution:** Include `"duration_months": 6` (or appropriate value >= 1)

---

## Testing Checklist

- [ ] Login and get JWT token
- [ ] Create course with duration_months (BHM - 36-month degree)
- [ ] Create course with duration_months (FSWD - 6-month bootcamp)
- [ ] Test validation: missing duration_months (should fail)
- [ ] Test validation: duration_months = 0 (should fail)
- [ ] Test validation: duplicate course code (should fail)
- [ ] List all courses (verify duration_months in response)
- [ ] Create 10 subjects for hospitality course
- [ ] List all subjects
- [ ] Assign all subjects to BHM course (course ID 1) in sequence
- [ ] Get subjects for BHM course (ID 1)
- [ ] Test filters (is_active, search)
- [ ] Test duplicate subject assignment (should fail)

---

**All tests passing?** Your Academic Master Data APIs are fully functional! 🎉

For complete implementation details, see:

- [COURSE_DURATION_RE_ADDED_COMPLETE.md](COURSE_DURATION_RE_ADDED_COMPLETE.md)
- [PHASE_1A_UPDATE_DURATION.md](PHASE_1A_UPDATE_DURATION.md)
