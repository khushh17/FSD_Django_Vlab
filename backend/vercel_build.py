"""
Build step on Vercel (see pyproject.toml). Vercel does not run database migrations, so:

  * Production deployments apply migrations to the database (DATABASE_URL).
  * If DJANGO_SUPERUSER_USERNAME, DJANGO_SUPERUSER_EMAIL and DJANGO_SUPERUSER_PASSWORD are
    set in the Vercel project, the professor's admin account is created once (an existing
    account is left alone). Remove the password variable after the first deploy.

Preview deployments change nothing, so a test branch cannot alter the real database.
"""

import os
import sys

import django
from django.core.management import call_command


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    if os.environ.get("VERCEL_ENV") != "production":
        print("vercel_build: not a production deployment; skipping migrations.")
        return
    if not os.environ.get("DATABASE_URL"):
        sys.exit("vercel_build: DATABASE_URL is not set. Connect the Neon database to this project first.")
    django.setup()
    call_command("migrate", interactive=False)

    username = os.environ.get("DJANGO_SUPERUSER_USERNAME")
    if username and os.environ.get("DJANGO_SUPERUSER_PASSWORD"):
        from django.contrib.auth import get_user_model

        if get_user_model().objects.filter(username=username).exists():
            print(f"vercel_build: admin '{username}' already exists; left unchanged.")
        else:
            # Reads the password and email from DJANGO_SUPERUSER_PASSWORD / _EMAIL.
            call_command("createsuperuser", interactive=False, username=username)
            print(f"vercel_build: created admin '{username}'.")


if __name__ == "__main__":
    main()
