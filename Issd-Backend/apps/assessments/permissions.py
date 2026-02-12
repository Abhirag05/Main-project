"""
Assessment permission classes.

Custom DRF permission classes for role-based access control
in the assessment module.
"""
from rest_framework.permissions import BasePermission


class IsFaculty(BasePermission):
    """
    Permission class that allows access only to users with FACULTY role.
    
    Used for faculty-specific operations like creating assessments,
    managing questions, and viewing results.
    """
    message = "Only faculty members can access this resource."

    def has_permission(self, request, view):
        """
        Check if the user has FACULTY role.
        """
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.is_active:
            return False

        if request.user.is_superuser:
            return True

        return (
            hasattr(request.user, 'role') and 
            request.user.role.code == 'FACULTY' and
            hasattr(request.user, 'faculty_profile')
        )


class IsStudent(BasePermission):
    """
    Permission class that allows access only to users with STUDENT role.
    
    Used for student-specific operations like attempting assessments
    and viewing own results.
    """
    message = "Only students can access this resource."

    def has_permission(self, request, view):
        """
        Check if the user has STUDENT role.
        """
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.is_active:
            return False

        return (
            hasattr(request.user, 'role') and 
            request.user.role.code == 'STUDENT' and
            hasattr(request.user, 'student_profile')
        )


class IsFacultyOrReadOnlyStudent(BasePermission):
    """
    Permission class that allows:
    - Faculty: Full access
    - Student: Read-only access
    """
    message = "Faculty have full access, students have read-only access."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not request.user.is_active:
            return False

        if request.user.is_superuser:
            return True

        user_role = getattr(request.user.role, 'code', None)

        # Faculty has full access
        if user_role == 'FACULTY':
            return True

        # Student has read-only access (GET, HEAD, OPTIONS)
        if user_role == 'STUDENT':
            return request.method in ['GET', 'HEAD', 'OPTIONS']

        return False


class IsAssessmentOwner(BasePermission):
    """
    Object-level permission to check if the user owns the assessment.
    
    Faculty can only modify assessments they created.
    """
    message = "You can only modify assessments you created."

    def has_object_permission(self, request, view, obj):
        """
        Check if the faculty owns the assessment.
        """
        if request.user.is_superuser:
            return True

        # Get the assessment object (might be the obj itself or related)
        assessment = getattr(obj, 'assessment', obj)
        
        if not hasattr(assessment, 'faculty'):
            return False

        faculty_profile = getattr(request.user, 'faculty_profile', None)
        if not faculty_profile:
            return False

        return assessment.faculty == faculty_profile


class CanAttemptAssessment(BasePermission):
    """
    Permission to check if a student can attempt an assessment.
    
    Validates:
    - Student is enrolled in the batch
    - Assessment is available (ACTIVE status, within time window)
    - Student hasn't already attempted
    """
    message = "You cannot attempt this assessment."

    def has_object_permission(self, request, view, obj):
        """
        Check if student can attempt the assessment.
        """
        from .models import StudentAssessmentAttempt
        from apps.batch_management.models import BatchStudent

        if not hasattr(request.user, 'student_profile'):
            return False

        student = request.user.student_profile
        assessment = obj

        # Check if student is enrolled in the batch
        is_enrolled = BatchStudent.objects.filter(
            student=student,
            batch=assessment.batch,
            is_active=True
        ).exists()

        if not is_enrolled:
            self.message = "You are not enrolled in this batch."
            return False

        # Check if assessment is available
        if not assessment.is_available:
            self.message = "This assessment is not currently available."
            return False

        # Check if student already attempted
        already_attempted = StudentAssessmentAttempt.objects.filter(
            student=student,
            assessment=assessment
        ).exists()

        if already_attempted:
            self.message = "You have already attempted this assessment."
            return False

        return True


class CanViewAssessmentResults(BasePermission):
    """
    Permission to check if user can view assessment results.
    
    - Faculty can view results for their own assessments
    - Students can view their own results
    """
    message = "You cannot view these results."

    def has_object_permission(self, request, view, obj):
        """
        Check if user can view the results.
        """
        if request.user.is_superuser:
            return True

        # Faculty viewing their assessment results
        if hasattr(request.user, 'faculty_profile'):
            assessment = getattr(obj, 'assessment', obj)
            return assessment.faculty == request.user.faculty_profile

        # Student viewing their own result
        if hasattr(request.user, 'student_profile'):
            if hasattr(obj, 'student'):
                return obj.student == request.user.student_profile

        return False


class IsAssessmentEditable(BasePermission):
    """
    Permission to check if an assessment can be edited.
    
    Only DRAFT and SCHEDULED assessments can be edited.
    """
    message = "Only draft and scheduled assessments can be edited."

    def has_object_permission(self, request, view, obj):
        """
        Check if the assessment is in DRAFT or SCHEDULED status.
        """
        from .models import Assessment

        # Allow read operations
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # For write operations, check status
        assessment = getattr(obj, 'assessment', obj)
        return assessment.status in [Assessment.Status.DRAFT, Assessment.Status.SCHEDULED]
