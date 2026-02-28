from django.db import models
from django.conf import settings


class StudentProfile(models.Model):
    """
    Represents a student's admission profile.
    This is created during public registration and represents pre-admission state.

    IMPORTANT:
    - admission_status = PENDING means awaiting approval
    - This is NOT batch enrollment or fees assignment
    - This is purely for admission tracking
    """

    ADMISSION_STATUS_CHOICES = [
        # ── Active lifecycle states ──────────────────────────────
        ('PENDING', 'Pending'),             # Registered, awaiting payment verification
        ('ACTIVE', 'Active'),               # Payment verified, full LMS access
        ('PAYMENT_DUE', 'Payment Due'),     # Installment overdue, access suspended
        ('SUSPENDED', 'Suspended'),         # Admin manually suspended access
        ('DROPPED', 'Dropped'),             # Permanently removed from system
        # ── Legacy (kept for backward compatibility) ─────────────
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('FULL_PAYMENT_VERIFIED', 'Full Payment Verified'),
        ('INSTALLMENT_VERIFIED', 'Installment Verified'),
        ('INSTALLMENT_PENDING', 'Installment Pending'),
        ('COURSE_COMPLETED', 'Course Completed'),
        ('DISABLED', 'Disabled'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('FULL_PAYMENT', 'Full Payment Completed'),
        ('INSTALLMENT', 'Installment'),
    ]

    STUDY_MODE_CHOICES = [
        ('LIVE', 'Live'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='student_profile',
        help_text="Link to the User account"
    )

    phone_number = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        help_text="Student's contact phone number"
    )

    discovery_sources = models.JSONField(
        default=list,
        blank=True,
        help_text="How the student heard about the institute (e.g., Ads, YouTube)"
    )

    admission_status = models.CharField(
        max_length=30,
        choices=ADMISSION_STATUS_CHOICES,
        default='PENDING',
        help_text="Current admission status"
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='PENDING',
        help_text="Payment verification status"
    )

    study_mode = models.CharField(
        max_length=20,
        choices=STUDY_MODE_CHOICES,
        default='LIVE',
        help_text="Preferred study mode (LIVE or RECORDED)"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the registration was submitted"
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_profiles'
        verbose_name = 'Student Profile'
        verbose_name_plural = 'Student Profiles'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.full_name} - {self.admission_status}"
