"""
Placement management models.

This module contains models for managing placement lists and tracking students
for placement opportunities.
"""
from django.db import models
from django.conf import settings


class PlacementList(models.Model):
    """
    PlacementList model.

    Represents a named list/table for organizing students for placement activities.
    Examples: "Python Developers Q1 2024", "Frontend Ready Candidates", "Data Science Batch 5"
    """

    name = models.CharField(
        max_length=200,
        unique=True,
        help_text="Name of the placement list"
    )

    description = models.TextField(
        blank=True,
        help_text="Optional description for this placement list"
    )

    placement_link = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Registration link for students to apply for placement"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_placement_lists',
        help_text="User who created this placement list"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this placement list was created"
    )

    updated_at = models.DateTimeField(auto_now=True)

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this placement list is currently active"
    )

    class Meta:
        app_label = 'placement'
        db_table = 'placement_lists'
        verbose_name = 'Placement List'
        verbose_name_plural = 'Placement Lists'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def student_count(self):
        """Return the number of students in this placement list."""
        return self.students.filter(is_active=True).count()


class PlacementListStudent(models.Model):
    """
    PlacementListStudent model.

    Many-to-many relationship between placement lists and students.
    Allows tracking which students are in which placement lists.
    """

    placement_list = models.ForeignKey(
        PlacementList,
        on_delete=models.CASCADE,
        related_name='students',
        help_text="The placement list this entry belongs to"
    )

    student = models.ForeignKey(
        'students.StudentProfile',
        on_delete=models.CASCADE,
        related_name='placement_lists',
        help_text="The student in this placement list"
    )

    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='added_placement_students',
        help_text="User who added this student to the list"
    )

    notes = models.TextField(
        blank=True,
        help_text="Optional notes about this student for placement"
    )

    added_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this student was added to the list"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this student is currently in the list"
    )

    class Meta:
        app_label = 'placement'
        db_table = 'placement_list_students'
        verbose_name = 'Placement List Student'
        verbose_name_plural = 'Placement List Students'
        unique_together = [['placement_list', 'student']]
        ordering = ['added_at']

    def __str__(self):
        return f"{self.student.user.full_name} - {self.placement_list.name}"


class StudentPlacementLink(models.Model):
    """
    Track placement registration links sent to students.

    Stores the mapping between students and placement lists they received links for.
    """

    student = models.ForeignKey(
        'students.StudentProfile',
        on_delete=models.CASCADE,
        related_name='placement_links',
        help_text="Student who received the link"
    )

    placement_list = models.ForeignKey(
        PlacementList,
        on_delete=models.CASCADE,
        related_name='student_links',
        help_text="The placement list with the link"
    )

    placement_link = models.URLField(
        max_length=500,
        help_text="The registration link sent to student"
    )

    sent_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the link was sent to student"
    )

    class Meta:
        app_label = 'placement'
        db_table = 'student_placement_links'
        verbose_name = 'Student Placement Link'
        verbose_name_plural = 'Student Placement Links'
        unique_together = [['student', 'placement_list']]
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['placement_list', 'student']),
        ]

    def __str__(self):
        return f"{self.student.user.full_name} - {self.placement_list.name}"
