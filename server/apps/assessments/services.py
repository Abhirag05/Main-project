"""
Assessment services.

Business logic for assessment evaluation and skill computation.
Keeps views clean by encapsulating complex operations.
"""
from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from django.db import transaction
from django.db.models import Avg, Count, Max, Min, Sum, F
from django.utils import timezone

from .models import (
    Assessment,
    AssessmentQuestion,
    AssessmentOption,
    AssessmentSkillMapping,
    StudentAssessmentAttempt,
    StudentAnswer,
    StudentSkill,
    Skill,
)


class AssessmentEvaluationService:
    """
    Service for evaluating student assessment attempts.

    Handles:
    - Comparing answers with correct options
    - Calculating marks and percentage
    - Updating attempt status
    """

    @staticmethod
    @transaction.atomic
    def evaluate_attempt(attempt: StudentAssessmentAttempt) -> StudentAssessmentAttempt:
        """
        Evaluate a submitted assessment attempt.

        Args:
            attempt: The StudentAssessmentAttempt to evaluate

        Returns:
            Updated StudentAssessmentAttempt with scores
        """
        if attempt.status == StudentAssessmentAttempt.AttemptStatus.EVALUATED:
            return attempt

        total_marks_obtained = Decimal('0')

        # Get all questions for this assessment
        questions = attempt.assessment.questions.filter(is_active=True)

        # Process each answer
        for question in questions:
            answer, created = StudentAnswer.objects.get_or_create(
                attempt=attempt,
                question=question,
                defaults={'selected_option': None}
            )

            # Evaluate the answer
            if answer.selected_option:
                is_correct = answer.selected_option.is_correct
                marks = Decimal(str(question.marks)
                                ) if is_correct else Decimal('0')
            else:
                is_correct = False
                marks = Decimal('0')

            answer.is_correct = is_correct
            answer.marks_obtained = marks
            answer.save()

            total_marks_obtained += marks

        # Calculate percentage
        total_marks = Decimal(str(attempt.assessment.total_marks))
        percentage = (total_marks_obtained / total_marks *
                      100) if total_marks > 0 else Decimal('0')

        # Update attempt
        attempt.total_marks_obtained = total_marks_obtained
        attempt.percentage = percentage
        attempt.status = StudentAssessmentAttempt.AttemptStatus.EVALUATED
        attempt.submitted_at = timezone.now()
        attempt.save()

        return attempt

    @staticmethod
    def get_attempt_details(attempt: StudentAssessmentAttempt) -> Dict:
        """
        Get detailed information about an attempt including all answers.

        Args:
            attempt: The StudentAssessmentAttempt

        Returns:
            Dictionary with attempt details
        """
        answers_data = []

        for answer in attempt.answers.select_related(
            'question', 'selected_option'
        ).order_by('question__order'):
            correct_option = answer.question.correct_option

            answers_data.append({
                'question_id': answer.question.id,
                'question_text': answer.question.question_text,
                'max_marks': answer.question.marks,
                'selected_option': answer.selected_option.option_label if answer.selected_option else None,
                'selected_option_text': answer.selected_option.option_text if answer.selected_option else None,
                'correct_option': correct_option.option_label if correct_option else None,
                'correct_option_text': correct_option.option_text if correct_option else None,
                'is_correct': answer.is_correct,
                'marks_obtained': float(answer.marks_obtained),
            })

        return {
            'attempt_id': attempt.id,
            'student_id': attempt.student.id,
            'student_name': attempt.student.user.full_name,
            'assessment_id': attempt.assessment.id,
            'assessment_title': attempt.assessment.title,
            'total_marks': attempt.assessment.total_marks,
            'marks_obtained': float(attempt.total_marks_obtained or 0),
            'percentage': float(attempt.percentage or 0),
            'status': attempt.status,
            'result': attempt.result_status,
            'started_at': attempt.started_at.isoformat() if attempt.started_at else None,
            'submitted_at': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            'answers': answers_data,
        }


