# ISSD Campus ERP - Complete Database Schema

**Last Updated:** December 17, 2025 (Updated with Academics & Batch Management)  
**Django Version:** 5.2.9  
**Database:** PostgreSQL (Neon)

---

## 📊 Complete Model Reference

This document lists all models, tables, and fields across the entire ISSD Campus ERP system.

---

## 1. Centres Module (`centres`)

### **Centre**

**Table:** `centres`  
**Purpose:** Campus/centre management

| Field        | Type           | Constraints      | Description           |
| ------------ | -------------- | ---------------- | --------------------- |
| `id`         | BigAutoField   | PRIMARY KEY      | Auto-incrementing ID  |
| `name`       | CharField(200) | UNIQUE, NOT NULL | Centre name           |
| `code`       | CharField(20)  | UNIQUE, NOT NULL | Unique centre code    |
| `is_active`  | BooleanField   | DEFAULT=True     | Active status         |
| `created_at` | DateTimeField  | AUTO             | Creation timestamp    |
| `updated_at` | DateTimeField  | AUTO             | Last update timestamp |

**Indexes:** name  
**Ordering:** name  
**Relations:** Referenced by User, Batch

---

## 2. Users Module (`users`)

### **User** (Custom User Model)

**Table:** `users`  
**Purpose:** Core user authentication and profile  
**Auth:** Uses email for login (AbstractBaseUser)

| Field          | Type            | Constraints               | Description                  |
| -------------- | --------------- | ------------------------- | ---------------------------- |
| `id`           | BigAutoField    | PRIMARY KEY               | Auto-incrementing ID         |
| `email`        | EmailField(255) | UNIQUE, NOT NULL          | Login email (USERNAME_FIELD) |
| `password`     | CharField       | HASHED                    | Hashed password              |
| `full_name`    | CharField(200)  | NOT NULL                  | User's full name             |
| `phone`        | CharField(15)   | BLANK                     | Contact phone number         |
| `role_id`      | ForeignKey      | → roles.Role, PROTECT     | User's role (required)       |
| `centre_id`    | ForeignKey      | → centres.Centre, PROTECT | User's centre (required)     |
| `is_active`    | BooleanField    | DEFAULT=True              | Account active status        |
| `is_staff`     | BooleanField    | DEFAULT=False             | Django admin access          |
| `is_superuser` | BooleanField    | DEFAULT=False             | Superuser privileges         |
| `last_login`   | DateTimeField   | NULL                      | Last login timestamp         |
| `created_at`   | DateTimeField   | AUTO                      | Registration timestamp       |
| `updated_at`   | DateTimeField   | AUTO                      | Last update timestamp        |

**Ordering:** -created_at  
**Relations:**

- Referenced by: StudentProfile, FacultyProfile, AuditLog, RolePermission, BatchTransferLog
- Related names: student_profile, faculty_profile, audit_logs, granted_permissions

---

## 3. Roles Module (`roles`)

### **Role**

**Table:** `roles`  
**Purpose:** User role definitions (RBAC)

| Field         | Type           | Constraints      | Description                 |
| ------------- | -------------- | ---------------- | --------------------------- |
| `id`          | BigAutoField   | PRIMARY KEY      | Auto-incrementing ID        |
| `name`        | CharField(100) | UNIQUE, NOT NULL | Role name (e.g., "Student") |
| `code`        | CharField(50)  | UNIQUE, NOT NULL | Role code (e.g., "STUDENT") |
| `description` | TextField      | BLANK            | Role description            |
| `is_active`   | BooleanField   | DEFAULT=True     | Active status               |
| `created_at`  | DateTimeField  | AUTO             | Creation timestamp          |
| `updated_at`  | DateTimeField  | AUTO             | Last update timestamp       |

**Ordering:** name  
**Default Roles:** SUPER_ADMIN, CENTRE_ADMIN, ACADEMIC_COORDINATOR, COURSE_COORDINATOR, BATCH_MENTOR, FACULTY, STUDENT, FINANCE, PLACEMENT, ALUMNI

---

### **Permission**

**Table:** `rbac_permissions`  
**Purpose:** Granular permission definitions

