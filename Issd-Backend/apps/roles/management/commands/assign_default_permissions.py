"""
Management command to assign default permissions to roles.

This command sets up the recommended permission mappings for each role.
It is idempotent and can be run multiple times safely.

Usage:
    python manage.py assign_default_permissions
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Assign default permissions to roles'

    # Default role-permission mappings
    # Format: role_code → [permission_codes]
    ROLE_PERMISSIONS = {
        'SUPER_ADMIN': [
            # Full system access
            'user.create', 'user.view', 'user.manage', 'user.delete',
            'role.view', 'role.assign', 'role.create', 'role.manage',
            'permission.view', 'permission.assign', 'permission.manage',
            'centre.view', 'centre.create', 'centre.manage',
            'audit.view',
            'system.admin',
        ],
        'CENTRE_ADMIN': [
            # Centre-level administration
            'user.create', 'user.view', 'user.manage',
            'role.view', 'role.assign',
            'centre.view', 'centre.manage',
            'audit.view',
            # Timetable management
            'timetable.view', 'timetable.create', 'timetable.edit', 'timetable.delete',
            # Batch management
            'batch.view', 'batch.create', 'batch.edit', 'batch.manage',
            # Academic management
            'academic.view',
            # Faculty management
            'faculty.view', 'faculty.assign',
        ],
        'ACADEMIC_COORDINATOR': [
            # Academic management
            'user.view',
            'role.view',
            'centre.view',
            # Timetable management
            'timetable.view', 'timetable.create', 'timetable.edit', 'timetable.delete',
            # Batch management
            'batch.view', 'batch.edit', 'batch.manage',
            # Academic content
            'academic.view', 'academic.create', 'academic.edit',
        ],
        'COURSE_COORDINATOR': [
            # Course-level management
            'user.view',
            'role.view',
            # Timetable for assigned courses
            'timetable.view', 'timetable.create', 'timetable.edit',
            # Batch view
            'batch.view',
            # Academic content
            'academic.view',
        ],
        'BATCH_MENTOR': [
            # Batch-level view access
            'user.view',
            # Timetable view and limited edit
            'timetable.view', 'timetable.edit', 'timetable.create',
            # Batch management
            'batch.view',
        ],
        'FACULTY': [
            # Teaching staff - view only
            'user.view',
            # Timetable view (own schedule)
            'timetable.view',
        ],
        'STUDENT': [
            # Students - timetable view
            'timetable.view',
        ],
        'FINANCE': [
            # Finance department
            'user.view',
            'audit.view',
        ],
        'PLACEMENT': [
            # Placement cell
            'user.view',
        ],
        'ALUMNI': [
            # Alumni - minimal access
        ],
    }

    def handle(self, *args, **options):
        """Execute the command."""
        self.stdout.write(self.style.MIGRATE_HEADING(
            'Assigning default permissions to roles...'))

        # Import project models now
        from django.contrib.auth import get_user_model
        from apps.roles.models import Role, Permission, RolePermission

        User = get_user_model()

        # Get system user for granted_by (use first superuser)
        system_user = User.objects.filter(is_superuser=True).first()
        if not system_user:
            self.stdout.write(self.style.ERROR(
                'ERROR: No superuser found. Please create a superuser first.'))
            return

        total_assigned = 0
        total_skipped = 0

        # Use the ROLE_PERMISSIONS mapping defined on this command class
        for role_code, permission_codes in self.ROLE_PERMISSIONS.items():
            try:
                role = Role.objects.get(code=role_code)
            except Role.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f'  ⚠ Role not found: {role_code}'))
                continue

            self.stdout.write(f'\n{role.name} ({role_code}):')

            if not permission_codes:
                self.stdout.write(self.style.WARNING(
                    '  - No permissions assigned (intentional)'))
                continue

            for perm_code in permission_codes:
                # Ensure Permission exists; create if missing so this command is self-contained
                permission, perm_created = Permission.objects.get_or_create(
                    code=perm_code,
                    defaults={
                        'description': f'Auto-created permission: {perm_code}',
                        'module': perm_code.split('.')[0] if '.' in perm_code else perm_code
                    }
                )
                if perm_created:
                    self.stdout.write(self.style.SUCCESS(
                        f'  + Created permission: {perm_code}'))

                role_perm, created = RolePermission.objects.get_or_create(
                    role=role,
                    permission=permission,
                    defaults={'granted_by': system_user}
                )

                if created:
                    total_assigned += 1
                    self.stdout.write(self.style.SUCCESS(
                        f'  ✓ Assigned: {perm_code}'))
                else:
                    total_skipped += 1
                    self.stdout.write(f'  - Already assigned: {perm_code}')

        # Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            'Successfully assigned default permissions!'))
        self.stdout.write(f'  New assignments: {total_assigned}')
        self.stdout.write(f'  Already existed: {total_skipped}')
        self.stdout.write(f'  Total: {total_assigned + total_skipped}')
