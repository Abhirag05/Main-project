from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0005_studentprofile_study_mode"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentprofile",
            name="referral_code",
            field=models.CharField(
                blank=True,
                help_text="Unique referral code for the student",
                max_length=12,
                null=True,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="referred_by",
            field=models.ForeignKey(
                blank=True,
                help_text="Referring student profile (if any)",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="referrals",
                to="students.studentprofile",
            ),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="referral_confirmed",
            field=models.BooleanField(
                default=False,
                help_text="Whether the referral was confirmed by Finance",
            ),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="referral_confirmed_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When the referral was confirmed",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="referral_confirmed_count",
            field=models.PositiveIntegerField(
                default=0,
                help_text="Count of confirmed referrals for this student",
            ),
        ),
    ]