| Field         | Type           | Constraints      | Description                |
| ------------- | -------------- | ---------------- | -------------------------- |
| `id`          | BigAutoField   | PRIMARY KEY      | Auto-incrementing ID       |
| `code`        | CharField(100) | UNIQUE, NOT NULL | Permission code            |
| `description` | TextField      | NOT NULL         | Human-readable description |
| `module`      | CharField(50)  | BLANK            | Module/feature name        |
| `is_active`   | BooleanField   | DEFAULT=True     | Active status              |
| `created_at`  | DateTimeField  | AUTO             | Creation timestamp         |
| `updated_at`  | DateTimeField  | AUTO             | Last update timestamp      |

**Ordering:** module, code

---

### **RolePermission**

**Table:** `rbac_role_permissions`  
**Purpose:** Many-to-many mapping: Role ↔ Permission

| Field           | Type          | Constraints                            | Description                   |
| --------------- | ------------- | -------------------------------------- | ----------------------------- |
| `id`            | BigAutoField  | PRIMARY KEY                            | Auto-incrementing ID          |
| `role_id`       | ForeignKey    | → roles.Role, CASCADE                  | Role being granted permission |
| `permission_id` | ForeignKey    | → rbac_permissions.Permission, CASCADE | Permission being granted      |
| `granted_at`    | DateTimeField | AUTO                                   | When permission was granted   |
| `granted_by_id` | ForeignKey    | → users.User, SET_NULL, NULL           | Admin who granted permission  |

**Unique Together:** (role, permission)  
**Ordering:** role, permission

---

## 4. Audit Module (`audit`)

### **AuditLog**

**Table:** `audit_logs`  
**Purpose:** Track sensitive operations system-wide

| Field             | Type           | Constraints                  | Description                             |
| ----------------- | -------------- | ---------------------------- | --------------------------------------- |
| `id`              | BigAutoField   | PRIMARY KEY                  | Auto-incrementing ID                    |
| `action`          | CharField(100) | NOT NULL                     | Action performed (e.g., "user.created") |
| `entity`          | CharField(100) | NOT NULL                     | Entity type (e.g., "User")              |
| `entity_id`       | CharField(100) | NOT NULL                     | ID of affected entity                   |
| `performed_by_id` | ForeignKey     | → users.User, SET_NULL, NULL | User who performed action               |
| `details`         | JSONField      | NULL                         | Additional context (JSON)               |
| `timestamp`       | DateTimeField  | AUTO                         | When action occurred                    |

**Ordering:** -timestamp  
**Indexes:**

- timestamp (DESC)
- (entity, entity_id)
- performed_by

---

## 5. Students Module (`students`)

### **StudentProfile**

**Table:** `student_profiles`  
**Purpose:** Student admission tracking (pre-admission stage)

| Field              | Type          | Constraints                   | Description            |
| ------------------ | ------------- | ----------------------------- | ---------------------- |
| `id`               | BigAutoField  | PRIMARY KEY                   | Auto-incrementing ID   |
| `user_id`          | OneToOneField | → users.User, CASCADE, UNIQUE | User account link      |
| `admission_status` | CharField(20) | CHOICES, DEFAULT='PENDING'    | Admission status       |
| `created_at`       | DateTimeField | AUTO                          | Registration timestamp |
| `updated_at`       | DateTimeField | AUTO                          | Last update timestamp  |

**Choices for admission_status:**

- `PENDING` - Awaiting approval
- `APPROVED` - Admission approved
- `REJECTED` - Admission rejected

**Ordering:** -created_at  
**Related Name:** user.student_profile  
**Referenced By:** BatchStudent, BatchTransferLog

---

## 6. Faculty Module (`faculty`)

### **FacultyProfile**

**Table:** `faculty_profiles`  
**Purpose:** Faculty member profiles

