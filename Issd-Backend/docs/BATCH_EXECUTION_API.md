# Batch Execution API Documentation

## Overview
Backend API implementation for Batch Management (execution layer) - FR-BAT-02 to FR-BAT-07.

Centre Admins can create and manage batches from templates for their centre.
Super Admins have read-only access to all batches.

---

## Authentication
All endpoints require JWT authentication via Bearer token in the Authorization header.

---

## Endpoints

### 1. List Active Batch Templates
**GET** `/api/batches/templates/active/`

Get all active batch templates available for creating batches.

**Access:** Centre Admin, Super Admin

**Frontend Usage:**
1. Call this endpoint to populate a dropdown/select menu
2. Display template name, course, and mode to the user
3. When user selects a template, capture the `id` field
4. Use that `id` as `template_id` when creating a batch

**Response:**
```json
[
  {
    "id": 1,
    "course": 1,
    "course_detail": {
      "id": 1,
      "name": "Full Stack Web Development",
      "code": "FSWD",
      "duration_months": 6
    },
    "name": "FSWD Live Template",
    "mode": "LIVE",
    "max_students": 30
  },
  {
    "id": 2,
    "course": 1,
    "course_detail": {
      "id": 1,
      "name": "Full Stack Web Development",
      "code": "FSWD",
      "duration_months": 6
    },
    "name": "FSWD Recorded Template",
    "mode": "RECORDED",
    "max_students": 50
  }
]
```

---

### 2. Create Batch from Template
**POST** `/api/batches/`

Create a new batch from an active template. Centre is automatically assigned from logged-in user.

**Access:** Centre Admin ONLY

**Frontend Workflow:**
1. User selects a template from the list (from endpoint #1)
2. Frontend captures the selected template's `id`
3. User enters `start_date` and `end_date`
4. Frontend sends all three fields to this endpoint
5. Backend auto-generates batch code and assigns centre

**Request Body:**
```json
{
  "template_id": 1,
  "start_date": "2025-02-01",
  "end_date": "2025-07-31"
}
```

**Field Details:**
- `template_id` (required): ID of the selected template from endpoint #1
- `start_date` (required): Batch start date (YYYY-MM-DD format)
- `end_date` (required): Batch end date (YYYY-MM-DD format)

**Validation:**
- Template must exist and be active
- `start_date` must be before `end_date`
- User must have a centre assigned

**Auto-generated:**
- `code`: Format `<COURSE_CODE>-<MODE>-<MMYYYY>-<CENTRE_CODE>`
  - Example: `FSWD-LIVE-022025-HYD`
  - Auto-increments if duplicate: `FSWD-LIVE-022025-HYD-1`
- `centre`: From `request.user.centre`
- `status`: `ACTIVE`
- `is_active`: `true`

**Response (201 Created):**
```json
{
  "id": 1,
  "template": 1,
  "template_detail": { ... },
  "centre": 1,
  "centre_name": "Hyderabad Centre",
  "centre_code": "HYD",
  "code": "FSWD-LIVE-022025-HYD",
  "start_date": "2025-02-01",
  "end_date": "2025-07-31",
  "status": "ACTIVE",
  "course_name": "Full Stack Web Development",
  "course_code": "FSWD",
  "mode": "LIVE",
  "max_students": 30,
  "current_student_count": 0,
  "is_active": true,
  "created_at": "2025-12-19T10:30:00Z",
  "updated_at": "2025-12-19T10:30:00Z"
}
```

---

### 3. List Batches (Centre-Scoped)
**GET** `/api/batches/`

List batches with automatic centre-scoping based on user role.

**Access:**
- Centre Admin → Only their centre's batches
- Super Admin → All batches (read-only)

**Query Parameters:**
- `course` (integer): Filter by course ID
- `status` (string): Filter by status (`ACTIVE`, `COMPLETED`, `CANCELLED`)
- `month` (integer 1-12): Filter by start month
- `year` (integer): Filter by start year

**Examples:**
- `/api/batches/` - All batches (centre-scoped)
- `/api/batches/?course=1` - Batches for course ID 1
- `/api/batches/?status=ACTIVE` - Only active batches
- `/api/batches/?month=2&year=2025` - Batches starting in Feb 2025

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "code": "FSWD-LIVE-022025-HYD",
    "centre_name": "Hyderabad Centre",
    "course_name": "Full Stack Web Development",
    "course_code": "FSWD",
    "mode": "LIVE",
    "start_date": "2025-02-01",
    "end_date": "2025-07-31",
    "status": "ACTIVE",
    "current_student_count": 0,
    "max_students": 30,
    "is_active": true
  }
]
```

---

### 4. Retrieve Batch Details
**GET** `/api/batches/{id}/`

Get detailed information about a specific batch.

**Access:** 
- Centre Admin → Only their centre's batches
- Super Admin → All batches

**Response (200 OK):**
```json
{
  "id": 1,
  "template": 1,
  "template_detail": {
    "id": 1,
    "course": 1,
    "course_detail": {
      "id": 1,
      "name": "Full Stack Web Development",
      "code": "FSWD",
      "duration_months": 6
    },
    "name": "FSWD Live Template",
    "mode": "LIVE",
    "max_students": 30,
    "is_active": true,
    "created_at": "2025-12-01T00:00:00Z",
    "updated_at": "2025-12-01T00:00:00Z"
  },
  "centre": 1,
  "centre_name": "Hyderabad Centre",
  "centre_code": "HYD",
  "code": "FSWD-LIVE-022025-HYD",
  "start_date": "2025-02-01",
  "end_date": "2025-07-31",
  "status": "ACTIVE",
  "course_name": "Full Stack Web Development",
  "course_code": "FSWD",
  "mode": "LIVE",
  "max_students": 30,
  "current_student_count": 0,
  "is_active": true,
  "created_at": "2025-12-19T10:30:00Z",
  "updated_at": "2025-12-19T10:30:00Z"
}
```

**Error Responses:**
- `404 Not Found` - Batch doesn't exist or doesn't belong to user's centre

---

### 5. Update Batch Status
**PATCH** `/api/batches/{id}/status/`

Update the status of a batch. Only specific transitions are allowed.

**Access:** Centre Admin ONLY (their centre's batches)

**Request Body:**
```json
{
  "status": "COMPLETED"
}
```

**Allowed Status Transitions:**
- `ACTIVE` → `COMPLETED`
- `ACTIVE` → `CANCELLED`

**Validation:**
- Batch must be in `ACTIVE` status
- Can only transition to `COMPLETED` or `CANCELLED`
- Once completed or cancelled, status cannot be changed

**Response (200 OK):**
```json
{
  "id": 1,
  "code": "FSWD-LIVE-022025-HYD",
  "status": "COMPLETED",
  ...
}
```

**Error Responses:**
- `400 Bad Request` - Invalid status transition
- `403 Forbidden` - Not authorized (wrong centre or Super Admin trying to modify)
- `404 Not Found` - Batch doesn't exist or doesn't belong to user's centre

---

## Frontend Integration Guide

### Creating a Batch - Step by Step

**Step 1: Fetch Active Templates**
```javascript
// GET /api/batches/templates/active/
const response = await fetch('/api/batches/templates/active/', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  }
});
const templates = await response.json();
```

**Step 2: Display Templates to User**
```jsx
// Example: Render in a dropdown
<select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}>
  <option value="">Select a template</option>
  {templates.map(template => (
    <option key={template.id} value={template.id}>
      {template.course_detail.name} - {template.mode} ({template.max_students} students)
    </option>
  ))}
