"""
Management command to create a superuser with role and centre.
This is a helper command since our custom User model requires both fields.
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.users.models import User
from apps.roles.models import Role
from apps.centres.models import Centre


class Command(BaseCommand):
    help = 'Creates a superuser with role and centre (required fields)'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str,
                            help='Email address for the superuser')
        parser.add_argument('--name', type=str,
                            help='Full name of the superuser')
        parser.add_argument(
            '--password', type=str, help='Password (optional, will prompt if not provided)')
        parser.add_argument('--role-code', type=str, default='ADMIN',
                            help='Role code (default: ADMIN)')
        parser.add_argument('--centre-code', type=str, default='ISSD-MAIN',
                            help='Centre code (default: ISSD-MAIN)')

    @transaction.atomic
    def handle(self, *args, **options):
        # Get email
        email = options.get('email')
        if not email:
            email = input('Email address: ')

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            raise CommandError(f'User with email {email} already exists.')

        # Get full name
        full_name = options.get('name')
        if not full_name:
            full_name = input('Full name: ')

        # Get password
        password = options.get('password')
        if not password:
            from getpass import getpass
            password = getpass('Password: ')
            password_confirm = getpass('Password (again): ')
            if password != password_confirm:
                raise CommandError('Passwords do not match.')

        # Get role
        role_code = options.get('role_code', 'ADMIN')
        try:
            role = Role.objects.get(code=role_code, is_active=True)
        except Role.DoesNotExist:
            self.stdout.write(self.style.WARNING(
                f'Role {role_code} not found. Available roles:'))
            for r in Role.objects.filter(is_active=True):
                self.stdout.write(f'  - {r.code}: {r.name}')
            raise CommandError(f'Role with code {role_code} does not exist.')

        # Get centre
        centre_code = options.get('centre_code', 'ISSD-MAIN')
        try:
            centre = Centre.objects.get(code=centre_code, is_active=True)
        except Centre.DoesNotExist:
            self.stdout.write(self.style.WARNING(
                f'Centre {centre_code} not found. Available centres:'))
            for c in Centre.objects.filter(is_active=True):
                self.stdout.write(f'  - {c.code}: {c.name}')
            raise CommandError(
                f'Centre with code {centre_code} does not exist.')

        # Create superuser
        user = User.objects.create_superuser(
            email=email,
            password=password,
            full_name=full_name,
            role=role,
            centre=centre
        )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created superuser: {user.email}')
        )
        self.stdout.write(f'  Name: {user.full_name}')
        self.stdout.write(f'  Role: {user.role.name} ({user.role.code})')
        self.stdout.write(f'  Centre: {user.centre.name} ({user.centre.code})')
