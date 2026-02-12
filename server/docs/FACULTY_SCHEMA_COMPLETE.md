# Faculty Management - Schema Implementation

## ✅ Implementation Complete

**Module:** Faculty Management (Schema Only)  
**Date:** December 17, 2025

## What Was Implemented

### 1. Faculty App Structure ✅

```
faculty/
  __init__.py
  apps.py
  models.py
  admin.py
  migrations/
    __init__.py
    0001_initial.py
```

### 2. FacultyProfile Model ✅

**Table:** `faculty_profiles`

| Field         | Type           | Constraints                          |
| ------------- | -------------- | ------------------------------------ |
| id            | BigAutoField   | PRIMARY KEY                          |
| user_id       | OneToOneField  | FOREIGN KEY → users, PROTECT, UNIQUE |
| employee_code | CharField(50)  | UNIQUE                               |
| designation   | CharField(100) |                                      |
| joining_date  | DateField      |                                      |
| is_active     | BooleanField   | DEFAULT=True                         |
| created_at    | DateTimeField  | AUTO                                 |
| updated_at    | DateTimeField  | AUTO                                 |

**Purpose:** Core faculty profile linked to User model

**Related Name:** `user.faculty_profile`

### 3. FacultyAvailability Model ✅

**Table:** `faculty_availabilities`

| Field       | Type         | Constraints                             |
| ----------- | ------------ | --------------------------------------- |
| id          | BigAutoField | PRIMARY KEY                             |
| faculty_id  | ForeignKey   | FOREIGN KEY → faculty_profiles, CASCADE |
| day_of_week | IntegerField | CHOICES (1-7)                           |
| start_time  | TimeField    |                                         |
| end_time    | TimeField    |                                         |
| is_active   | BooleanField | DEFAULT=True                            |

**Constraints:**

- `unique_together`: (faculty, day_of_week, start_time, end_time)

**Purpose:** Weekly recurring availability for timetable/batch assignment

**Related Name:** `faculty.availabilities`

### 4. Django Admin ✅

**FacultyProfile Admin:**

- List: employee_code, user, designation, is_active
- Search: employee_code, user.email
- Filter: is_active

**FacultyAvailability Admin:**

- List: faculty, day_of_week, start_time, end_time, is_active
- Filter: day_of_week, is_active

### 5. INSTALLED_APPS ✅

Added `'faculty'` to `config/settings/base.py`

## Database Schema Created

```sql
-- faculty_profiles table
CREATE TABLE faculty_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE PROTECT,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    designation VARCHAR(100) NOT NULL,
    joining_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- faculty_availabilities table
CREATE TABLE faculty_availabilities (
    id BIGSERIAL PRIMARY KEY,
    faculty_id BIGINT NOT NULL REFERENCES faculty_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE (faculty_id, day_of_week, start_time, end_time)
);
```

## How to Use These Models

### In Other Apps (e.g., Timetable, Batch)

```python
from faculty.models import FacultyProfile, FacultyAvailability

# Reference in ForeignKey
class Timetable(models.Model):
    faculty = models.ForeignKey(
        'faculty.FacultyProfile',
        on_delete=models.PROTECT
    )
```

### Create Faculty Profile

```python
from users.models import User
from faculty.models import FacultyProfile
from datetime import date

# Assuming user with FACULTY role exists
user = User.objects.get(email='faculty@example.com')

faculty = FacultyProfile.objects.create(
    user=user,
    employee_code='FAC001',
    designation='Assistant Professor',
    joining_date=date(2024, 1, 15),
    is_active=True
)
```

### Add Availability

```python
from faculty.models import FacultyAvailability
from datetime import time

# Monday 9 AM - 12 PM
FacultyAvailability.objects.create(
    faculty=faculty,
    day_of_week=1,  # Monday
    start_time=time(9, 0),
    end_time=time(12, 0),
    is_active=True
)
```

### Query Available Faculty

```python
# Get all active faculty
active_faculty = FacultyProfile.objects.filter(is_active=True)

# Get faculty available on Monday
monday_faculty = FacultyProfile.objects.filter(
    availabilities__day_of_week=1,
    availabilities__is_active=True
).distinct()

# Get specific faculty's Monday schedule
faculty = FacultyProfile.objects.get(employee_code='FAC001')
monday_slots = faculty.availabilities.filter(
    day_of_week=1,
    is_active=True
)
```

## What Was NOT Implemented

As per requirements, the following were **intentionally excluded**:

❌ API endpoints (views, serializers, URLs)  
❌ Timetable logic  
❌ Workload calculation  
❌ Batch assignment  
❌ Course assignment  
❌ Business logic

These will be implemented in separate modules/phases.

## Migrations Applied

```bash
python manage.py makemigrations faculty
# Migrations for 'faculty':
#   faculty\migrations\0001_initial.py
#     + Create model FacultyProfile
#     + Create model FacultyAvailability

python manage.py migrate faculty
# Operations to perform:
#   Apply all migrations: faculty
# Running migrations:
#   Applying faculty.0001_initial... OK
```

## Verification

```bash
python manage.py shell
```

```python
from faculty.models import FacultyProfile, FacultyAvailability
from django.contrib import admin

# Verify models exist
print(FacultyProfile._meta.db_table)  # faculty_profiles
print(FacultyAvailability._meta.db_table)  # faculty_availabilities

# Verify admin registration
print(FacultyProfile in admin.site._registry)  # True
print(FacultyAvailability in admin.site._registry)  # True
```

## Access in Admin Panel

1. Start server: `python manage.py runserver`
2. Navigate to: `http://127.0.0.1:8000/admin/`
3. Login with superuser
4. Go to **Faculty Management** section:
   - **Faculty Profiles** - Manage faculty members
   - **Faculty Availabilities** - Manage weekly schedules

## Next Steps

These models are now stable and ready for:

- ✅ Batch module to reference `FacultyProfile`
- ✅ Timetable module to use `FacultyAvailability`
- ✅ Course module to assign faculty
- ✅ Workload module to calculate teaching hours

## Future API Implementation

When ready to create APIs (future phase):

- Create `faculty/serializers.py`
- Create `faculty/views.py`
- Create `faculty/urls.py`
- Add to `config/urls.py`

## Schema Stability

✅ These models are production-ready and stable  
✅ Other modules can safely create ForeignKey references  
✅ No breaking changes expected in base schema  
✅ Extensions can be added without affecting core structure
