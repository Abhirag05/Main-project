# Finance Admin Batch Management - Quick API Reference

## Endpoints Available to Finance Admin

All endpoints require `Authorization: Bearer <token>` header.

---

## 1. List Batches
**Centre-scoped**: Finance Admin only sees their centre's batches.

```http
GET /api/batches/
```

**Optional Query Parameters:**
- `?course=1` - Filter by course ID
- `?status=ACTIVE` - Filter by status (ACTIVE, PENDING, COMPLETED, CANCELLED)
- `?month=1&year=2026` - Filter by month and year

**Response:**
```json
[
  {
    "id": 1,
    "code": "BATCH-2026-001",
    "template": {
      "id": 1,
      "name": "Python Bootcamp Jan 2026",
      "course": {
        "id": 1,
        "name": "Python Programming"
      }
    },
    "status": "ACTIVE",
    "start_date": "2026-01-20",
    "end_date": "2026-03-20"
  }
]
```

---

## 2. Create Batch
**Create a new batch from a template.**

```http
POST /api/batches/
Content-Type: application/json

{
  "template_id": 1,
  "start_date": "2026-02-01",
  "custom_schedule": "Mon/Wed/Fri 6-8 PM"
}
```

**Response:**
```json
{
  "id": 2,
  "code": "BATCH-2026-002",
  "template": {...},
  "status": "PENDING",
  "start_date": "2026-02-01",
  "message": "Batch created successfully"
}
```

---

## 3. Get Eligible Students (Role-Based Filtering)
**Finance Admin only sees fee-verified students.**

```http
GET /api/batches/1/eligible-students/
```

**Finance Admin sees students with:**
- `admission_status = FULL_PAYMENT_VERIFIED`
- `admission_status = INSTALLMENT_VERIFIED`

**Centre Admin sees students with:**
- `admission_status = APPROVED`
- `admission_status = FULL_PAYMENT_VERIFIED`
- `admission_status = INSTALLMENT_VERIFIED`

**Response:**
```json
[
  {
    "id": 10,
    "user_id": 100,
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "admission_status": "FULL_PAYMENT_VERIFIED",
    "payment_status": "FULL_PAYMENT",
    "created_at": "2026-01-15T10:30:00Z"
  },
  {
    "id": 11,
    "user_id": 101,
    "full_name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+0987654321",
    "admission_status": "INSTALLMENT_VERIFIED",
    "payment_status": "INSTALLMENT",
    "created_at": "2026-01-16T14:20:00Z"
  }
]
```

---

## 4. Assign Students to Batch
**Assign multiple students at once.**

```http
POST /api/batches/1/assign-students/
Content-Type: application/json

{
  "student_profile_ids": [10, 11, 12]
}
```

**Validations:**
- Batch must be ACTIVE
- Students must have approved/verified admission status
- Students must not have another active batch
- Batch capacity must not be exceeded

**Success Response:**
```json
{
  "message": "Successfully assigned 3 students to batch BATCH-2026-001.",
  "batch_id": 1,
  "batch_code": "BATCH-2026-001",
  "assigned_student_ids": [10, 11, 12],
  "current_student_count": 15,
  "max_students": 30
}
```

**Error Response (Capacity Exceeded):**
```json
{
  "error": "Batch capacity exceeded. Available slots: 2, Requested: 3"
}
```

**Error Response (Already Assigned):**
```json
{
  "error": "Some students are already assigned to an active batch.",
  "student_ids": [11]
}
```

---

## 5. Get Batch Details
**View batch info with enrolled students.**

```http
GET /api/batches/1/details/
```

**Response:**
```json
{
  "id": 1,
  "code": "BATCH-2026-001",
  "template": {
    "name": "Python Bootcamp Jan 2026",
    "course": {
      "name": "Python Programming",
      "code": "PY101"
    },
    "max_students": 30
  },
  "status": "ACTIVE",
  "start_date": "2026-01-20",
  "end_date": "2026-03-20",
  "enrolled_students": [
    {
      "id": 10,
      "full_name": "John Doe",
      "email": "john@example.com",
      "joined_at": "2026-01-18T09:00:00Z"
    },
    {
      "id": 11,
      "full_name": "Jane Smith",
      "email": "jane@example.com",
      "joined_at": "2026-01-18T09:05:00Z"
    }
  ],
  "current_student_count": 2
}
```

---

## 6. Update Batch Status
**Change batch status (e.g., activate, complete, cancel).**

```http
PATCH /api/batches/1/status/
Content-Type: application/json

{
  "status": "ACTIVE"
}
```

**Valid statuses:**
- `PENDING`
- `ACTIVE`
- `COMPLETED`
- `CANCELLED`

**Response:**
```json
{
  "id": 1,
  "code": "BATCH-2026-001",
  "status": "ACTIVE",
  "message": "Batch status updated successfully"
}
```

---

## Error Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | Success (GET) |
| 201 | Created (POST) |
| 400 | Bad Request (validation failed) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (wrong role or centre) |
| 404 | Not Found (batch/student doesn't exist) |
| 500 | Server Error |

---

## Common Error Responses

### Wrong Role
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### Wrong Centre
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### Batch Not Found
```json
{
  "detail": "Not found."
}
```

---

## Testing with cURL

### 1. Login to get token
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "finance1",
    "password": "password123"
  }'
```

**Save the `access` token from response.**

### 2. List batches
```bash
curl -X GET http://localhost:8000/api/batches/ \
  -H "Authorization: Bearer <your_token>"
```

### 3. Get eligible students
```bash
curl -X GET http://localhost:8000/api/batches/1/eligible-students/ \
  -H "Authorization: Bearer <your_token>"
```

### 4. Assign students
```bash
curl -X POST http://localhost:8000/api/batches/1/assign-students/ \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "student_profile_ids": [10, 11]
  }'
```

---

## Postman Collection Setup

### Environment Variables
```
base_url: http://localhost:8000/api
finance_token: <your_token_here>
batch_id: 1
```

### Collection Structure
```
Finance Admin Batch Management
├── Auth
│   └── Login as Finance Admin
├── Batches
│   ├── List Batches
│   ├── Create Batch
│   └── Get Batch Details
└── Student Assignment
    ├── Get Eligible Students
    ├── Assign Students
    └── View Batch with Students
```

---

## Key Differences: Finance vs Centre Admin

| Feature | Finance Admin | Centre Admin |
|---------|---------------|--------------|
| **Eligible Students** | Only FULL_PAYMENT_VERIFIED & INSTALLMENT_VERIFIED | APPROVED + FULL_PAYMENT_VERIFIED + INSTALLMENT_VERIFIED |
| **Student Assignment** | Same logic | Same logic |
| **Batch CRUD** | Full access (centre-scoped) | Full access (centre-scoped) |
| **Audit Logs** | `STUDENTS_ASSIGNED_TO_BATCH_BY_FINANCE` | `STUDENTS_ASSIGNED_TO_BATCH_BY_CENTRE_ADMIN` |

---

## Troubleshooting

### "Permission denied"
- Check your user has `role.code = 'FINANCE'`
- Verify user has a centre assigned
- Ensure token is valid and not expired

### "Eligible students list is empty"
- Check if students have `FULL_PAYMENT_VERIFIED` or `INSTALLMENT_VERIFIED` status
- Verify students don't already have an active batch
- Ensure students belong to your centre

### "Batch capacity exceeded"
- Check current student count: `GET /api/batches/{id}/details/`
- Max students is defined in the batch template

### "Student already has active batch"
- A student can only be in ONE active batch at a time
- Transfer or deactivate current batch first
