"""
Settings for the Virtual Labs backend.

Every value that differs between your machine and the server comes from an environment
variable. Locally they are read from backend/.env (copy .env.example); on Vercel they are
set in the project's Environment Variables. backend/.env is git-ignored: never commit it.
"""

import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_env_file(path):
    """Minimal .env reader (KEY=value per line, # comments). Real environment variables win."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


_load_env_file(BASE_DIR / ".env")


def env(name, default=""):
    return os.environ.get(name, default)


def env_list(name, default=""):
    return [item.strip() for item in env(name, default).split(",") if item.strip()]


DEBUG = env("DJANGO_DEBUG") == "1"

SECRET_KEY = env("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is not 1.")
    SECRET_KEY = "dev-only-insecure-key"

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1" if DEBUG else "")
# On Vercel, also accept the deployment's own addresses (Vercel sets these variables).
for _name in ("VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"):
    if env(_name) and env(_name) not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(env(_name))

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "labs",
]

MIDDLEWARE = [
    "labs.middleware.CorsMiddleware",  # first, so preflight requests are answered before anything else
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# SQLite file locally; Postgres (Neon) when DATABASE_URL is set.
DATABASES = {
    "default": dj_database_url.parse(
        env("DATABASE_URL") or f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=0,  # serverless: no long-lived connections; use Neon's pooled URL
    )
}
if DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql":
    # Neon's pooled connection (PgBouncer, transaction mode) does not support server-side cursors.
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

# Vercel runs collectstatic during the build (because STATIC_ROOT is set) and serves the
# files, including the Django admin's CSS, from its CDN at STATIC_URL.
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
    SECURE_SSL_REDIRECT = env("DJANGO_SSL_REDIRECT", "1") == "1"  # Vercel already serves HTTPS only

# Errors go to the console, which Vercel shows in the project's Logs.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING"},
        # Not every 401/404 (students whose sign-in expired), only server errors.
        "django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False},
    },
}

# ---- Virtual Labs settings ----

# Sites allowed to call the API from the browser (the lab site's address).
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173" if DEBUG else ""
)

# Experiments that may send data. Each student adds their experiment's slug (from its meta.js).
LAB_EXPERIMENTS = ["django-request-response"]

# Google sign-in: the OAuth client ID from Google Cloud Console (TODO: create one).
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID")
# Only Google Workspace accounts on this domain may sign in. TODO: confirm the students' domain.
ALLOWED_EMAIL_DOMAIN = env("ALLOWED_EMAIL_DOMAIN", "somaiya.edu")

# Roll-number sign-in: every student uses their roll number and this one class password.
# Set it in backend/.env (and in Vercel's settings); empty switches roll-number sign-in off.
STUDENT_SHARED_PASSWORD = env("STUDENT_SHARED_PASSWORD")
# Wrong passwords allowed per visitor address in STUDENT_LOCKOUT_SECONDS.
STUDENT_MAX_FAILED_LOGINS = 10
STUDENT_LOCKOUT_SECONDS = 15 * 60

# Sign-in tokens expire after this many seconds; the student then signs in again.
AUTH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60

# The admin pages' sign-in lasts this long (seconds).
ADMIN_TOKEN_MAX_AGE = 12 * 60 * 60
# Admin sign-in: after this many wrong passwords for one username, wait ADMIN_LOCKOUT_SECONDS.
ADMIN_MAX_FAILED_LOGINS = 5
ADMIN_LOCKOUT_SECONDS = 15 * 60

# Local testing without Google: POST /api/auth/dev signs in any email. Never on the server:
# it needs both DEBUG and DEV_LOGIN=1.
DEV_LOGIN = DEBUG and env("DEV_LOGIN") == "1"