class SkillComputationService:
    """
    Service for computing and updating student skill levels.

    Skill levels are determined by percentage thresholds:
    - 0-39%: NOT_ACQUIRED
    - 40-59%: BEGINNER
    - 60-79%: INTERMEDIATE
    - 80-100%: ADVANCED

    Skills are aggregated across all assessments that evaluate them.
    """

    # Global pass threshold (percentage) used to consider an attempt as passed
    GLOBAL_PASS_THRESHOLD = 50.0

    @staticmethod
    @transaction.atomic
    def compute_skills_for_attempt(attempt: StudentAssessmentAttempt) -> List[StudentSkill]:
        """
        Compute skill levels based on an assessment attempt.

        For each skill mapped to the assessment:
        1. Calculate weighted contribution
        2. Aggregate with previous attempts
        3. Update StudentSkill record

        Args:
            attempt: The evaluated StudentAssessmentAttempt

        Returns:
            List of updated StudentSkill records
        """
        if attempt.status != StudentAssessmentAttempt.AttemptStatus.EVALUATED:
            raise ValueError(
                "Attempt must be evaluated before computing skills")

        if attempt.percentage is None:
            return []

        updated_skills = []
        student = attempt.student
        assessment = attempt.assessment

        # Get all skill mappings for this assessment
        skill_mappings = AssessmentSkillMapping.objects.filter(
            assessment=assessment
        ).select_related('skill')

        for mapping in skill_mappings:
            skill = mapping.skill

            # Calculate this attempt's contribution to the skill
            contribution = float(attempt.percentage) * \
                (mapping.weight_percentage / 100)

            # Get or create StudentSkill
            student_skill, created = StudentSkill.objects.get_or_create(
                student=student,
                skill=skill,
                defaults={
                    'percentage_score': Decimal('0'),
                    'level': StudentSkill.SkillLevel.NOT_ACQUIRED,
                    'attempts_count': 0
                }
            )

            # Recompute skill score from all relevant attempts
            new_score = SkillComputationService._compute_aggregated_skill_score(
                student, skill
            )

            # Update skill record
            student_skill.percentage_score = Decimal(str(round(new_score, 2)))
            student_skill.level = StudentSkill.get_level_from_percentage(
                new_score)
            student_skill.attempts_count = SkillComputationService._count_skill_attempts(
                student, skill
            )
            student_skill.save()

            updated_skills.append(student_skill)

        return updated_skills

    @staticmethod
    def _compute_aggregated_skill_score(student, skill) -> float:
        """
        Compute aggregated skill score across all relevant assessment attempts.

        Uses weighted average where weight is the skill's weight_percentage
        in each assessment.

        Args:
            student: StudentProfile
            skill: Skill

        Returns:
            Aggregated percentage score
        """
        # Get all evaluated attempts for assessments that map to this skill
        relevant_attempts = StudentAssessmentAttempt.objects.filter(
            student=student,
            status=StudentAssessmentAttempt.AttemptStatus.EVALUATED,
            assessment__skill_mappings__skill=skill
        ).select_related('assessment').distinct()

        if not relevant_attempts.exists():
            return 0.0

        total_weighted_score = 0.0
        total_weight = 0.0

        for attempt in relevant_attempts:
            # Get the weight for this skill in this assessment
            mapping = AssessmentSkillMapping.objects.filter(
                assessment=attempt.assessment,
                skill=skill
            ).first()

            if not mapping:
                continue

            weight = mapping.weight_percentage

            # If attempt percentage missing, treat as 0
            attempt_pct = float(
                attempt.percentage) if attempt.percentage is not None else 0.0

            # Apply global pass threshold: if attempt < GLOBAL_PASS_THRESHOLD count as 0
            contribution_pct = attempt_pct if attempt_pct >= SkillComputationService.GLOBAL_PASS_THRESHOLD else 0.0

            # Weighted contribution uses percentage * (weight / 100)
            score_contribution = contribution_pct * (weight / 100)
            total_weighted_score += score_contribution
            total_weight += weight

        # Normalize the score to percentage
        if total_weight > 0:
            # (sum(weight * contribution_pct / 100) / total_weight) * 100 => returns percentage
            return (total_weighted_score / total_weight) * 100

        return 0.0

    @staticmethod
    def _count_skill_attempts(student, skill) -> int:
        """
        Count the number of assessment attempts contributing to a skill.

        Args:
            student: StudentProfile
            skill: Skill

        Returns:
            Count of attempts
        """
        return StudentAssessmentAttempt.objects.filter(
            student=student,
            status=StudentAssessmentAttempt.AttemptStatus.EVALUATED,
            assessment__skill_mappings__skill=skill
        ).distinct().count()

    @staticmethod
    def get_student_skills_summary(student) -> Dict:
        """
        Get a summary of all skills for a student.

        Args:
            student: StudentProfile

        Returns:
            Dictionary with skill summary
        """
        skills = StudentSkill.objects.filter(
            student=student
        ).select_related('skill', 'skill__course')

        summary = {
            'total_skills': skills.count(),
            'by_level': {
                'NOT_ACQUIRED': 0,
                'BEGINNER': 0,
                'INTERMEDIATE': 0,
                'ADVANCED': 0,
            },
            'skills': []
        }

        for student_skill in skills:
            summary['by_level'][student_skill.level] += 1
            summary['skills'].append({
                'skill_id': student_skill.skill.id,
                'skill_name': student_skill.skill.name,
                'course_name': student_skill.skill.course.name,
                'percentage': float(student_skill.percentage_score),
                'level': student_skill.level,
                'level_display': student_skill.get_level_display(),
                'attempts_count': student_skill.attempts_count,
                'last_updated': student_skill.last_updated.isoformat(),
            })

        return summary


