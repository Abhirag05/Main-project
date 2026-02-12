"""
Audit logging service for tracking sensitive operations.
"""
from django.utils import timezone
from .models import AuditLog


class AuditService:
    """
    Service for creating audit log entries.
    """

    @staticmethod
    def log(action, entity, entity_id, performed_by=None, details=None):
        """
        Create an audit log entry.

        Args:
            action (str): Action performed (e.g., 'user.created', 'user.status_changed')
            entity (str): Type of entity affected (e.g., 'User', 'Role')
            entity_id (str or int): ID of the affected entity
            performed_by (User, optional): User who performed the action
            details (dict, optional): Additional context as JSON

        Returns:
            AuditLog: The created audit log instance
        """
        return AuditLog.objects.create(
            action=action,
            entity=entity,
            entity_id=str(entity_id),
            performed_by=performed_by,
            details=details or {}
        )

    @staticmethod
    def log_user_created(user, created_by, details=None):
        """
        Log user creation.

        Args:
            user: The created user instance
            created_by: User who created this user
            details (dict, optional): Additional context
        """
        log_details = {
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role.code if user.role else None,
            'centre': user.centre.code if user.centre else None,
        }
        if details:
            log_details.update(details)

        return AuditService.log(
            action='user.created',
            entity='User',
            entity_id=user.id,
            performed_by=created_by,
            details=log_details
        )

    @staticmethod
    def log_user_status_changed(user, changed_by, old_status, new_status, details=None):
        """
        Log user status change (enable/disable).

        Args:
            user: The user whose status changed
            changed_by: User who made the change
            old_status (bool): Previous is_active value
            new_status (bool): New is_active value
            details (dict, optional): Additional context
        """
        log_details = {
            'email': user.email,
            'old_status': 'active' if old_status else 'inactive',
            'new_status': 'active' if new_status else 'inactive',
        }
        if details:
            log_details.update(details)

        return AuditService.log(
            action='user.status_changed',
            entity='User',
            entity_id=user.id,
            performed_by=changed_by,
            details=log_details
        )

    @staticmethod
    def log_role_assigned(user, assigned_by, old_role, new_role, details=None):
        """
        Log role assignment change.

        Args:
            user: The user whose role changed
            assigned_by: User who made the change
            old_role: Previous role instance
            new_role: New role instance
            details (dict, optional): Additional context
        """
        log_details = {
            'email': user.email,
            'old_role': old_role.code if old_role else None,
            'new_role': new_role.code if new_role else None,
        }
        if details:
            log_details.update(details)

        return AuditService.log(
            action='role.assigned',
            entity='User',
            entity_id=user.id,
            performed_by=assigned_by,
            details=log_details
        )
