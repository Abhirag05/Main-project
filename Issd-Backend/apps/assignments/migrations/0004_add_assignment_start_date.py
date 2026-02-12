from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('assignments', '0003_remove_assignment_attachment_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='assignment',
            name='start_date',
            field=models.DateTimeField(default=django.utils.timezone.now, help_text='When the assignment becomes visible to students'),
        ),
        migrations.AddIndex(
            model_name='assignment',
            index=models.Index(fields=['start_date'], name='assignment_start_date_idx'),
        ),
    ]
