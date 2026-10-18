"""Google sign-in and the API's sign-in tokens."""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.utils.crypto import constant_time_compare, salted_hmac

TOKEN_SALT = "labs.auth.token"
ADMIN_TOKEN_SALT = "labs.auth.admin-token"


class SignInError(Exception):
    """The Google credential was rejected. The message is safe to show to the student."""


def verify_google_credential(credential):
    """
    Check a Google ID token (the `credential` from Google's sign-in button) and return
    (google_sub, email, name). Raises SignInError if it is invalid or from another domain.
    """
    # Imported here so the rest of the app (and the tests) do not need network access.
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    if not settings.GOOGLE_CLIENT_ID:
        raise SignInError("Google sign-in is not set up on the server yet.")
    try:
        # Checks the signature, expiry, issuer and that the token was issued for our client ID.
        claims = id_token.verify_oauth2_token(credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
    except ValueError as exc:
        raise SignInError("Google sign-in failed. Please try again.") from exc

    domain = settings.ALLOWED_EMAIL_DOMAIN.lower()
    email = (claims.get("email") or "").lower()
    # `hd` is only present for Google Workspace accounts, so a personal Google account that
    # merely uses a university address is rejected too.
    if (
        not claims.get("email_verified")
        or (claims.get("hd") or "").lower() != domain
        or not email.endswith("@" + domain)
    ):
        raise SignInError(f"Please sign in with your @{domain} account.")
    return claims["sub"], email, claims.get("name", "")


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
