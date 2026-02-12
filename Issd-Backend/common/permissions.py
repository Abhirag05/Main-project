"""
Custom DRF permission classes for business authorization.
Uses user.has_permission(code) for role-based access control.
"""
from rest_framework.permissions import BasePermission


def permission_required(permission_code):
    """
    Factory function to create permission classes.

    Usage:
        permission_classes = [IsAuthenticated, permission_required("user.create")]

    Args:
        permission_code (str): The permission code to check

    Returns:
        type: A permission class that can be instantiated by DRF
    """
    class PermissionCheck(BasePermission):
        """
        Custom permission class that checks if user has a specific permission code.

        Logic:
            - Superusers are always allowed
            - Inactive users are always denied
            - Delegates to user.has_permission(code) for business logic
        """

        def has_permission(self, request, view):
            """
            Check if the request user has the required permission.

            Args:
                request: The DRF request object
                view: The view being accessed

            Returns:
                bool: True if permission granted, False otherwise
            """
            # User must be authenticated
            if not request.user or not request.user.is_authenticated:
                return False

            # Inactive users are always denied
            if not request.user.is_active:
                return False

            # Superusers are always allowed
            if request.user.is_superuser:
                return True

            # Delegate to user's has_permission method
            return request.user.has_permission(permission_code)

    # Set a readable class name for debugging
    PermissionCheck.__name__ = f'HasPermission_{permission_code.replace(".", "_")}'
    PermissionCheck.__qualname__ = PermissionCheck.__name__

    return PermissionCheck


class IsFinanceUser(BasePermission):
    """
    Permission class that allows access only to users with FINANCE role.
    
    Used for finance-specific operations like admission approval/rejection.
    """
    
    def has_permission(self, request, view):
        """
        Check if the user has FINANCE role.
        
        Args:
            request: The DRF request object
            view: The view being accessed
            
        Returns:
            bool: True if user has FINANCE role, False otherwise
        """
        # User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # User must be active
        if not request.user.is_active:
            return False
        
        # Superusers are always allowed
        if request.user.is_superuser:
            return True
        
        # Check if user has FINANCE role
        return hasattr(request.user, 'role') and request.user.role.code == 'FINANCE'


class IsStudent(BasePermission):
    """
    Permission class that allows access only to users with STUDENT role.
    
    Used for student-specific read-only operations like viewing own batch.
    """
    
    def has_permission(self, request, view):
        """
        Check if the user has STUDENT role.
        
        Args:
            request: The DRF request object
            view: The view being accessed
            
        Returns:
            bool: True if user has STUDENT role, False otherwise
        """
        # User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # User must be active
        if not request.user.is_active:
            return False
        
        # Check if user has STUDENT role
        return hasattr(request.user, 'role') and request.user.role.code == 'STUDENT'


class IsPlacementUser(BasePermission):
    """
    Permission class that allows access only to users with PLACEMENT role.
    
    Used for placement-specific operations like viewing verified students.
    """
    
    def has_permission(self, request, view):
        """
        Check if the user has PLACEMENT role.
        
        Args:
            request: The DRF request object
            view: The view being accessed
            
        Returns:
            bool: True if user has PLACEMENT role, False otherwise
        """
        # User must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # User must be active
        if not request.user.is_active:
            return False
        
        # Superusers are always allowed
        if request.user.is_superuser:
            return True
        
        # Check if user has PLACEMENT role
        return hasattr(request.user, 'role') and request.user.role.code == 'PLACEMENT'
