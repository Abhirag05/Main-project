from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from .utils import assign_default_permissions_for_role
from .models import Role

User = get_user_model()


@receiver(post_save, sender=User)
def seed_role_permissions_on_user_create(sender, instance, created, **kwargs):
    """
    When a new user is created (e.g., from Django admin), ensure their role
    has the default permissions seeded. This makes creating users via admin
    produce users whose roles already contain the expected RBAC mappings.
    """
    # Also run on updates so changing a user's role seeds the role permissions.
    user = instance
    role = getattr(user, 'role', None)
    if not role:
        return

    # Prefer an existing superuser as the 'granted_by' reference, if available
    system_user = User.objects.filter(is_superuser=True).first()

    try:
        assign_default_permissions_for_role(role.code, granted_by=system_user)
    except Exception:
        # Do not raise from signal; failures here should not break user creation/update.
        pass


@receiver(post_save, sender=Role)
def seed_permissions_on_role_create(sender, instance, created, **kwargs):
    """
    When a new Role is created via UI or admin, seed the default permission
    mappings for that role so subsequent users assigned the role have
    the expected capabilities.
    """
    if not created:
        return

    role = instance
    system_user = User.objects.filter(is_superuser=True).first()

    try:
        assign_default_permissions_for_role(role.code, granted_by=system_user)
    except Exception:
        # Silently ignore to avoid breaking role creation flow
        pass
