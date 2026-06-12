from django.db import migrations


def set_site(apps, schema_editor):
    Site = apps.get_model('sites', 'Site')
    Site.objects.update_or_create(
        id=1, defaults={'domain': 'nametheframe.com', 'name': 'Name the Frame'})


def revert_site(apps, schema_editor):
    Site = apps.get_model('sites', 'Site')
    Site.objects.filter(id=1).update(domain='example.com', name='example.com')


class Migration(migrations.Migration):
    dependencies = [
        ('game', '0002_blockedfilm_framereport_blockedbackdrop'),
        ('sites', '0002_alter_domain_unique'),
    ]
    operations = [migrations.RunPython(set_site, revert_site)]
