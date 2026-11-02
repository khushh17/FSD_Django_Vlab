from django.db import migrations, models

import labs.models


def delete_students_without_roll_number(apps, schema_editor):
    # Only Google sign-ins that never entered a roll number; their records go with them.
    apps.get_model("labs", "Student").objects.filter(roll_number__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("labs", "0002_student_roll_login"),
    ]

    operations = [
        migrations.RunPython(delete_students_without_roll_number, migrations.RunPython.noop),
        migrations.RemoveField(model_name="student", name="google_sub"),
        migrations.RemoveField(model_name="student", name="email"),
        migrations.AlterModelOptions(name="student", options={"ordering": ["roll_number"]}),
        migrations.AlterField(
            model_name="student",
            name="roll_number",
            field=models.CharField(max_length=20, unique=True, validators=[labs.models.roll_number_validator]),
        ),
    ]