| Field           | Type           | Constraints                   | Description                             |
| --------------- | -------------- | ----------------------------- | --------------------------------------- |
| `id`            | BigAutoField   | PRIMARY KEY                   | Auto-incrementing ID                    |
| `user_id`       | OneToOneField  | → users.User, PROTECT, UNIQUE | User account link                       |
| `employee_code` | CharField(50)  | UNIQUE, NOT NULL              | Employee ID                             |
| `designation`   | CharField(100) | NOT NULL                      | Job title (e.g., "Assistant Professor") |
| `joining_date`  | DateField      | NOT NULL                      | Date of joining                         |
| `is_active`     | BooleanField   | DEFAULT=True                  | Active employment status                |
| `created_at`    | DateTimeField  | AUTO                          | Creation timestamp                      |
| `updated_at`    | DateTimeField  | AUTO                          | Last update timestamp                   |

**Ordering:** employee_code  
**Related Name:** user.faculty_profile

---

### **FacultyAvailability**

**Table:** `faculty_availabilities`  
**Purpose:** Weekly recurring availability for faculty

| Field         | Type         | Constraints                                | Description              |
| ------------- | ------------ | ------------------------------------------ | ------------------------ |
| `id`          | BigAutoField | PRIMARY KEY                                | Auto-incrementing ID     |
| `faculty_id`  | ForeignKey   | → faculty_profiles.FacultyProfile, CASCADE | Faculty member           |
| `day_of_week` | IntegerField | CHOICES (1-7)                              | Day (1=Monday, 7=Sunday) |
| `start_time`  | TimeField    | NOT NULL                                   | Availability start time  |
| `end_time`    | TimeField    | NOT NULL                                   | Availability end time    |
| `is_active`   | BooleanField | DEFAULT=True                               | Active slot status       |

**Choices for day_of_week:**

- `1` - Monday
- `2` - Tuesday
- `3` - Wednesday
- `4` - Thursday
- `5` - Friday
- `6` - Saturday
- `7` - Sunday

**Unique Together:** (faculty, day_of_week, start_time, end_time)  
**Ordering:** faculty, day_of_week, start_time  
**Related Name:** faculty.availabilities

---

## 7. Academics Module (`academics`)

### **Course**

**Table:** `courses`  
**Purpose:** Academic courses/programs offered

| Field             | Type                 | Constraints      | Description               |
| ----------------- | -------------------- | ---------------- | ------------------------- |
| `id`              | BigAutoField         | PRIMARY KEY      | Auto-incrementing ID      |
| `name`            | CharField(200)       | UNIQUE, NOT NULL | Course name               |
| `code`            | CharField(50)        | UNIQUE, NOT NULL | Unique course code        |
| `description`     | TextField            | BLANK            | Course description        |
| `duration_months` | PositiveIntegerField | NOT NULL         | Course duration in months |
| `is_active`       | BooleanField         | DEFAULT=True     | Active offering status    |
| `created_at`      | DateTimeField        | AUTO             | Creation timestamp        |
| `updated_at`      | DateTimeField        | AUTO             | Last update timestamp     |

**Ordering:** name  
**Referenced By:** BatchTemplate

---

## 8. Batch Management Module (`batch_management`)

### **BatchTemplate**

**Table:** `batch_templates`  
**Purpose:** Batch templates created by superadmin

| Field          | Type                 | Constraints                 | Description              |
| -------------- | -------------------- | --------------------------- | ------------------------ |
| `id`           | BigAutoField         | PRIMARY KEY                 | Auto-incrementing ID     |
| `course_id`    | ForeignKey           | → academics.Course, PROTECT | Course reference         |
| `name`         | CharField(100)       | NOT NULL                    | Template name            |
| `mode`         | CharField(20)        | CHOICES                     | Delivery mode            |
| `max_students` | PositiveIntegerField | NOT NULL                    | Maximum student capacity |
| `is_active`    | BooleanField         | DEFAULT=True                | Active status            |
| `created_at`   | DateTimeField        | AUTO                        | Creation timestamp       |
| `updated_at`   | DateTimeField        | AUTO                        | Last update timestamp    |

**Choices for mode:**

- `LIVE` - Live classes
- `RECORDED` - Recorded sessions

**Unique Together:** (course, mode)

---

### **Batch**

**Table:** `batches`  
**Purpose:** Actual batches created from templates by centre admin

