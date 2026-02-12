from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ("api", "0035_alter_researcherrequest_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="researcherrequest",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
    ]
