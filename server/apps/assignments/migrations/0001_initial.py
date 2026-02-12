# Generated migration

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
import apps.assignments.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('batch_management', '0001_initial'),
        ('academics', '0007_delete_subject_alter_coursemodule_unique_together'),
        ('students', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Assignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(help_text='Assignment instructions and requirements')),
                ('attachment', models.FileField(blank=True, help_text='Optional reference material or assignment document', null=True, upload_to=apps.assignments.models.faculty_assignment_upload_path)),
                ('max_marks', models.DecimalField(decimal_places=2, help_text='Maximum marks for this assignment', max_digits=6, validators=[django.core.validators.MinValueValidator(0)])),
                ('due_date', models.DateTimeField(help_text='Submission deadline')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True, help_text='Inactive assignments are hidden from students')),
                ('batch', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignments', to='batch_management.batch')),
                ('faculty', models.ForeignKey(limit_choices_to={'role__name': 'Faculty'}, on_delete=django.db.models.deletion.CASCADE, related_name='created_assignments', to=settings.AUTH_USER_MODEL)),
                ('module', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignments', to='academics.module')),
            ],
            options={
                'db_table': 'assignments',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AssignmentSubmission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('submission_file', models.FileField(help_text="Student's submitted work", upload_to=apps.assignments.models.submission_file_path)),
                ('submitted_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('marks_obtained', models.DecimalField(blank=True, decimal_places=2, help_text='Marks awarded by faculty', max_digits=6, null=True, validators=[django.core.validators.MinValueValidator(0)])),
                ('feedback', models.TextField(blank=True, help_text='Faculty feedback on submission')),
                ('evaluated_at', models.DateTimeField(blank=True, help_text='Timestamp when faculty evaluated the submission', null=True)),
                ('assignment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='submissions', to='assignments.assignment')),
                ('evaluated_by', models.ForeignKey(blank=True, limit_choices_to={'role__name': 'Faculty'}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='evaluated_submissions', to=settings.AUTH_USER_MODEL)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignment_submissions', to='students.studentprofile')),
            ],
            options={
                'db_table': 'assignment_submissions',
                'ordering': ['-submitted_at'],
            },
        ),
        migrations.AddIndex(
            model_name='assignment',
            index=models.Index(fields=['batch', 'module'], name='assignments_batch_i_5b0f19_idx'),
        ),
        migrations.AddIndex(
            model_name='assignment',
            index=models.Index(fields=['faculty'], name='assignments_faculty_dbc0dd_idx'),
        ),
        migrations.AddIndex(
            model_name='assignment',
            index=models.Index(fields=['due_date'], name='assignments_due_dat_e98df6_idx'),
        ),
        migrations.AddIndex(
            model_name='assignmentsubmission',
            index=models.Index(fields=['assignment', 'student'], name='assignment_assignm_e43fc9_idx'),
        ),
        migrations.AddIndex(
            model_name='assignmentsubmission',
            index=models.Index(fields=['student'], name='assignment_student_35f6dd_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='assignmentsubmission',
            unique_together={('assignment', 'student')},
        ),
    ]
