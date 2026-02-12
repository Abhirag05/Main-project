"""
Django management command to create test data for the Assignment module.

Usage:
    python manage.py create_test_assignments

This will create:
- Sample assignments for existing faculty/batch/subject combinations
- Sample student submissions
- Sample evaluations
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
from decimal import Decimal
import random

from apps.assignments.models import Assignment, AssignmentSubmission
from apps.batch_management.models import Batch
from apps.academics.models import Subject
from apps.students.models import StudentProfile
from apps.faculty.models import FacultySubjectAssignment

User = get_user_model()


class Command(BaseCommand):
    help = 'Create test data for Assignment module'

    def add_arguments(self, parser):
        parser.add_argument(
            '--assignments',
            type=int,
            default=5,
            help='Number of assignments to create per faculty'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing assignment data before creating new'
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing assignment data...'))
            AssignmentSubmission.objects.all().delete()
            Assignment.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Cleared existing data'))

        num_assignments = options['assignments']
        
        # Get faculty subject assignments
        faculty_assignments = FacultySubjectAssignment.objects.filter(
            is_active=True
        ).select_related('faculty', 'batch', 'subject')
        
        if not faculty_assignments.exists():
            self.stdout.write(
                self.style.ERROR(
                    'No active faculty subject assignments found. '
                    'Please create faculty assignments first.'
                )
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Found {faculty_assignments.count()} faculty subject assignments'
            )
        )
        
        assignment_titles = [
            "Introduction to {} - Assignment 1",
            "Advanced {} Concepts",
            "{} Project Work",
            "{} Case Study Analysis",
            "{} Practical Implementation",
            "Final {} Project",
            "{} Research Assignment",
            "{} Problem Solving Exercise",
        ]
        
        assignment_descriptions = [
            "Complete the following tasks as per the instructions provided. "
            "Submit your work before the due date. Late submissions will not be accepted.",
            
            "This assignment tests your understanding of key concepts covered in class. "
            "Ensure proper documentation and code comments.",
            
            "Implement the solution using best practices. Include test cases and documentation.",
            
            "Analyze the given scenario and provide detailed solutions with proper justification.",
            
            "Create a comprehensive project demonstrating your understanding of the subject matter.",
        ]
        
        created_assignments = 0
        created_submissions = 0
        
        # Create assignments
        for faculty_assignment in faculty_assignments[:10]:  # Limit to first 10 for demo
            faculty = faculty_assignment.faculty.user
            batch = faculty_assignment.batch
            subject = faculty_assignment.subject
            
            for i in range(num_assignments):
                title = random.choice(assignment_titles).format(subject.name)
                description = random.choice(assignment_descriptions)
                
                # Random due date between 7 and 30 days from now
                days_ahead = random.randint(7, 30)
                due_date = timezone.now() + timedelta(days=days_ahead)
                
                # Random max marks
                max_marks = random.choice([50, 75, 100, 150])
                
                assignment = Assignment.objects.create(
                    batch=batch,
                    subject=subject,
                    faculty=faculty,
                    title=title,
                    description=description,
                    max_marks=Decimal(max_marks),
                    due_date=due_date,
                    is_active=True
                )
                created_assignments += 1
                
                # Create some submissions for this assignment
                students = StudentProfile.objects.filter(
                    current_batch=batch,
                    is_active=True
                )[:random.randint(3, 8)]  # Random number of submissions
                
                for student in students:
                    # Some submissions are evaluated, some are not
                    is_evaluated = random.choice([True, True, False])
                    
                    submission = AssignmentSubmission.objects.create(
                        assignment=assignment,
                        student=student,
                        submission_file=f'test_submissions/sample_{student.id}.pdf'
                    )
                    
                    if is_evaluated:
                        # Random marks (60-100% of max marks)
                        percentage = random.uniform(0.6, 1.0)
                        marks = Decimal(max_marks * percentage).quantize(Decimal('0.01'))
                        
                        feedback_options = [
                            "Excellent work! Well done.",
                            "Good effort. Could improve in some areas.",
                            "Satisfactory work. Follow the guidelines more carefully.",
                            "Well structured and properly documented.",
                            "Needs improvement. Please review the concepts.",
                        ]
                        
                        submission.marks_obtained = marks
                        submission.feedback = random.choice(feedback_options)
                        submission.evaluated_at = timezone.now() - timedelta(days=random.randint(1, 5))
                        submission.evaluated_by = faculty
                        submission.save()
                    
                    created_submissions += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully created:\n'
                f'  - {created_assignments} assignments\n'
                f'  - {created_submissions} submissions\n'
            )
        )
        
        # Print summary
        total_evaluated = AssignmentSubmission.objects.filter(
            marks_obtained__isnull=False
        ).count()
        total_pending = AssignmentSubmission.objects.filter(
            marks_obtained__isnull=True
        ).count()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSummary:\n'
                f'  - Total Assignments: {Assignment.objects.count()}\n'
                f'  - Total Submissions: {AssignmentSubmission.objects.count()}\n'
                f'  - Evaluated: {total_evaluated}\n'
                f'  - Pending Evaluation: {total_pending}\n'
            )
        )
