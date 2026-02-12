# Course Builder Implementation

## Overview

The Course Builder feature allows Super Admins to define which subjects belong to each course and set their teaching order (sequence). This establishes the curriculum structure for each academic course.

## Feature Location

**Frontend Route:** `/dashboards/super-admin/academics/course-builder`

---

## Backend Implementation

### Model: CourseSubject

**Location:** `apps/academics/models.py`

```python
class CourseSubject(models.Model):
    course = models.ForeignKey('Course', on_delete=models.PROTECT, related_name='course_subjects')
    subject = models.ForeignKey('Subject', on_delete=models.PROTECT, related_name='course_subjects')
    sequence_order = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'academics_course_subjects'
        unique_together = [['course', 'subject']]
        ordering = ['sequence_order']
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `course` | ForeignKey → Course | Course this subject belongs to (PROTECT on delete) |
| `subject` | ForeignKey → Subject | Subject included in the course (PROTECT on delete) |
| `sequence_order` | PositiveIntegerField | Order of subject in curriculum |
| `is_active` | BooleanField | Whether mapping is active (default: True) |

**Constraints:**

- `unique_together`: (course, subject) - prevents duplicate assignments
- `on_delete=PROTECT` - prevents deletion if relationships exist

---

### Serializers

**Location:** `apps/academics/serializers.py`

#### CourseSubjectCreateSerializer

```python
fields = ['course', 'subject', 'sequence_order', 'is_active']
```

- Validates course is active
- Validates subject is active
- Validates no duplicate assignment exists
- Validates sequence_order >= 1

#### CourseSubjectListSerializer

```python
fields = ['id', 'course', 'course_code', 'course_name', 'subject',
          'subject_code', 'subject_name', 'subject_description',
          'sequence_order', 'is_active']
```

- Includes nested course and subject details
- Used for list/detail responses

---

### API Endpoints

**Base URL:** `/api/academics/`

#### 1. Add Subject to Course

```
POST /api/academics/course-subjects/
```

**Permission:** `academics.create`

**Request Body:**

```json
{
  "course": 1,
  "subject": 5,
  "sequence_order": 1,
  "is_active": true
}
```

**Response (201):**

```json
{
  "status": "success",
  "message": "Subject assigned to course successfully",
  "data": { ... CourseSubject details ... }
}
```

**Audit Log:** `course_subject.assigned`

---

#### 2. List Subjects for a Course

```
GET /api/academics/courses/{course_id}/subjects/
```

**Permission:** `academics.view`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `is_active` | boolean | Filter by active status |

**Response (200):**

```json
{
  "status": "success",
  "course": {
    "id": 1,
    "code": "FSWD",
    "name": "Full Stack Web Development"
  },
  "count": 5,
  "subjects": [ ... CourseSubject list ... ]
}
```

---

#### 3. Update Course Subject

```
PATCH /api/academics/course-subjects/{id}/
```

**Permission:** `academics.course_builder.manage`

**Request Body (partial):**

```json
{
  "sequence_order": 2,
  "is_active": true
}
```

**Allowed Fields:** `sequence_order`, `is_active`

**Validation:**

- `sequence_order` must be >= 1

**Response (200):**

```json
{
  "status": "success",
  "message": "Course subject updated successfully",
  "data": { ... CourseSubject details ... }
}
```

**Audit Log:** `course.subject_updated`

---

#### 4. Toggle Course Subject Status

```
PATCH /api/academics/course-subjects/{id}/status/
```

**Permission:** `academics.course_builder.manage`

**Request Body:**

```json
{
  "is_active": false
}
```

**Response (200):**

```json
{
  "status": "success",
  "message": "Subject deactivated for course successfully",
  "data": { ... CourseSubject details ... }
}
```

**Audit Log:**

- Deactivate: `course.subject_removed`
- Reactivate: `course.subject_reactivated`

---

### URL Configuration

**Location:** `apps/academics/urls.py`

```python
urlpatterns = [
    # ... other routes ...
    path('courses/<int:course_id>/subjects/', views.CourseSubjectsAPIView.as_view(), name='course-subjects'),
    path('course-subjects/', views.CourseSubjectCreateAPIView.as_view(), name='course-subject-create'),
    path('course-subjects/<int:pk>/', views.CourseSubjectDetailAPIView.as_view(), name='course-subject-detail'),
    path('course-subjects/<int:pk>/status/', views.CourseSubjectStatusAPIView.as_view(), name='course-subject-status'),
]
```

---

### Django Admin

**Location:** `apps/academics/admin.py`

```python
@admin.register(CourseSubject)
class CourseSubjectAdmin(admin.ModelAdmin):
    list_display = ['course', 'subject', 'sequence_order', 'is_active']
    list_filter = ['course', 'is_active']
    search_fields = ['course__code', 'course__name', 'subject__code', 'subject__name']
    ordering = ['course', 'sequence_order']
```

---

## Frontend Implementation

### API Client Methods

**Location:** `lib/api.ts`

#### Types

```typescript
interface CourseSubject {
  id: number;
  course: number;
  course_code: string;
  course_name: string;
  subject: number;
  subject_code: string;
  subject_name: string;
  subject_description: string;
  sequence_order: number;
  is_active: boolean;
}

interface CourseSubjectsResponse {
  status: string;
  course: { id: number; code: string; name: string };
  count: number;
  subjects: CourseSubject[];
}

interface AddSubjectToCourseRequest {
  course_id: number;
  subject_id: number;
  sequence_order: number;
  is_active?: boolean;
}

