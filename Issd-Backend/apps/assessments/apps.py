"""
Assessment app configuration.
"""
from django.apps import AppConfig


class AssessmentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.assessments'
    label = 'assessments'
    verbose_name = 'Assessments'

    def ready(self):
        """Import signals when app is ready."""
        try:
            import apps.assessments.signals  # noqa: F401
        except ImportError:
            pass