class AssessmentResultsService:
    """
    Service for generating assessment result reports.
    """

    @staticmethod
    def get_assessment_results_summary(assessment: Assessment) -> Dict:
        """
        Get summary statistics for an assessment.

        Args:
            assessment: Assessment instance

        Returns:
            Dictionary with result statistics
        """
        from apps.batch_management.models import BatchStudent

        # Total students in batch
        total_students = BatchStudent.objects.filter(
            batch=assessment.batch,
            is_active=True
        ).count()

        # Get attempt statistics
        attempts = StudentAssessmentAttempt.objects.filter(
            assessment=assessment,
            status=StudentAssessmentAttempt.AttemptStatus.EVALUATED
        )

        attempt_count = attempts.count()

        if attempt_count == 0:
            return {
                'total_students': total_students,
                'attempted': 0,
                'not_attempted': total_students,
                'passed': 0,
                'failed': 0,
                'pass_rate': 0,
                'average_score': 0,
                'average_percentage': 0,
                'highest_score': 0,
                'lowest_score': 0,
            }

        # Calculate statistics
        stats = attempts.aggregate(
            avg_score=Avg('total_marks_obtained'),
            avg_percentage=Avg('percentage'),
            max_score=Max('total_marks_obtained'),
            min_score=Min('total_marks_obtained'),
        )

        # Count pass/fail
        passed = attempts.filter(
            percentage__gte=assessment.passing_percentage
        ).count()
        failed = attempt_count - passed

        return {
            'total_students': total_students,
            'attempted': attempt_count,
            'not_attempted': total_students - attempt_count,
            'passed': passed,
            'failed': failed,
            'pass_rate': round((passed / attempt_count * 100), 2) if attempt_count > 0 else 0,
            'average_score': float(stats['avg_score'] or 0),
            'average_percentage': float(stats['avg_percentage'] or 0),
            'highest_score': float(stats['max_score'] or 0),
            'lowest_score': float(stats['min_score'] or 0),
        }

    @staticmethod
    def get_all_student_results(assessment: Assessment) -> List[Dict]:
        """
        Get all student results for an assessment.

        Args:
            assessment: Assessment instance

        Returns:
            List of student result dictionaries
        """
        attempts = StudentAssessmentAttempt.objects.filter(
            assessment=assessment
        ).select_related(
            'student', 'student__user'
        ).order_by('-percentage')

        results = []
        for attempt in attempts:
            # Get skill impacts
            skill_impacts = []
            if attempt.status == StudentAssessmentAttempt.AttemptStatus.EVALUATED:
                for mapping in assessment.skill_mappings.select_related('skill'):
                    student_skill = StudentSkill.objects.filter(
                        student=attempt.student,
                        skill=mapping.skill
                    ).first()

                    if student_skill:
                        skill_impacts.append({
                            'skill_name': mapping.skill.name,
                            'new_level': student_skill.get_level_display(),
                            'percentage': float(student_skill.percentage_score),
                        })

            results.append({
                'id': attempt.id,
                'student': {
                    'id': attempt.student.id,
                    'full_name': attempt.student.user.full_name,
                    'email': attempt.student.user.email,
                },
                'assessment': {
                    'id': assessment.id,
                    'title': assessment.title,
                    'total_marks': assessment.total_marks,
                },
                'score': float(attempt.total_marks_obtained or 0),
                'percentage': float(attempt.percentage or 0),
                'status': attempt.result_status,
                'skill_impacts': skill_impacts,
                'submitted_at': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            })

        return results


