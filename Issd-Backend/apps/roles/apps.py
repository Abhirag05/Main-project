from django.apps import AppConfig


class RolesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.roles'

    def ready(self):
        # Import signals to connect post-save hooks
        try:
            import apps.roles.signals  # noqa: F401
        except Exception:
            # Avoid breaking Django startup if signals fail; errors will surface elsewhere
            pass
