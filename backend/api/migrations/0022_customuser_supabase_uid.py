from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ("api", "0021_cmsguideattachment_file_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="supabase_uid",
            field=models.CharField(max_length=255, null=True, blank=True),
        ),
    ]