class AssessmentStatusService:
    """
    Service for managing assessment status transitions.
    """

    @staticmethod
    @transaction.atomic
    def publish_assessment(assessment: Assessment) -> Assessment:
        """
        Publish an assessment (DRAFT -> SCHEDULED).

        Validates:
        - Assessment is in DRAFT status
        - Has at least one question
        - Total question marks equals assessment total marks
        - Has at least one correct answer per question

        Args:
            assessment: Assessment to publish

        Returns:
            Updated Assessment

        Raises:
            ValueError: If validation fails
        """
        if assessment.status != Assessment.Status.DRAFT:
            raise ValueError("Only draft assessments can be published")

        # Validate questions exist
        questions = assessment.questions.filter(is_active=True)
        if not questions.exists():
            raise ValueError("Assessment must have at least one question")

        # Validate total marks
        total_question_marks = questions.aggregate(
            total=Sum('marks')
        )['total'] or 0

        if total_question_marks != assessment.total_marks:
            raise ValueError(
                f"Total question marks ({total_question_marks}) must equal "
                f"assessment total marks ({assessment.total_marks})"
            )

        # Validate each question has exactly one correct answer
        for question in questions:
            correct_count = question.options.filter(is_correct=True).count()
            if correct_count != 1:
                raise ValueError(
                    f"Question '{question.question_text[:50]}...' must have exactly one correct answer"
                )

        # Update status
        assessment.status = Assessment.Status.SCHEDULED
        assessment.save(update_fields=['status', 'updated_at'])

        return assessment

    @staticmethod
    def update_assessment_statuses():
        """
        Batch update assessment statuses based on current time.

        Called periodically (e.g., via celery task or management command).
        - SCHEDULED -> ACTIVE when start_time is reached
        - ACTIVE -> COMPLETED when end_time is reached
        """
        now = timezone.now()

        # Activate scheduled assessments
        Assessment.objects.filter(
            status=Assessment.Status.SCHEDULED,
            start_time__lte=now,
            is_active=True
        ).update(status=Assessment.Status.ACTIVE)

        # Complete active assessments
        Assessment.objects.filter(
            status=Assessment.Status.ACTIVE,
            end_time__lte=now,
            is_active=True
        ).update(status=Assessment.Status.COMPLETED)
