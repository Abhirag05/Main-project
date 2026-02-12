# Generated migration for AssignmentSkillMapping

from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('assignments', '0004_add_assignment_start_date'),
        ('assessments', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AssignmentSkillMapping',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('weight_percentage', models.PositiveIntegerField(default=100, help_text='Weight of this skill in the assignment (1-100)', validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(100)])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assignment', models.ForeignKey(help_text='Assignment being mapped', on_delete=django.db.models.deletion.CASCADE, related_name='skill_mappings', to='assignments.assignment')),
                ('skill', models.ForeignKey(help_text='Skill being evaluated', on_delete=django.db.models.deletion.PROTECT, related_name='assignment_mappings', to='assessments.skill')),
            ],
            options={
                'verbose_name': 'Assignment Skill Mapping',
                'verbose_name_plural': 'Assignment Skill Mappings',
                'db_table': 'assignment_skill_mappings',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='assignmentskillmapping',
            constraint=models.UniqueConstraint(fields=['assignment', 'skill'], name='unique_assignment_skill'),
        ),
    ]
