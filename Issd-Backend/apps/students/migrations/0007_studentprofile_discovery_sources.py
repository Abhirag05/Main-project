from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0006_studentprofile_referral_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentprofile",
            name="discovery_sources",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="How the student heard about the institute (e.g., Ads, YouTube)",
            ),
        ),
    ]
