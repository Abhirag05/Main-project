# Faculty API Testing Guide - Postman

Complete step-by-step guide to test Faculty APIs using Postman.

---

## Prerequisites

1. **Postman installed** - Download from [postman.com](https://www.postman.com/downloads/)
2. **Django server running** - `python manage.py runserver`
3. **Database set up** - Migrations run and permissions seeded
4. **Admin user created** - To get authentication token

---

## Step 1: Start Your Django Server

Open terminal in your project directory:

```bash
python manage.py runserver
```

You should see:

```
Starting development server at http://127.0.0.1:8000/
```

**Keep this terminal running!**

---

## Step 2: Get Authentication Token

### Option A: Using Postman

**Create a new request:**

1. **Method:** `POST`
2. **URL:** `http://127.0.0.1:8000/api/auth/login/`
3. **Headers:**
   - `Content-Type`: `application/json`
4. **Body:** (Select `raw` and `JSON`)

```json
{
  "email": "admin@issd.edu",
  "password": "your_admin_password"
}
```

5. Click **Send**

**Response (200 OK):**

```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "admin@issd.edu",
    "full_name": "Administrator"
  }
}
```

**Copy the `access` token!** You'll need it for all requests.

---

### Option B: Using Django Shell (if no admin exists)

```python
python manage.py shell
```

```python
from users.models import User
from roles.models import Role
from centres.models import Centre

# Get or create admin role
admin_role = Role.objects.get(code='ADMIN')
centre = Centre.objects.first()

# Create admin user
admin = User.objects.create_superuser(
    email='admin@issd.edu',
    password='Admin@123',
    full_name='System Administrator',
    role=admin_role,
    centre=centre
)
print("Admin created! Email: admin@issd.edu, Password: Admin@123")
```

Then use Option A to get the token.

---

## Step 3: Set Up Postman Environment (Recommended)

This makes testing easier by storing the token once.

### Create Environment:

1. Click **Environments** (left sidebar)
2. Click **+** to create new environment
3. Name it: `ISSD Faculty API`
4. Add variables:

| Variable       | Initial Value           | Current Value           |
| -------------- | ----------------------- | ----------------------- |
| `base_url`     | `http://127.0.0.1:8000` | `http://127.0.0.1:8000` |
| `access_token` | (paste your token here) | (paste your token here) |

5. Click **Save**
6. Select this environment from dropdown (top-right)

Now you can use `{{base_url}}` and `{{access_token}}` in requests!

---

## Step 4: Test Faculty APIs

### Test 1: Create Faculty Profile

**Method:** `POST`  
**URL:** `{{base_url}}/api/faculty/`

**Headers:**

```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "email": "john.doe@issd.edu",
  "full_name": "Dr. John Doe",
  "phone": "9876543210",
  "employee_code": "FAC001",
  "designation": "Assistant Professor",
  "joining_date": "2025-01-15"
}
```

**Expected Response (201 Created):**

```json
{
  "id": 1,
  "employee_code": "FAC001",
  "designation": "Assistant Professor",
  "joining_date": "2025-01-15",
  "is_active": true,
  "created_at": "2025-12-17T14:30:00.123456Z",
  "updated_at": "2025-12-17T14:30:00.123456Z",
  "user": {
    "id": 2,
    "email": "john.doe@issd.edu",
    "full_name": "Dr. John Doe",
    "phone": "9876543210"
  }
}
```

**Save the `id` value (e.g., 1) - you'll need it for other tests!**

---

### Test 2: List All Faculty

**Method:** `GET`  
**URL:** `{{base_url}}/api/faculty/`

**Headers:**

```
Authorization: Bearer {{access_token}}
```

**No body needed**

**Expected Response (200 OK):**

```json
[
  {
    "id": 1,
    "employee_code": "FAC001",
    "designation": "Assistant Professor",
    "joining_date": "2025-01-15",
    "is_active": true,
    "user": {
      "id": 2,
      "email": "john.doe@issd.edu",
      "full_name": "Dr. John Doe",
      "phone": "9876543210"
    }
  }
]
```

---

### Test 3: Filter Active Faculty

**Method:** `GET`  
**URL:** `{{base_url}}/api/faculty/?is_active=true`

**Headers:**

```
Authorization: Bearer {{access_token}}
```

Returns only active faculty members.

---

### Test 4: Get Faculty Detail

**Method:** `GET`  
**URL:** `{{base_url}}/api/faculty/1/` _(replace 1 with actual faculty ID)_

**Headers:**

```
Authorization: Bearer {{access_token}}
```

**Expected Response (200 OK):**
Same structure as create response.

---

### Test 5: Update Faculty Profile

**Method:** `PATCH`  
**URL:** `{{base_url}}/api/faculty/1/` _(replace 1 with actual faculty ID)_

**Headers:**

```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "designation": "Associate Professor",
  "phone": "9876543299"
}
```

**Expected Response (200 OK):**
Updated faculty object with new values.

---

### Test 6: Deactivate Faculty

**Method:** `PATCH`  
**URL:** `{{base_url}}/api/faculty/1/status/` _(replace 1 with actual faculty ID)_

**Headers:**

```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "is_active": false
}
```

**Expected Response (200 OK):**
Faculty object with `is_active: false`

---

### Test 7: Reactivate Faculty

Same as Test 6, but use:

```json
{
  "is_active": true
}
```

---

### Test 8: Add Availability Slot

**Method:** `POST`  
**URL:** `{{base_url}}/api/faculty/1/availability/` _(replace 1 with actual faculty ID)_

**Headers:**

```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "day_of_week": 1,
  "start_time": "09:00",
  "end_time": "12:00"
}
```

**Day of Week Reference:**

- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday
- 7 = Sunday

**Expected Response (201 Created):**

```json
{
  "id": 1,
  "day_of_week": 1,
  "day_name": "Monday",
  "start_time": "09:00:00",
  "end_time": "12:00:00",
  "is_active": true
}
```

**Save the availability `id` for update/delete tests!**

---

### Test 9: Add Another Availability Slot

Same as Test 8, use different time or day:

```json
{
  "day_of_week": 1,
  "start_time": "14:00",
  "end_time": "17:00"
}
```

---

### Test 10: List Faculty Availability

**Method:** `GET`  
**URL:** `{{base_url}}/api/faculty/1/availability/` _(replace 1 with actual faculty ID)_

**Headers:**

```
Authorization: Bearer {{access_token}}
```

**Expected Response (200 OK):**

```json
[
  {
    "id": 1,
    "day_of_week": 1,
    "day_name": "Monday",
    "start_time": "09:00:00",
    "end_time": "12:00:00",
    "is_active": true
  },
  {
    "id": 2,
    "day_of_week": 1,
    "day_name": "Monday",
    "start_time": "14:00:00",
    "end_time": "17:00:00",
    "is_active": true
  }
]
```

---

### Test 11: Update Availability Slot

**Method:** `PATCH`  
**URL:** `{{base_url}}/api/availability/1/` _(replace 1 with actual availability ID)_

**Headers:**

```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "start_time": "10:00",
  "end_time": "13:00"
}
```

**Expected Response (200 OK):**
Updated availability object.

---

### Test 12: Delete (Soft) Availability Slot

**Method:** `DELETE`  
**URL:** `{{base_url}}/api/availability/1/` _(replace 1 with actual availability ID)_

**Headers:**

```
Authorization: Bearer {{access_token}}
```

**No body needed**

**Expected Response (200 OK):**

```json
{
  "message": "Availability slot removed successfully."
}
```

**Note:** This is a soft delete. The slot still exists in database but `is_active = false`.

---

## Common Error Testing

### Test 13: Duplicate Email

Try creating faculty with same email as Test 1:

**Expected Response (400 Bad Request):**

```json
{
  "email": ["A user with this email already exists."]
}
```

---

### Test 14: Duplicate Employee Code

Try creating faculty with same employee_code:

**Expected Response (400 Bad Request):**

```json
{
  "employee_code": ["A faculty with this employee code already exists."]
}
```

---

### Test 15: Invalid Time Range

Add availability with start_time >= end_time:

```json
{
  "day_of_week": 2,
  "start_time": "15:00",
  "end_time": "14:00"
}
```

**Expected Response (400 Bad Request):**

```json
{
  "end_time": ["End time must be after start time."]
}
```

---

### Test 16: Overlapping Availability

Try adding slot that overlaps with existing:

```json
{
  "day_of_week": 1,
  "start_time": "10:00",
  "end_time": "11:00"
}
```

_(if you already have 09:00-12:00 on Monday)_

**Expected Response (400 Bad Request):**

```json
{
  "error": "This availability slot overlaps with an existing slot."
}
```

---

### Test 17: Inactive Faculty Availability

1. First deactivate faculty (Test 6)
2. Then try to add availability

**Expected Response (400 Bad Request):**

```json
{
  "error": "Cannot add availability for inactive faculty."
}
```

---

### Test 18: No Authentication

Remove Authorization header and try any request.

**Expected Response (401 Unauthorized):**

```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

### Test 19: Invalid Token

Use wrong token in Authorization header:

```
Authorization: Bearer invalid_token_here
```

**Expected Response (401 Unauthorized):**

```json
{
  "detail": "Given token not valid for any token type",
  "code": "token_not_valid"
}
```

---

## Creating a Postman Collection

Save all tests in one collection for easy reuse:

### Step-by-Step:

1. **Create Collection:**

   - Click **Collections** (left sidebar)
   - Click **+** → New Collection
   - Name: `Faculty API Tests`

2. **Add Requests:**

   - For each test above, click **Save** after creating
   - Save to `Faculty API Tests` collection
   - Name them clearly (e.g., "1. Create Faculty", "2. List Faculty")

3. **Organize with Folders:**

   - Right-click collection → Add Folder
   - Create folders: "Faculty Profile", "Availability", "Error Tests"
   - Drag requests into appropriate folders

4. **Run All Tests:**
   - Click collection → **Run**
   - Run all requests in sequence
   - Review results

---

## Postman Tips & Tricks

### 1. Use Variables for IDs

After creating faculty, save the ID:

**In Tests tab of Create Faculty request:**

```javascript
// Parse response
let response = pm.response.json();

// Save faculty_id for future requests
pm.environment.set("faculty_id", response.id);
```

Now use `{{faculty_id}}` in other requests:

```
{{base_url}}/api/faculty/{{faculty_id}}/
```

---

### 2. Auto-Update Token

**In Tests tab of Login request:**

```javascript
let response = pm.response.json();
pm.environment.set("access_token", response.access);
```

Now you don't need to manually copy tokens!

---

### 3. Write Assertions

**In Tests tab:**

```javascript
// Check status code
pm.test("Status is 201", function () {
  pm.response.to.have.status(201);
});

// Check response structure
pm.test("Response has employee_code", function () {
  let response = pm.response.json();
  pm.expect(response).to.have.property("employee_code");
});

// Check specific value
pm.test("Faculty is active", function () {
  let response = pm.response.json();
  pm.expect(response.is_active).to.be.true;
});
```

---

### 4. Pre-request Scripts

Automatically refresh expired tokens:

**In Collection → Edit → Pre-request Scripts:**

```javascript
// Check if token is about to expire
// Add refresh logic here
```

---

### 5. Use Bulk Edit for Headers

1. Select all requests in collection
2. Right-click → Edit
3. Update headers in bulk
4. Useful for changing base URL or adding headers

---

## Testing Workflow (Recommended Order)

```
1. Login (get token)
2. Create Faculty #1
3. Create Faculty #2
4. List All Faculty
5. Get Faculty #1 Detail
6. Update Faculty #1
7. Add Availability to Faculty #1 (Monday 9-12)
8. Add Availability to Faculty #1 (Monday 14-17)
9. Add Availability to Faculty #1 (Tuesday 9-12)
10. List Faculty #1 Availability
11. Update an Availability Slot
12. Delete an Availability Slot
13. Deactivate Faculty #2
14. List Active Faculty Only (should show only #1)
15. Reactivate Faculty #2
16. Test Error Cases (duplicate email, invalid times, etc.)
```

---

## Checking Audit Logs

After testing, verify audit logs in Django admin or database:

### Using Django Shell:

```python
python manage.py shell
```

```python
from audit.models import AuditLog

# See recent faculty-related logs
logs = AuditLog.objects.filter(entity='Faculty').order_by('-created_at')[:10]

for log in logs:
    print(f"{log.action} | {log.details} | {log.performed_by}")
```

You should see:

- `faculty.created`
- `faculty.updated`
- `faculty.status_changed`
- `faculty.availability_added`
- `faculty.availability_updated`
- `faculty.availability_removed`

---

## Troubleshooting

### Problem: "Connection refused"

**Solution:** Make sure Django server is running (`python manage.py runserver`)

---

### Problem: "Token has expired"

**Solution:** Login again to get fresh token

---

### Problem: "Permission denied"

**Solution:** Make sure your user has required permissions. Check:

```python
python manage.py shell
```

```python
from users.models import User
user = User.objects.get(email='admin@issd.edu')
print(user.has_permission('faculty.create'))  # Should be True
```

If False, assign permissions:

```bash
python manage.py assign_default_permissions
```

---

### Problem: "FACULTY role does not exist"

**Solution:** Seed roles and permissions:

```bash
python manage.py seed_permissions
```

---

### Problem: "No active centre available"

**Solution:** Create a centre:

```python
python manage.py shell
```

```python
from centres.models import Centre
Centre.objects.create(name='Main Campus', code='MAIN', is_active=True)
```

---

## Sample Test Data

Use these for creating multiple faculty:

```json
{
  "email": "jane.smith@issd.edu",
  "full_name": "Dr. Jane Smith",
  "phone": "9876543211",
  "employee_code": "FAC002",
  "designation": "Professor",
  "joining_date": "2024-08-01"
}
```

```json
{
  "email": "robert.brown@issd.edu",
  "full_name": "Prof. Robert Brown",
  "phone": "9876543212",
  "employee_code": "FAC003",
  "designation": "Associate Professor",
  "joining_date": "2024-09-15"
}
```

---

## Next Steps

After successful testing:

1. ✅ Export Postman collection for team sharing
2. ✅ Document any custom business logic
3. ✅ Write automated tests (Django test cases)
4. ✅ Test with frontend integration
5. ✅ Deploy to staging environment
6. ✅ Perform load testing

---

## Export Collection for Team

1. Click collection → **⋮** (three dots) → Export
2. Choose Collection v2.1
3. Share JSON file with team
4. Team can import: Import → Choose file

---

**Happy Testing! 🚀**

For issues or questions, check:

- [FACULTY_API_DOCUMENTATION.md](FACULTY_API_DOCUMENTATION.md) - Full API documentation
- Django logs - Check terminal where server is running
- Audit logs - Verify operations are logged