| Field         | Type          | Constraints                              | Description               |
| ------------- | ------------- | ---------------------------------------- | ------------------------- |
| `id`          | BigAutoField  | PRIMARY KEY                              | Auto-incrementing ID      |
| `template_id` | ForeignKey    | → batch_templates.BatchTemplate, PROTECT | Template reference        |
| `centre_id`   | ForeignKey    | → centres.Centre, PROTECT                | Centre reference          |
| `code`        | CharField(50) | UNIQUE, NOT NULL                         | Auto-generated batch code |
| `start_date`  | DateField     | NOT NULL                                 | Batch start date          |
| `end_date`    | DateField     | NOT NULL                                 | Batch end date            |
| `status`      | CharField(20) | CHOICES, DEFAULT='ACTIVE'                | Current batch status      |
| `is_active`   | BooleanField  | DEFAULT=True                             | Active status             |
| `created_at`  | DateTimeField | AUTO                                     | Creation timestamp        |
| `updated_at`  | DateTimeField | AUTO                                     | Last update timestamp     |

**Choices for status:**

- `ACTIVE` - Currently running
- `COMPLETED` - Finished
- `CANCELLED` - Cancelled

**Related Names:** template.batches, centre.batches

---

### **BatchStudent**

**Table:** `batch_students`  
**Purpose:** Student enrollment in batches

| Field        | Type          | Constraints                                | Description                       |
| ------------ | ------------- | ------------------------------------------ | --------------------------------- |
| `id`         | BigAutoField  | PRIMARY KEY                                | Auto-incrementing ID              |
| `batch_id`   | ForeignKey    | → batches.Batch, PROTECT                   | Batch reference                   |
| `student_id` | ForeignKey    | → student_profiles.StudentProfile, PROTECT | Student reference                 |
| `joined_at`  | DateTimeField | AUTO                                       | Enrollment timestamp              |
| `left_at`    | DateTimeField | NULL                                       | When student left (if applicable) |
| `is_active`  | BooleanField  | DEFAULT=True                               | Active enrollment status          |

**Unique Together:** (batch, student)  
**Related Names:** batch.students, student.batch_memberships

---

### **BatchTransferLog**

**Table:** `batch_transfer_logs`  
**Purpose:** Audit log for student batch transfers

| Field               | Type          | Constraints                                | Description                  |
| ------------------- | ------------- | ------------------------------------------ | ---------------------------- |
| `id`                | BigAutoField  | PRIMARY KEY                                | Auto-incrementing ID         |
| `student_id`        | ForeignKey    | → student_profiles.StudentProfile, PROTECT | Student being transferred    |
| `from_batch_id`     | ForeignKey    | → batches.Batch, PROTECT                   | Source batch                 |
| `to_batch_id`       | ForeignKey    | → batches.Batch, PROTECT                   | Destination batch            |
| `transferred_by_id` | ForeignKey    | → users.User, SET_NULL, NULL               | Admin who performed transfer |
| `reason`            | TextField     | BLANK                                      | Transfer reason              |
| `transferred_at`    | DateTimeField | AUTO                                       | Transfer timestamp           |
| `audit_log_id`      | ForeignKey    | → audit_logs.AuditLog, SET_NULL, NULL      | Linked audit log entry       |

**Related Names:** batch.transfers_out, batch.transfers_in

---

## 📈 Database Statistics

### Total Tables: 18

| Module           | Tables | Purpose             |
| ---------------- | ------ | ------------------- |
| centres          | 1      | Campus management   |
| users            | 1      | User authentication |
| roles            | 3      | RBAC system         |
| audit            | 1      | Activity logging    |
| students         | 1      | Student profiles    |
| faculty          | 2      | Faculty management  |
| academics        | 1      | Course catalog      |
| batch_management | 4      | Batch & enrollment  |
| **TOTAL**        | **18** |                     |

### Key Relationships

```
User (1) ←→ (1) StudentProfile
User (1) ←→ (1) FacultyProfile
User (N) → (1) Role
User (N) → (1) Centre
Role (N) ←→ (N) Permission (via RolePermission)
BatchTemplate (N) → (1) Course
Batch (N) → (1) BatchTemplate
Batch (N) → (1) Centre
Batch (N) ←→ (N) StudentProfile (via BatchStudent)
```

