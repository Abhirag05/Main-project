from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.core.validators import EmailValidator
from django.utils.translation import gettext_lazy as _
from common.role_constants import is_admin_role


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""

    def create_user(self, email, password=None, **extra_fields):
        """Create and return a regular user with an email and password."""
        if not email:
            raise ValueError(_('The Email field must be set'))

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and return a superuser with an email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        # Superuser must have a role
        if 'role' not in extra_fields or extra_fields['role'] is None:
            raise ValueError(_('Superuser must have a role assigned.'))

        # Superuser must have a centre
        if 'centre' not in extra_fields or extra_fields['centre'] is None:
            raise ValueError(_('Superuser must have a centre assigned.'))

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model for the ISSD Campus ERP.
    Uses email as the primary identifier (USERNAME_FIELD).

    - is_staff: Controls Django admin access only
    - Business authorization uses role + permissions, NOT Django Groups
    """
    email = models.EmailField(
        _('email address'),
        max_length=255,
        unique=True,
        validators=[EmailValidator()],
        help_text="User's email address (used for login)"
    )
    full_name = models.CharField(
        _('full name'),
        max_length=200,
        help_text="User's full name"
    )
    phone = models.CharField(
        max_length=15,
        blank=True,
        help_text="Contact phone number"
    )

    # Relationships
    role = models.ForeignKey(
        'roles.Role',
        on_delete=models.PROTECT,
        related_name='users',
        help_text="User's role in the system (required)"
    )
    centre = models.ForeignKey(
        'centres.Centre',
        on_delete=models.PROTECT,
        related_name='users',
        help_text="Centre/campus this user belongs to (required)"
    )

    # Status flags
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text="Designates whether this user should be treated as active. "
                  "Unselect this instead of deleting accounts."
    )
    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text="Designates whether the user can log into Django admin site. "
                  "This is NOT for business authorization."
    )
    interested_courses=models.CharField(max_length=500,
    blank=True,
    help_text="Courses the user is interested in"
    )
    payment_method = models.CharField(
        max_length=50,
        blank=True,
        choices=[
            ('FULL', 'Full Payment'),
            ('INSTALLMENT', 'Installment'),
        ],
        help_text="Preferred payment method"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        db_table = "users"
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} ({self.email})"

    def get_full_name(self):
        """Return the user's full name."""
        return self.full_name

    def get_short_name(self):
        """Return the user's full name."""
        return self.full_name

    @property
    def is_admin(self):
        """Return True if the user has an admin-level role."""
        if self.is_superuser:
            return True
        return hasattr(self, 'role') and self.role and is_admin_role(self.role.code)

    def has_permission(self, permission_code):
        """
        Check if user has a specific permission through their role.
        This is business authorization, separate from Django's permission system.

        - Superusers automatically have all permissions
        - Inactive users have no permissions
        - Regular users checked via Role -> RolePermission -> Permission
        """
        # Inactive users have no permissions
        if not self.is_active:
            return False

        # Superusers automatically have all permissions
        if self.is_superuser:
            return True

        # Check via role-based permissions
        if not self.role:
            return False

        return self.role.role_permissions.filter(
            permission__code=permission_code,
            permission__is_active=True
        ).exists()
