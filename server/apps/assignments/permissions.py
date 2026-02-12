from rest_framework import permissions
from .models import Assignment, AssignmentSubmission
from apps.batch_management.models import BatchStudent


class IsFaculty(permissions.BasePermission):
    """
    Permission to check if user is a faculty member
    """
    message = "Only faculty members can access this resource"

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role.name == 'Faculty'
        )


class IsStudent(permissions.BasePermission):
    """
    Permission to check if user is a student
    """
    message = "Only students can access this resource"

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'student_profile')
        )


class IsAssignmentOwner(permissions.BasePermission):
    """
    Permission to check if faculty owns the assignment
    """
    message = "You do not have permission to modify this assignment"

    def has_object_permission(self, request, view, obj):
        # Allow safe methods (GET, HEAD, OPTIONS) for viewing
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For modifications, check if faculty created the assignment
        if isinstance(obj, Assignment):
            return obj.faculty == request.user
        
        return False


class CanManageAssignment(permissions.BasePermission):
    """
    Permission for faculty to manage assignments they created
    """
    message = "You can only manage assignments you created"

    def has_permission(self, request, view):
        # Check if user is faculty
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role.name == 'Faculty'
        )

    def has_object_permission(self, request, view, obj):
        # Check if the faculty created this assignment
        if isinstance(obj, Assignment):
            return obj.faculty == request.user
        elif isinstance(obj, AssignmentSubmission):
            return obj.assignment.faculty == request.user
        return False


class CanViewAssignmentSubmissions(permissions.BasePermission):
    """
    Permission for faculty to view submissions for their assignments
    """
    message = "You can only view submissions for assignments you created"

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role.name == 'Faculty'
        )

    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Assignment):
            return obj.faculty == request.user
        elif isinstance(obj, AssignmentSubmission):
            return obj.assignment.faculty == request.user
        return False


class CanEvaluateSubmission(permissions.BasePermission):
    """
    Permission for faculty to evaluate submissions for their assignments
    """
    message = "You can only evaluate submissions for your assignments"

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'role') and
            request.user.role.name == 'Faculty'
        )

    def has_object_permission(self, request, view, obj):
        if isinstance(obj, AssignmentSubmission):
            return obj.assignment.faculty == request.user
        return False


class IsSubmissionOwner(permissions.BasePermission):
    """
    Permission to check if student owns the submission
    """
    message = "You can only view your own submissions"

    def has_object_permission(self, request, view, obj):
        if isinstance(obj, AssignmentSubmission):
            return (
                hasattr(request.user, 'student_profile') and
                obj.student == request.user.student_profile
            )
        return False


class CanSubmitAssignment(permissions.BasePermission):
    """
    Permission for students to submit assignments for their batch
    """
    message = "You cannot submit this assignment"

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'student_profile')
        )

    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Assignment):
            # Check if student is actively enrolled in the assignment's batch
            student = request.user.student_profile
            batch_student = BatchStudent.objects.filter(
                student=student,
                batch=obj.batch,
                is_active=True
            ).first()
            return batch_student is not None
        return False


class CanViewBatchAssignments(permissions.BasePermission):
    """
    Permission for students to view assignments for their batch
    """
    message = "You must be enrolled in a batch to view assignments"

    def has_permission(self, request, view):
        # Check if user is authenticated student with an active batch membership
        if not (request.user and 
                request.user.is_authenticated and
                hasattr(request.user, 'student_profile')):
            return False
        
        # Check if student is actively enrolled in at least one batch
        student = request.user.student_profile
        return BatchStudent.objects.filter(
            student=student,
            is_active=True
        ).exists()
