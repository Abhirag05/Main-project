# Assignment Module - Integration Checklist

## Pre-Integration Verification

- [ ] Django REST Framework installed
- [ ] `apps.batch_management` exists with `Batch` model
- [ ] `apps.academics` exists with `Subject` model
- [ ] `apps.students` exists with `StudentProfile` model
- [ ] `apps.faculty` exists with `FacultySubjectAssignment` model
- [ ] User authentication configured (JWT/Token)
- [ ] Users have role information

---

## Installation Steps

### Step 1: App Registration
- [ ] Add `'apps.assignments'` to `INSTALLED_APPS` in `config/settings.py`
- [ ] Verify app appears in settings

### Step 2: URL Configuration
- [ ] Add `path('api/assignments/', include('apps.assignments.urls'))` to `config/urls.py`
- [ ] Add media URL configuration for development
- [ ] Verify no URL conflicts

### Step 3: Media Configuration
- [ ] Verify `MEDIA_URL` is set in settings
- [ ] Verify `MEDIA_ROOT` is set in settings
- [ ] (Optional) Set `FILE_UPLOAD_MAX_MEMORY_SIZE` limit
- [ ] (Optional) Set `DATA_UPLOAD_MAX_MEMORY_SIZE` limit

### Step 4: Database Migration
- [ ] Run `python manage.py makemigrations assignments`
- [ ] Review generated migration file
- [ ] Run `python manage.py migrate assignments`
- [ ] Verify migration applied: `python manage.py showmigrations assignments`

### Step 5: Create Media Directories
- [ ] Create `media/assignments/` directory
- [ ] Create `media/submissions/` directory
- [ ] Verify write permissions on media directories

---

## Testing Steps

### Admin Panel Testing
- [ ] Start server: `python manage.py runserver`
- [ ] Navigate to `/admin/assignments/`
- [ ] Verify Assignment model appears
- [ ] Verify AssignmentSubmission model appears
- [ ] Test creating an assignment via admin
- [ ] Test viewing submissions via admin

### Faculty API Testing
- [ ] Get faculty authentication token
- [ ] Test: Create assignment (POST)
  - [ ] With valid data
  - [ ] With invalid batch/subject
  - [ ] With past due date
  - [ ] With zero max_marks
- [ ] Test: List assignments (GET)
- [ ] Test: View assignment detail (GET)
- [ ] Test: Update assignment (PATCH)
- [ ] Test: Delete assignment (DELETE)
- [ ] Test: View submissions for assignment
- [ ] Test: View assignment statistics
- [ ] Test: Evaluate submission
  - [ ] With valid marks
  - [ ] With marks exceeding max_marks
  - [ ] With negative marks

### Student API Testing
- [ ] Get student authentication token
- [ ] Test: List assignments (GET)
  - [ ] Without filters
  - [ ] Filter by subject
  - [ ] Filter by status (pending/submitted/overdue)
- [ ] Test: Submit assignment (POST)
  - [ ] First submission
  - [ ] Re-upload before deadline
  - [ ] Attempt after deadline (should fail)
  - [ ] With wrong batch (should fail)
- [ ] Test: View my submissions (GET)
  - [ ] Without filters
  - [ ] Filter by evaluated status
  - [ ] Filter by subject
- [ ] Test: View submission detail (GET)

### Permission Testing
- [ ] Faculty cannot view other faculty's assignments
- [ ] Faculty cannot evaluate other faculty's submissions
- [ ] Student cannot view other batch's assignments
- [ ] Student cannot view other students' submissions
- [ ] Student cannot submit for wrong batch
- [ ] Student cannot modify marks

### File Upload Testing
- [ ] Test assignment attachment upload
- [ ] Test submission file upload
- [ ] Verify files stored in correct paths
- [ ] Test file download/access
- [ ] Test file overwrites on re-upload

---

## Optional Enhancements

### Test Data Generation
- [ ] Run `python manage.py create_test_assignments --assignments=3`
- [ ] Verify assignments created
- [ ] Verify submissions created
- [ ] Check evaluated vs pending submissions

### File Validation (Optional)
- [ ] Add allowed file extensions validation
- [ ] Add file size validation
- [ ] Add virus scanning (production)

### Notifications (Optional)
- [ ] Add email on assignment creation
- [ ] Add email on submission received
- [ ] Add email on evaluation completed

### Analytics (Optional)
- [ ] Create faculty dashboard endpoint
- [ ] Add submission trends
- [ ] Add performance metrics

---

## Production Checklist

### Security
- [ ] Enable HTTPS for file uploads
- [ ] Add rate limiting for submissions
- [ ] Implement virus scanning
- [ ] Add file type whitelist
- [ ] Validate file sizes
- [ ] Sanitize file names

### Storage
- [ ] Configure AWS S3 for media storage
- [ ] Set up CloudFront CDN
- [ ] Configure backup strategy
- [ ] Implement file retention policy

### Performance
- [ ] Add caching for assignment lists
- [ ] Optimize database queries
- [ ] Add database query monitoring
- [ ] Set up CDN for media delivery

### Monitoring
- [ ] Add logging for file uploads
- [ ] Track storage usage metrics
- [ ] Monitor API response times
- [ ] Set up error alerting
- [ ] Add submission analytics

### Documentation
- [ ] Document API endpoints for frontend team
- [ ] Create user guides
- [ ] Document error codes
- [ ] Create deployment guide

---

## Verification Checklist

### Models
- [ ] Assignment model has all required fields
- [ ] AssignmentSubmission model has all required fields
- [ ] unique_together constraint works
- [ ] File upload paths are correct
- [ ] Model properties work (is_overdue, is_evaluated, etc.)

### Serializers
- [ ] All serializers validate correctly
- [ ] Error messages are user-friendly
- [ ] Read-only fields are protected
- [ ] Faculty assignment validation works

### Views
- [ ] All endpoints respond correctly
- [ ] Filters work as expected
- [ ] Pagination works (if enabled)
- [ ] Error handling is comprehensive

### Permissions
- [ ] Faculty permissions enforced
- [ ] Student permissions enforced
- [ ] Object-level permissions work
- [ ] Unauthorized access blocked

### Business Rules
- [ ] Cannot submit after deadline
- [ ] Can re-upload before deadline
- [ ] One submission per student per assignment
- [ ] Marks cannot exceed max_marks
- [ ] Faculty must teach subject to batch

---

## Common Issues & Solutions

### Issue: ImportError for related models
**Solution:** Ensure all dependency apps exist and are in INSTALLED_APPS

### Issue: Permission denied errors
**Solution:** Verify user has correct role and batch/subject assignments

### Issue: File upload fails
**Solution:** Check media directory permissions and settings configuration

### Issue: Migrations conflict
**Solution:** Run `python manage.py makemigrations --merge`

### Issue: Student has no current_batch
**Solution:** Assign student to active batch in admin

---

## Sign-Off

- [ ] All installation steps completed
- [ ] All tests passed
- [ ] Documentation reviewed
- [ ] Ready for integration with frontend
- [ ] Production checklist reviewed (for deployment)

---

## Notes

Date Completed: _______________
Tested By: _______________
Issues Found: _______________
Resolution: _______________

---

## Support Resources

- Full API Documentation: `docs/ASSIGNMENT_MODULE_API.md`
- Setup Guide: `docs/ASSIGNMENT_SETUP_GUIDE.md`
- Implementation Summary: `docs/ASSIGNMENT_IMPLEMENTATION_SUMMARY.md`
- Module README: `apps/assignments/README.md`
