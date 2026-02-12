"""
Management command to seed canonical permissions into the database.

Usage:
    python manage.py seed_permissions

This command is idempotent - it can be run multiple times safely.
It will create permissions that don't exist and skip existing ones.
"""
from django.core.management.base import BaseCommand
from apps.roles.models import Permission


class Command(BaseCommand):
    help = 'Seed canonical permissions into the database'

    # Canonical list of permissions
    # Format: (code, description, module)
    PERMISSIONS = [
        # User management permissions
        ('user.create', 'Can create new users', 'user'),
        ('user.view', 'Can view user information', 'user'),
        ('user.manage', 'Can enable/disable users and manage user data', 'user'),
        ('user.delete', 'Can delete users', 'user'),

        # Role management permissions
        ('role.view', 'Can view role information', 'role'),
        ('role.assign', 'Can assign roles to users', 'role'),
        ('role.create', 'Can create new roles', 'role'),
        ('role.manage', 'Can edit and manage role definitions', 'role'),

        # Permission management
        ('permission.view', 'Can view permission information', 'permission'),
        ('permission.assign', 'Can assign permissions to roles', 'permission'),
        ('permission.manage', 'Can create and manage permissions', 'permission'),

        # Centre management permissions
        ('centre.view', 'Can view centre information', 'centre'),
        ('centre.create', 'Can create new centres', 'centre'),
        ('centre.manage', 'Can edit and manage centres', 'centre'),

        # Audit log permissions
        ('audit.view', 'Can view audit log entries', 'audit'),

        # Faculty management permissions
        ('faculty.view', 'Can view faculty information', 'faculty'),
        ('faculty.create', 'Can create new faculty profiles', 'faculty'),
        ('faculty.edit', 'Can edit faculty information', 'faculty'),
        ('faculty.delete', 'Can delete faculty profiles', 'faculty'),
        ('faculty.assign', 'Can assign faculty to batches and subjects', 'faculty'),

        # Timetable management permissions
        ('timetable.view', 'Can view timetables and schedules', 'timetable'),
        ('timetable.create',
         'Can create time slots, sessions, and course plans', 'timetable'),
        ('timetable.edit', 'Can edit timetable entries', 'timetable'),
        ('timetable.delete', 'Can delete timetable entries', 'timetable'),

        # Batch management permissions
        ('batch.view', 'Can view batch information', 'batch'),
        ('batch.create', 'Can create new batches', 'batch'),
        ('batch.edit', 'Can edit batch information', 'batch'),
        ('batch.manage', 'Can manage batch students and assignments', 'batch'),

        # Academic permissions
        ('academic.view', 'Can view courses and subjects', 'academic'),
        ('academic.create', 'Can create courses and subjects', 'academic'),
        ('academic.edit', 'Can edit academic content', 'academic'),
        ('academic.delete', 'Can delete academic content', 'academic'),

        # System permissions
        ('system.admin', 'Full system access', 'system'),
    ]

    def handle(self, *args, **options):
        """Execute the command."""
        self.stdout.write(self.style.MIGRATE_HEADING('Seeding permissions...'))

        created_count = 0
        existing_count = 0

        for code, description, module in self.PERMISSIONS:
            permission, created = Permission.objects.get_or_create(
                code=code,
                defaults={
                    'description': description,
                    'module': module
                }
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  ✓ Created: {code} - {description}')
                )
            else:
                existing_count += 1
                self.stdout.write(
                    self.style.WARNING(f'  - Already exists: {code}')
                )

        # Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Successfully seeded permissions!'))
        self.stdout.write(f'  Created: {created_count}')
        self.stdout.write(f'  Already existed: {existing_count}')
        self.stdout.write(f'  Total: {created_count + existing_count}')