---

## 🔐 Authentication & Authorization

### Authentication

- **Model:** Custom User (users.User)
- **Login Field:** email
- **Password:** Hashed (PBKDF2)
- **JWT Tokens:** SimpleJWT

### Authorization (RBAC)

- **Roles:** 10 default roles (STUDENT, FACULTY, etc.)
- **Permissions:** Granular custom permissions
- **Mapping:** Role → RolePermission → Permission
- **Check:** `user.has_permission('code')`

---

## 📝 Model Constraints Summary

### Unique Constraints

- `centres.code` - Centre code must be unique
- `users.email` - Email must be unique (login)
- `roles.code` - Role code must be unique
- `rbac_permissions.code` - Permission code must be unique
- `faculty_profiles.employee_code` - Employee code unique
- `batches.code` - Batch code unique
- `(batch_templates.course, batch_templates.mode)` - Unique per course+mode
- `(batches.batch, batches.student)` - One student per batch enrollment
- `(rbac_role_permissions.role, rbac_role_permissions.permission)` - No duplicate permissions

### Foreign Key Cascades

**PROTECT (prevent deletion):**

- User → Role
- User → Centre
- FacultyProfile → User
- BatchTemplate → Course
- Batch → Template
- Batch → Centre
- BatchStudent → Batch
- BatchStudent → Student

**CASCADE (delete related):**

- RolePermission → Role
- RolePermission → Permission
- FacultyAvailability → Faculty
- StudentProfile → User

**SET_NULL (preserve history):**

- AuditLog → User
- RolePermission → User (granted_by)
- BatchTransferLog → User
- BatchTransferLog → AuditLog

---

## 🎯 Usage Patterns

### Creating a Student

```python
from users.models import User
from roles.models import Role
from centres.models import Centre
from students.models import StudentProfile

role = Role.objects.get(code='STUDENT')
centre = Centre.objects.get(code='ISSD-MAIN')

user = User.objects.create_user(
    email='student@example.com',
    password='password',
    full_name='John Doe',
    role=role,
    centre=centre
)

profile = StudentProfile.objects.create(
    user=user,
    admission_status='PENDING'
)
```

### Creating a Faculty

```python
from faculty.models import FacultyProfile
from datetime import date

role = Role.objects.get(code='FACULTY')
user = User.objects.create_user(
    email='faculty@example.com',
    password='password',
    full_name='Dr. Smith',
    role=role,
    centre=centre
)

faculty = FacultyProfile.objects.create(
    user=user,
    employee_code='FAC001',
    designation='Assistant Professor',
    joining_date=date.today()
)
```

### Checking Permissions

```python
user = User.objects.get(email='admin@example.com')
if user.has_permission('manage_batches'):
    # User can manage batches
    pass
```

---

## 🚀 Migrations Status

All models have been migrated successfully:

```bash
✅ centres.0001_initial
✅ centres.0002_create_default_centre
✅ users.0001_initial
✅ roles.0001_initial
✅ roles.0002_initial
✅ roles.0003_create_default_roles
✅ students.0001_initial
✅ faculty.0001_initial
✅ academics.0001_initial
✅ batch_management.0001_initial
✅ audit (no custom migrations)
```

---

## 📚 Additional Resources

- [PHASE_0A_COMPLETE.md](PHASE_0A_COMPLETE.md) - Centre, Role, User setup
- [PHASE_0B_COMPLETE.md](PHASE_0B_COMPLETE.md) - JWT Authentication
- [PHASE_0C_COMPLETE.md](PHASE_0C_COMPLETE.md) - Authorization & Audit
- [PHASE_0D_COMPLETE.md](PHASE_0D_COMPLETE.md) - Student Registration
- [FACULTY_SCHEMA_COMPLETE.md](FACULTY_SCHEMA_COMPLETE.md) - Faculty Management

---

**Generated:** December 17, 2025  
**Project:** ISSD Campus ERP & LMS  
**Framework:** Django 5.2.9 + Django REST Framework  
**Database:** PostgreSQL (Neon Cloud)
