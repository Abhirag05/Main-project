"""
Academic programs and courses models.
Core schema for course management.
"""
from django.db import models


class Course(models.Model):
    """
    Course model.

    Represents an academic course/program offered by the institution.
    Examples: Full Stack Web Development, Data Science, AI/ML
    """

    name = models.CharField(
        max_length=200,
        unique=True,
        help_text="Course name (e.g., 'Full Stack Web Development')"
    )

    code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique course code (e.g., 'FSWD', 'DS', 'AIML')"
    )

    description = models.TextField(
        blank=True,
        help_text="Detailed course description"
    )

    duration_months = models.PositiveIntegerField(
        default=6,
        help_text="Course duration in months (e.g., 6, 12, 24, 36)"
    )

    skills = models.JSONField(
        default=list,
        blank=True,
        help_text="Skills gained after completing the course (stored as list of strings)"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this course is currently offered"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academics_courses'
        verbose_name = 'Course'
        verbose_name_plural = 'Courses'
        ordering = ['name']

    def __str__(self):
        return f"{self.code} - {self.name}"


class Module(models.Model):
    """
    Module model.

    Represents a teachable module/subject that can belong to one or more courses.
    Examples: HTML/CSS, JavaScript, React, Python Basics, Data Structures
    """

    code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Unique module code (e.g., 'HTML', 'JS', 'REACT')"
    )

    name = models.CharField(
        max_length=200,
        help_text="Module name (e.g., 'HTML & CSS Fundamentals')"
    )

    description = models.TextField(
        blank=True,
        help_text="Detailed module description"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this module is currently active"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academics_modules'
        verbose_name = 'Module'
        verbose_name_plural = 'Modules'
        ordering = ['name']

    def __str__(self):
        return self.name


class CourseModule(models.Model):
    """
    CourseModule model.

    Defines curriculum structure by mapping modules to courses in a defined order.
    Represents the many-to-many relationship between Course and Module with ordering.
    """

    course = models.ForeignKey(
        'Course',
        on_delete=models.PROTECT,
        related_name='course_modules',
        help_text="Course this module belongs to"
    )

    module = models.ForeignKey(
        'Module',
        on_delete=models.PROTECT,
        related_name='course_modules',
        help_text="Module included in the course"
    )

    sequence_order = models.PositiveIntegerField(
        help_text="Order of this module in the course curriculum"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this course-module mapping is active"
    )

    class Meta:
        db_table = 'academics_course_modules'
        verbose_name = 'Course Module'
        verbose_name_plural = 'Course Modules'
        unique_together = [['course', 'module']]
        ordering = ['sequence_order']

    def __str__(self):
        return f"{self.course.code} → {self.module.code}"
