"""
Custom permission classes for Attendance module.

Implements faculty-specific permission checks for attendance marking.
"""
from rest_framework.permissions import BasePermission
from apps.timetable.models import ClassSession


class IsFacultyForSession(BasePermission):
    """
    Permission class that allows access only to the faculty assigned to a session.
    
    Business Rules:
    - User must have role.code == "FACULTY"
    - Faculty must be assigned to the session's time slot
    
    This permission checks:
    1. User is authenticated and active
    2. User has FACULTY role
    3. User's faculty profile is assigned to the session
    """
    
    message = "Only the assigned faculty can access this session's attendance."

    def has_permission(self, request, view):
        """
        Check if the user is a faculty member.
        """
        # User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # User must be active
        if not request.user.is_active:
            return False
        
        # Superusers are NOT allowed for attendance (only assigned faculty)
        # This is a business rule - even admins can't mark attendance
        
        # Check if user has FACULTY role
        if not hasattr(request.user, 'role') or request.user.role.code != 'FACULTY':
            self.message = "Only users with FACULTY role can mark attendance."
            return False
        
        # Check if user has a faculty profile
        if not hasattr(request.user, 'faculty_profile'):
            self.message = "Faculty profile not found for this user."
            return False
        
        return True

    def has_object_permission(self, request, view, obj):
        """
        Check if the faculty is assigned to this specific session.
        
        Args:
            obj: ClassSession instance
        """
        if not isinstance(obj, ClassSession):
            return False
        
        faculty_profile = request.user.faculty_profile
        session_faculty = obj.time_slot.faculty
        
        if faculty_profile.id != session_faculty.id:
            self.message = f"You are not assigned to this session. This session is assigned to {session_faculty.user.full_name}."
            return False
        
        return True


class CanMarkAttendance(BasePermission):
    """
    Permission class that validates all conditions for marking attendance.
    
    Combines role check with session-specific validations:
    1. User is FACULTY
    2. Faculty is assigned to the session
    3. Session's batch is LIVE mode
    4. Current time is within the allowed marking window
    """
    
    message = "Attendance marking is not allowed."

    def has_permission(self, request, view):
        """
        Basic permission check - must be faculty.
        """
        if not request.user or not request.user.is_authenticated:
            return False
        
        if not request.user.is_active:
            return False
        
        if not hasattr(request.user, 'role') or request.user.role.code != 'FACULTY':
            self.message = "Only FACULTY can mark attendance."
            return False
        
        if not hasattr(request.user, 'faculty_profile'):
            self.message = "Faculty profile not found."
            return False
        
        return True

    def has_object_permission(self, request, view, obj):
        """
        Detailed permission check for a specific session.
        
        Args:
            obj: ClassSession instance
        """
        from .models import Attendance
        
        if not isinstance(obj, ClassSession):
            return False
        
        faculty_profile = request.user.faculty_profile
        session_faculty = obj.time_slot.faculty
        
        # Check faculty assignment
        if faculty_profile.id != session_faculty.id:
            self.message = f"You are not assigned to this session."
            return False
        
        # Check batch mode
        batch = obj.time_slot.batch
        if batch.template.mode != 'LIVE':
            self.message = f"Attendance can only be marked for LIVE batches. This batch is {batch.template.mode}."
            return False
        
        # Check time window
        is_allowed, reason = Attendance.is_marking_allowed(obj)
        if not is_allowed:
            self.message = reason
            return False
        
        return True
