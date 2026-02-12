from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """
    Audit log for tracking sensitive operations.
    """
    # What action was performed
    action = models.CharField(
        max_length=100,
        help_text="Action performed (e.g., 'user.created', 'user.status_changed')"
    )

    # What entity was affected
    entity = models.CharField(
        max_length=100,
        help_text="Type of entity affected (e.g., 'User', 'Role')"
    )

    entity_id = models.CharField(
        max_length=100,
        help_text="ID of the affected entity"
    )

    # Who performed the action
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )

    # Additional context (JSON)
    details = models.JSONField(
        null=True,
        blank=True,
        help_text="Additional details about the action"
    )

    # When it happened
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['entity', 'entity_id']),
            models.Index(fields=['performed_by']),
        ]

    def __str__(self):
        return f"{self.action} on {self.entity}:{self.entity_id} by {self.performed_by} at {self.timestamp}"
