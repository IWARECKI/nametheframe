"""Idempotently create/update an admin superuser from environment variables.

Reads:
    DJANGO_SUPERUSER_EMAIL     (required to do anything)
    DJANGO_SUPERUSER_PASSWORD  (required to do anything)
    DJANGO_SUPERUSER_USERNAME  (optional; defaults to the email)

Safe to run on every deploy: if the env vars are absent it does nothing,
and if the user already exists it only refreshes the password/flags.

Usage (Railway → service → Console, or one-off):
    python manage.py ensure_superuser
"""
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Create or update a superuser from DJANGO_SUPERUSER_* env vars.'

    def handle(self, *args, **options):
        email    = os.environ.get('DJANGO_SUPERUSER_EMAIL')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME') or email

        if not email or not password:
            self.stdout.write('ensure_superuser: DJANGO_SUPERUSER_EMAIL/PASSWORD not set — skipping.')
            return

        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=username,
            defaults={'email': email},
        )
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()

        verb = 'Created' if created else 'Updated'
        self.stdout.write(self.style.SUCCESS(f'ensure_superuser: {verb} superuser {username!r}.'))
