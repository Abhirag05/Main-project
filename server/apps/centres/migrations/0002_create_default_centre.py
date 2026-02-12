"""
Data migration to create the default ISSD Main Centre.
This ensures at least one centre exists in the system.
"""
from django.db import migrations


def create_default_centre(apps, schema_editor):
    """Create the default ISSD Main Centre if no centres exist."""
    Centre = apps.get_model('centres', 'Centre')

    # Only create if no centres exist
    if not Centre.objects.exists():
        Centre.objects.create(
            name='ISSD Main Centre',
            code='ISSD-MAIN',
            is_active=True
        )


def reverse_default_centre(apps, schema_editor):
    """Remove the default centre (reverse migration)."""
    Centre = apps.get_model('centres', 'Centre')
    Centre.objects.filter(code='ISSD-MAIN').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('centres', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_centre, reverse_default_centre),
    ]
