"""
Course material models.
Allows faculty to upload learning materials and assign them to batches.
"""
import os
from django.db import models
from django.conf import settings


def course_material_upload_path(instance, filename):
    """
    Structured upload path:
    media/course_materials/module_<id>/faculty_<id>/<filename>
    """
    return os.path.join(
        'course_materials',
        f'module_{instance.module_id}',
        f'faculty_{instance.faculty_id}',
        filename
    )


class CourseMaterial(models.Model):
    """
    A single piece of learning material uploaded by faculty.
    Can be a file upload (PDF/PPT/DOC) or an external link (video URL etc.).
    Assigned to one or more batches via CourseMaterialBatch.
    """

    class MaterialType(models.TextChoices):
        PDF = 'PDF', 'PDF'
        PPT = 'PPT', 'PPT / PPTX'
        DOC = 'DOC', 'DOC / DOCX'
        VIDEO = 'VIDEO', 'Video'
        LINK = 'LINK', 'External Link'

    title = models.CharField(
        max_length=255,
        help_text="Material title"
    )

    description = models.TextField(
        blank=True,
        help_text="Optional description of the material"
    )

    module = models.ForeignKey(
        'academics.Module',
        on_delete=models.PROTECT,
        related_name='course_materials',
        help_text="Module this material belongs to"
    )

    faculty = models.ForeignKey(
        'faculty.FacultyProfile',
        on_delete=models.PROTECT,
        related_name='course_materials',
        help_text="Faculty who uploaded the material"
    )

    material_type = models.CharField(
        max_length=10,
        choices=MaterialType.choices,
        help_text="Type of material"
    )

    file = models.FileField(
        upload_to=course_material_upload_path,
        null=True,
        blank=True,
        help_text="Uploaded file (PDF, PPT, DOC). Max 20 MB."
    )

    external_url = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="External URL (for VIDEO / LINK types)"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Soft-delete flag"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'course_materials'
        verbose_name = 'Course Material'
        verbose_name_plural = 'Course Materials'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.material_type})"


class CourseMaterialBatch(models.Model):
    """
    Many-to-many link between CourseMaterial and Batch.
    Controls which batches (Live / Recorded) can access a material.
    """

    material = models.ForeignKey(
        CourseMaterial,
        on_delete=models.CASCADE,
        related_name='batch_assignments',
        help_text="The course material"
    )

    batch = models.ForeignKey(
        'batch_management.Batch',
        on_delete=models.PROTECT,
        related_name='material_assignments',
        help_text="Batch that has access to this material"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this batch mapping is active"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'course_material_batches'
        verbose_name = 'Course Material Batch'
        verbose_name_plural = 'Course Material Batches'
        unique_together = [['material', 'batch']]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.material.title} → {self.batch.code}"
