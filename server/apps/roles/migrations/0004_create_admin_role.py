"""
Data migration to add the consolidated ADMIN role.

This does NOT remove any existing roles – it only ensures an 'ADMIN' role
exists so that new admin users can be assigned to it instead of one of the
legacy admin-level roles (SUPER_ADMIN, CENTRE_ADMIN, etc.).
"""
from django.db import migrations


def create_admin_role(apps, schema_editor):
    Role = apps.get_model('roles', 'Role')
    Role.objects.get_or_create(
        code='ADMIN',
        defaults={
            'name': 'Admin',
            'description': 'Consolidated admin role with full system access',
            'is_active': True,
        },
    )


def reverse_admin_role(apps, schema_editor):
    Role = apps.get_model('roles', 'Role')
    Role.objects.filter(code='ADMIN').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('roles', '0003_create_default_roles'),
    ]

    operations = [
        migrations.RunPython(create_admin_role, reverse_admin_role),
    ]
