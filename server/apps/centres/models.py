from django.db import models
from django.core.exceptions import ValidationError


class Centre(models.Model):
    """
    Represents a campus/centre in the ERP system.
    Currently only one centre exists, but the system remains centre-aware for future expansion.
    """
    name = models.CharField(max_length=200, unique=True,
                            help_text="Centre name")
    code = models.CharField(max_length=20, unique=True,
                            help_text="Unique centre code")
    is_active = models.BooleanField(
        default=True, help_text="Is this centre active?")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "centres"
        verbose_name = "Centre"
        verbose_name_plural = "Centres"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"

    def clean(self):
        """Ensure at least one active centre always exists."""
        if not self.is_active:
            active_centres = Centre.objects.filter(
                is_active=True).exclude(pk=self.pk)
            if not active_centres.exists():
                raise ValidationError(
                    "At least one centre must remain active.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
