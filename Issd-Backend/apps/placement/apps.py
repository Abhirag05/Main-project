"""
Placement app configuration.
"""
from django.apps import AppConfig


class PlacementConfig(AppConfig):
    """Configuration for placement app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.placement'
    verbose_name = 'Placement Management'