interface UpdateCourseSubjectRequest {
  sequence_order?: number;
  is_active?: boolean;
}
```

#### Methods

```typescript
// Get subjects for a course
getCourseSubjects(courseId: number, params?: { is_active?: boolean }): Promise<CourseSubjectsResponse>

// Add subject to course
addSubjectToCourse(data: AddSubjectToCourseRequest): Promise<CourseSubject>

// Update course subject (sequence or status)
updateCourseSubject(id: number, data: UpdateCourseSubjectRequest): Promise<CourseSubject>

// Toggle course subject status
updateCourseSubjectStatus(id: number, is_active: boolean): Promise<CourseSubject>
```

---

### Page Component

**Location:** `app/dashboards/super-admin/academics/course-builder/page.tsx`

#### Features

1. **Course Selector**

   - Dropdown to select active courses
   - Shows selected course info (code, name, duration)

2. **Subject List Table**

   - Columns: Order, Subject Code, Subject Name, Status, Reorder, Actions
   - Sorted by sequence_order
   - Status badges (Active/Inactive)

3. **Reorder Controls**

   - Up/Down arrow buttons
   - Swaps sequence_order with adjacent items
   - Disabled at boundaries

4. **Add Subject Modal**

   - Subject dropdown (filters out already-assigned subjects)
   - Sequence order input (auto-calculated)
   - Duplicate prevention with error message

5. **Status Toggle**

   - Deactivate/Reactivate buttons
   - Confirmation dialog
   - Toast notifications

6. **Empty States**

   - No course selected
   - No subjects assigned

7. **Access Control**
   - SUPER_ADMIN only
   - Redirects unauthorized users

---

### Navigation

**Location:** `components/dashboard/hooks/useNavigation.ts`

Added to SUPER_ADMIN → Academics subsection:

```typescript
{
  name: "Course Builder",
  href: "/dashboards/super-admin/academics/course-builder",
  icon: "puzzle",
}
```

---

## Permissions

| Permission                        | Description               | Required For          |
| --------------------------------- | ------------------------- | --------------------- |
| `academics.view`                  | View courses and subjects | List course subjects  |
| `academics.create`                | Create new assignments    | Add subject to course |
| `academics.course_builder.manage` | Manage curriculum         | Update/toggle status  |

**Role Mapping:**

- SUPER_ADMIN: All permissions

---

## Audit Logs

| Action                       | Entity        | Description                |
| ---------------------------- | ------------- | -------------------------- |
| `course_subject.assigned`    | CourseSubject | Subject added to course    |
| `course.subject_updated`     | CourseSubject | Sequence or status changed |
| `course.subject_removed`     | CourseSubject | Subject deactivated        |
| `course.subject_reactivated` | CourseSubject | Subject reactivated        |

---

## Files Modified/Created

### Backend

| File                            | Action   | Description                                                  |
| ------------------------------- | -------- | ------------------------------------------------------------ |
| `apps/academics/models.py`      | Existing | CourseSubject model already present                          |
| `apps/academics/serializers.py` | Existing | Serializers already present                                  |
| `apps/academics/views.py`       | Modified | Added CourseSubjectDetailAPIView, CourseSubjectStatusAPIView |
| `apps/academics/urls.py`        | Modified | Added PATCH endpoints                                        |
| `apps/academics/admin.py`       | Existing | CourseSubjectAdmin already registered                        |

### Frontend

| File                                                           | Action   | Description                               |
| -------------------------------------------------------------- | -------- | ----------------------------------------- |
| `lib/api.ts`                                                   | Modified | Added CourseSubject types and API methods |
| `app/dashboards/super-admin/academics/course-builder/page.tsx` | Created  | Course Builder page                       |
| `components/dashboard/hooks/useNavigation.ts`                  | Modified | Added Course Builder navigation           |

---

## Manual Testing Checklist

### Prerequisites

- [ ] SUPER_ADMIN user logged in
- [ ] At least 2 active courses exist
- [ ] At least 5 active subjects exist

### Course Selection

- [ ] Course dropdown loads all active courses
- [ ] Selecting course shows course info panel
- [ ] Selecting course loads its subjects
- [ ] "-- Select Course --" clears subject list

### Adding Subjects

- [ ] "Add Subject" button appears when course selected
- [ ] Modal shows only unassigned subjects
- [ ] Sequence order auto-calculates
- [ ] Duplicate subject shows error message
- [ ] Successful add shows toast and refreshes list

### Reordering

- [ ] Up arrow moves subject up in sequence
- [ ] Down arrow moves subject down in sequence
- [ ] First item has disabled up arrow
- [ ] Last item has disabled down arrow
- [ ] Order numbers update correctly

### Status Toggle

- [ ] Active subjects show "Deactivate" button
- [ ] Inactive subjects show "Reactivate" button
- [ ] Confirm dialog shows subject name
- [ ] Successful toggle shows toast
- [ ] Status badge updates correctly

### Access Control

- [ ] SUPER_ADMIN can access page
- [ ] Other roles see "Access Denied"
- [ ] Unauthenticated redirects to login

### Error Handling

- [ ] Network errors show toast
- [ ] Invalid data shows form error
- [ ] Empty course shows placeholder

---

## Future Enhancements

1. **Drag-and-Drop Reordering** - Use react-beautiful-dnd for intuitive reordering
2. **Bulk Operations** - Add multiple subjects at once
3. **Subject Duration** - Track hours/weeks per subject
4. **Prerequisites** - Define subject dependencies
5. **Course Preview** - View complete curriculum in card format
6. **Export** - Export curriculum to PDF/Excel

---

_Last Updated: Course Builder feature implementation completed as part of ISSD Campus ERP development._
