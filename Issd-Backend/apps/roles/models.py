from django.db import models


class Role(models.Model):
    """
    Defines user roles in the system (e.g., Student, Faculty, Admin).
    This is NOT the same as Django's built-in Groups.
    Business authorization is role + permission based.
    """
    name = models.CharField(max_length=100, unique=True,
                            help_text="Role name (e.g., 'Student', 'Faculty')")
    code = models.CharField(max_length=50, unique=True,
                            help_text="Unique role code (e.g., 'STUDENT', 'FACULTY')")
    description = models.TextField(
        blank=True, help_text="Description of the role")
    is_active = models.BooleanField(
        default=True, help_text="Is this role active?")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "roles"
        verbose_name = "Role"
        verbose_name_plural = "Roles"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Permission(models.Model):
    """
    Defines granular permissions in the system.
    This is custom RBAC, NOT Django's built-in permissions.
    Examples: 'view_student_profile', 'edit_course_content', 'approve_leave'
    """
    code = models.CharField(max_length=100, unique=True,
                            help_text="Permission code (e.g., 'view_student_profile')")
    description = models.TextField(help_text="Human-readable description")
    module = models.CharField(
        max_length=50, blank=True, help_text="Module/feature this permission belongs to")
    is_active = models.BooleanField(
        default=True, help_text="Is this permission active?")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "rbac_permissions"
        verbose_name = "Permission"
        verbose_name_plural = "Permissions"
        ordering = ["module", "code"]

    def __str__(self):
        return f"{self.code}"


class RolePermission(models.Model):
    """
    Many-to-many mapping between Roles and Permissions.
    Defines which permissions each role has.
    """
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="role_permissions",
        help_text="The role being granted permission"
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name="role_permissions",
        help_text="The permission being granted"
    )
    granted_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="granted_permissions",
        help_text="Admin who granted this permission"
    )

    class Meta:
        db_table = "rbac_role_permissions"
        verbose_name = "Role Permission"
        verbose_name_plural = "Role Permissions"
        unique_together = [["role", "permission"]]
        ordering = ["role", "permission"]

    def __str__(self):
        return f"{self.role.code} -> {self.permission.code}"