</select>
```

**Step 3: User Enters Dates**
```jsx
<input 
  type="date" 
  value={startDate} 
  onChange={e => setStartDate(e.target.value)} 
/>
<input 
  type="date" 
  value={endDate} 
  onChange={e => setEndDate(e.target.value)} 
/>
```

**Step 4: Create Batch**
```javascript
// POST /api/batches/
const response = await fetch('/api/batches/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    template_id: selectedTemplateId,  // Auto-filled from Step 2
    start_date: startDate,            // From date picker
    end_date: endDate,                // From date picker
  })
});

if (response.ok) {
  const newBatch = await response.json();
  console.log('Batch created:', newBatch.code);
}
```

**Key Points:**
- ✅ `template_id` is automatically captured when user selects from dropdown
- ✅ No manual ID entry needed - it's handled by the selection UI
- ✅ Backend auto-generates batch code from the selected template
- ✅ Centre is auto-assigned from logged-in user

---

## Role-Based Access Control (RBAC)

### Centre Admin (`CENTRE_ADMIN`)
- ✅ List active batch templates
- ✅ Create batches from templates (for their centre only)
- ✅ List batches (their centre only)
- ✅ View batch details (their centre only)
- ✅ Update batch status (their centre only)

### Super Admin (`SUPER_ADMIN`)
- ✅ List active batch templates
- ✅ List all batches (all centres)
- ✅ View all batch details (all centres)
- ❌ Cannot create batches
- ❌ Cannot update batch status

---

## Business Rules

1. **Batch Code Generation:**
   - Format: `<COURSE_CODE>-<MODE>-<MMYYYY>-<CENTRE_CODE>`
   - Auto-increments with suffix `-1`, `-2`, etc. if duplicate exists
   - Example: `FSWD-LIVE-022025-HYD`, `FSWD-LIVE-022025-HYD-1`

2. **Centre Assignment:**
   - Automatically assigned from `request.user.centre`
   - Cannot be changed after creation

3. **Template Validation:**
   - Must be active (`is_active=True`)
   - Cannot be modified through batch endpoints

4. **Status Lifecycle:**
   - New batches start as `ACTIVE`
   - Can transition to `COMPLETED` or `CANCELLED`
   - Status changes are irreversible

5. **Soft Deletes:**
   - No hard deletes allowed
   - Use `is_active=False` for deactivation

6. **Date Validation:**
   - `end_date` must be after `start_date`
   - Dates cannot be changed after batch creation

---

## Technical Details

### Permissions
- `IsCentreAdminOrSuperAdminReadOnly`:
  - Centre Admin: Full CRUD on their centre's batches
  - Super Admin: Read-only on all batches

### Database
- Uses `select_related()` and `prefetch_related()` for optimized queries
- Transactions used for batch creation
- Foreign keys use `PROTECT` to prevent accidental deletions

### Student Count
- `current_student_count` is calculated dynamically
- Counts only active students (`is_active=True`)
- Not stored in database

---

## Error Codes

- `200 OK` - Successful GET/PATCH
- `201 Created` - Successful POST
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found or inaccessible

---

## Next Steps (Not Implemented)

The following features are intentionally excluded from this implementation:
- ❌ Student enrollment/assignment
- ❌ Faculty assignment
- ❌ Timetable management
- ❌ Batch capacity management
- ❌ Batch transfer logs
- ❌ Editing batch dates/template after creation
