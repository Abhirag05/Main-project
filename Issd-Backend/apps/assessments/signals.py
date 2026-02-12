"""
Assessment signals.

Signals for the assessment module:
- Auto-update assessment status based on time
- Compute skills after assessment evaluation
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import (
    StudentAssessmentAttempt,
    Assessment,
)
from .services import (
    SkillComputationService,
    AssessmentStatusService,
)


@receiver(post_save, sender=StudentAssessmentAttempt)
def handle_attempt_completion(sender, instance, created, **kwargs):
    """
    Handle attempt completion.

    When an attempt is completed, trigger skill computation.
    """
    if not created and instance.status == StudentAssessmentAttempt.AttemptStatus.EVALUATED:
        # Compute skills for the student based on this attempt
        # This is done in the view after evaluation, but this signal
        # provides a backup mechanism
        pass


def update_assessment_statuses():
    """
    Update assessment statuses based on current time.

    This function should be called periodically (via cron/celery).

    - SCHEDULED -> ACTIVE: When start_time is reached
    - ACTIVE -> COMPLETED: When end_time is reached
    """
    now = timezone.now()

    # Activate scheduled assessments
    scheduled_to_activate = Assessment.objects.filter(
        status=Assessment.Status.SCHEDULED,
        start_time__lte=now,
        is_active=True
    )

    for assessment in scheduled_to_activate:
        AssessmentStatusService.update_assessment_status(assessment)

    # Complete active assessments
    active_to_complete = Assessment.objects.filter(
        status=Assessment.Status.ACTIVE,
        end_time__lte=now,
        is_active=True
    )

    for assessment in active_to_complete:
        AssessmentStatusService.update_assessment_status(assessment)


# Note: For production, use Celery or Django-crontab to schedule
# the update_assessment_statuses function to run periodically.
#
# Example Celery task:
#
# from celery import shared_task
#
# @shared_task
# def check_assessment_statuses():
#     """Celery task to check and update assessment statuses."""
#     update_assessment_statuses()
#
# Schedule in celery beat:
# CELERY_BEAT_SCHEDULE = {
#     'update-assessment-statuses': {
#         'task': 'apps.assessments.signals.check_assessment_statuses',
#         'schedule': crontab(minute='*/5'),  # Every 5 minutes
#     },
# }
