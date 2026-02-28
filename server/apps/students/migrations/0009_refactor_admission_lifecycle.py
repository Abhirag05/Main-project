"""
Data migration: Refactor student admission statuses to clean lifecycle.

Mapping:
    PENDING                 → PENDING       (no change)
    APPROVED                → PENDING       (was intermediate, now same as pending)
    FULL_PAYMENT_VERIFIED   → ACTIVE
    INSTALLMENT_VERIFIED    → ACTIVE
    INSTALLMENT_PENDING     → PAYMENT_DUE
    DISABLED                → SUSPENDED
    COURSE_COMPLETED        → DROPPED
    REJECTED                → DROPPED
"""
from django.db import migrations, models


def migrate_statuses_forward(apps, schema_editor):
    StudentProfile = apps.get_model('students', 'StudentProfile')

    mapping = {
        'APPROVED': 'PENDING',
        'FULL_PAYMENT_VERIFIED': 'ACTIVE',
        'INSTALLMENT_VERIFIED': 'ACTIVE',
        'INSTALLMENT_PENDING': 'PAYMENT_DUE',
        'DISABLED': 'SUSPENDED',
        'COURSE_COMPLETED': 'DROPPED',
        'REJECTED': 'DROPPED',
    }

    for old_status, new_status in mapping.items():
        StudentProfile.objects.filter(admission_status=old_status).update(
            admission_status=new_status
        )


def migrate_statuses_backward(apps, schema_editor):
    """Best-effort reverse using payment_status to disambiguate."""
    StudentProfile = apps.get_model('students', 'StudentProfile')

    # ACTIVE → FULL_PAYMENT_VERIFIED or INSTALLMENT_VERIFIED
    StudentProfile.objects.filter(
        admission_status='ACTIVE', payment_status='FULL_PAYMENT'
    ).update(admission_status='FULL_PAYMENT_VERIFIED')

    StudentProfile.objects.filter(
        admission_status='ACTIVE', payment_status='INSTALLMENT'
    ).update(admission_status='INSTALLMENT_VERIFIED')

    # Remaining ACTIVE (payment_status=PENDING) - shouldn't exist, fallback
    StudentProfile.objects.filter(
        admission_status='ACTIVE'
    ).update(admission_status='FULL_PAYMENT_VERIFIED')

    # PAYMENT_DUE → INSTALLMENT_PENDING
    StudentProfile.objects.filter(
        admission_status='PAYMENT_DUE'
    ).update(admission_status='INSTALLMENT_PENDING')

    # SUSPENDED → DISABLED
    StudentProfile.objects.filter(
        admission_status='SUSPENDED'
    ).update(admission_status='DISABLED')

    # DROPPED → REJECTED (best effort)
    StudentProfile.objects.filter(
        admission_status='DROPPED'
    ).update(admission_status='REJECTED')


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0008_add_course_completed_status'),
    ]

    operations = [
        # First, add the new choices to the field
        migrations.AlterField(
            model_name='studentprofile',
            name='admission_status',
            field=models.CharField(
                choices=[
                    ('PENDING', 'Pending'),
                    ('ACTIVE', 'Active'),
                    ('PAYMENT_DUE', 'Payment Due'),
                    ('SUSPENDED', 'Suspended'),
                    ('DROPPED', 'Dropped'),
                    ('APPROVED', 'Approved'),
                    ('REJECTED', 'Rejected'),
                    ('FULL_PAYMENT_VERIFIED', 'Full Payment Verified'),
                    ('INSTALLMENT_VERIFIED', 'Installment Verified'),
                    ('INSTALLMENT_PENDING', 'Installment Pending'),
                    ('COURSE_COMPLETED', 'Course Completed'),
                    ('DISABLED', 'Disabled'),
                ],
                default='PENDING',
                help_text='Current admission status',
                max_length=30,
            ),
        ),
        # Then migrate the data
        migrations.RunPython(
            migrate_statuses_forward,
            migrate_statuses_backward,
        ),
    ]
