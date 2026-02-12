# Database Population - Faculty & Batches

## ✅ Successfully Created

### Faculty Profiles (8 Members)

| Employee Code | Name           | Email                   | Designation                         | Joining Date |
| ------------- | -------------- | ----------------------- | ----------------------------------- | ------------ |
| FAC001        | John Smith     | john.smith@issd.edu     | Senior Instructor - Web Development | 2023-01-15   |
| FAC002        | Sarah Johnson  | sarah.johnson@issd.edu  | Data Science Instructor             | 2023-03-10   |
| FAC003        | Michael Chen   | michael.chen@issd.edu   | AI/ML Specialist                    | 2023-05-20   |
| FAC004        | Emily Davis    | emily.davis@issd.edu    | Mobile Development Lead             | 2023-07-01   |
| FAC005        | David Williams | david.williams@issd.edu | Cloud & DevOps Instructor           | 2023-09-15   |
| FAC006        | Lisa Anderson  | lisa.anderson@issd.edu  | Full Stack Developer                | 2024-01-10   |
| FAC007        | Robert Taylor  | robert.taylor@issd.edu  | Database Specialist                 | 2024-03-05   |
| FAC008        | Jennifer Moore | jennifer.moore@issd.edu | Python Programming Instructor       | 2024-05-20   |

**Login Credentials:**

- Email: Use any email from above
- Password: `password123`
- Role: Faculty

---

### Batch Templates (10 Templates)

Templates created for all courses:

- **AIML** (AI/ML): Live (max 30 students), Recorded (max 100 students)
- **CCD** (Cloud & DevOps): Live, Recorded
- **DSA** (Data Science): Live, Recorded
- **FSWD** (Full Stack Web Dev): Live, Recorded
- **MAD** (Mobile App Dev): Live, Recorded

---

### Batches (8 Active Batches)

| Batch Code | Course         | Mode     | Status    | Start Date        | End Date           |
| ---------- | -------------- | -------- | --------- | ----------------- | ------------------ |
| BATCH001   | AI/ML          | LIVE     | ACTIVE    | ~30 days ago      | ~150 days from now |
| BATCH002   | AI/ML          | RECORDED | ACTIVE    | ~60 days ago      | ~120 days from now |
| BATCH003   | Cloud & DevOps | LIVE     | ACTIVE    | ~15 days from now | ~195 days from now |
| BATCH004   | Cloud & DevOps | RECORDED | COMPLETED | ~200 days ago     | ~20 days ago       |
| BATCH005   | AI/ML          | LIVE     | ACTIVE    | Recent            | Future             |
| BATCH006   | AI/ML          | RECORDED | ACTIVE    | Recent            | Future             |
| BATCH007   | Cloud & DevOps | LIVE     | ACTIVE    | Recent            | Future             |
| BATCH008   | Cloud & DevOps | RECORDED | COMPLETED | Past              | Past               |

---

## 🔧 How to Use

### Re-run the Script

```bash
python create_faculty_batch_data.py
```

The script is **idempotent** - it will:

- ✅ Skip existing users and faculty profiles
- ✅ Skip existing batch templates
- ✅ Create new batches with incremented codes

---

## 📝 Testing Faculty Assignment APIs

Now you can use these dummy faculty and batches to test the Faculty Assignment APIs:

### Example: Assign Faculty to Batch

```bash
POST http://localhost:8000/api/faculty/assignments/

{
  "faculty_id": 1,     # FAC001 - John Smith
  "batch_id": 1,       # BATCH001 - AI/ML Live
  "subject_id": 1      # HTML-CSS (from course data)
}
```

### Get Faculty IDs

To get the actual faculty IDs, use:

```bash
GET http://localhost:8000/api/faculty/
```

### Get Batch IDs

To get the actual batch IDs, check the database or create an API to list batches.

---

## 🗄️ Database Queries

### Check Created Data

```sql
-- View all faculty
SELECT
    fp.employee_code,
    u.full_name,
    u.email,
    fp.designation,
    fp.is_active
FROM faculty_profiles fp
JOIN users u ON fp.user_id = u.id;

-- View all batches
SELECT
    b.code,
    c.name as course_name,
    bt.mode,
    b.status,
    b.start_date,
    b.end_date
FROM batches b
JOIN batch_templates bt ON b.template_id = bt.id
JOIN courses c ON bt.course_id = c.id;

-- View batch templates
SELECT
    bt.name,
    c.code as course_code,
    bt.mode,
    bt.max_students
FROM batch_templates bt
JOIN courses c ON bt.course_id = c.id;
```

---

## 📦 What Was Created

### Summary:

- ✅ **8 Faculty Users** with login credentials
- ✅ **8 Faculty Profiles** linked to users
- ✅ **10 Batch Templates** (2 per course - Live & Recorded)
- ✅ **8 Batches** (mix of active and completed)

### Next Steps:

1. Login with any faculty credentials
2. Use Postman to test Faculty Assignment APIs
3. Assign faculty to batches and subjects
4. Test filtering and status update endpoints

---

**Script Location:** `create_faculty_batch_data.py`
