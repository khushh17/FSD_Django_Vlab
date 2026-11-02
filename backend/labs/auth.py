"""Sign-in tokens for students (roll number sign-in) and for the admin."""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.utils.crypto import constant_time_compare, salted_hmac

TOKEN_SALT = "labs.auth.token"
ADMIN_TOKEN_SALT = "labs.auth.admin-token"


def make_token(student):
    return signing.dumps({"s": student.pk}, salt=TOKEN_SALT, compress=True)


def read_token(token):
    """Student primary key from a token, or None if it is invalid or expired."""
    try:
        data = signing.loads(token, salt=TOKEN_SALT, max_age=settings.AUTH_TOKEN_MAX_AGE)
    except signing.BadSignature:  # includes SignatureExpired
        return None
    return data.get("s")


# ---- the admin (the professor's Django superuser account) ----


def _password_fingerprint(user):
    # Part of the token: changing the password signs the admin out everywhere.
    return salted_hmac("labs.auth.admin-password", user.password).hexdigest()[:20]


def make_admin_token(user):
    return signing.dumps({"u": user.pk, "p": _password_fingerprint(user)}, salt=ADMIN_TOKEN_SALT)


def read_admin_token(token):
    """The admin user for a token, or None if it is invalid, expired or no longer an admin."""
    try:
        data = signing.loads(token, salt=ADMIN_TOKEN_SALT, max_age=settings.ADMIN_TOKEN_MAX_AGE)
    except signing.BadSignature:
        return None
    user = get_user_model().objects.filter(pk=data.get("u"), is_active=True, is_superuser=True).first()
    if user is None or not constant_time_compare(data.get("p", ""), _password_fingerprint(user)):
        return None
    return user
