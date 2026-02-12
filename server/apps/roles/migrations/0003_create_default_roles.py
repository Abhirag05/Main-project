"""
Data migration to create default roles for the ISSD Campus ERP.
Creates 10 standard roles used across the system.
"""
from django.db import migrations


def create_default_roles(apps, schema_editor):
    """Create default roles if they don't exist."""
    Role = apps.get_model('roles', 'Role')

    default_roles = [
        {
            'name': 'Super Admin',
            'code': 'SUPER_ADMIN',
            'description': 'Full system access and control',
            'is_active': True,
        },
        {
            'name': 'Centre Admin',
            'code': 'CENTRE_ADMIN',
            'description': 'Centre-level administrative access',
            'is_active': True,
        },
        {
            'name': 'Academic Coordinator',
            'code': 'ACADEMIC_COORDINATOR',
            'description': 'Manages academic programs and curriculum',
            'is_active': True,
        },
        {
            'name': 'Course Coordinator',
            'code': 'COURSE_COORDINATOR',
            'description': 'Manages individual courses and their content',
            'is_active': True,
        },
        {
            'name': 'Batch Mentor',
            'code': 'BATCH_MENTOR',
            'description': 'Mentors and manages student batches',
            'is_active': True,
        },
        {
            'name': 'Faculty',
            'code': 'FACULTY',
            'description': 'Teaching staff with course delivery responsibilities',
            'is_active': True,
        },
        {
            'name': 'Student',
            'code': 'STUDENT',
            'description': 'Enrolled student in the campus',
            'is_active': True,
        },
        {
            'name': 'Finance',
            'code': 'FINANCE',
            'description': 'Handles financial operations and billing',
            'is_active': True,
        },
        {
            'name': 'Placement',
            'code': 'PLACEMENT',
            'description': 'Manages placement activities and employer relations',
            'is_active': True,
        },
        {
            'name': 'Alumni',
            'code': 'ALUMNI',
            'description': 'Former student with limited access',
            'is_active': True,
        },
    ]

    # Create roles only if they don't exist
    for role_data in default_roles:
        Role.objects.get_or_create(
            code=role_data['code'],
            defaults={
                'name': role_data['name'],
                'description': role_data['description'],
                'is_active': role_data['is_active'],
            }
        )


def reverse_default_roles(apps, schema_editor):
    """Remove default roles (reverse migration)."""
    Role = apps.get_model('roles', 'Role')

    role_codes = [
        'SUPER_ADMIN',
        'CENTRE_ADMIN',
        'ACADEMIC_COORDINATOR',
        'COURSE_COORDINATOR',
        'BATCH_MENTOR',
        'FACULTY',
        'STUDENT',
        'FINANCE',
        'PLACEMENT',
        'ALUMNI',
    ]

    Role.objects.filter(code__in=role_codes).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('roles', '0002_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_roles, reverse_default_roles),
    ]
