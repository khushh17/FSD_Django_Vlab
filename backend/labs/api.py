"""Small helpers for the JSON API: errors, request parsing, sign-in check, field validation."""

import functools
import json
import uuid

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .auth import read_admin_token, read_token
from .models import Student


class ApiError(Exception):
    def __init__(self, status, code, message):
        super().__init__(message)
        self.status, self.code, self.message = status, code, message


def bad(message, code="invalid"):
    return ApiError(400, code, message)


def endpoint(*methods, auth=True, roll_number=False):
    """
    Wraps a view: allows only `methods`, parses a JSON body into `request.data`, and with
    `auth=True` requires a student's "Authorization: Bearer <token>" (sets `request.student`);
    `auth="admin"` requires the admin's token instead (sets `request.admin`).
    `roll_number` also requires the student to have entered their roll number.
    The API uses tokens, not cookies, so Django's CSRF check does not apply.
    """

    def decorate(view):
        @csrf_exempt
        @functools.wraps(view)
        def wrapper(request, *args, **kwargs):
            try:
                if request.method not in methods:
                    raise ApiError(405, "method_not_allowed", f"Use {' or '.join(methods)}.")
                request.data = _parse_body(request)
                if auth == "admin":
                    request.admin = _signed_in_admin(request)
                elif auth:
                    request.student = _signed_in_student(request)
                    if roll_number and not request.student.roll_number:
                        raise ApiError(403, "roll_number_required", "Enter your roll number first.")
                return view(request, *args, **kwargs)
            except ApiError as err:
                return JsonResponse({"error": err.code, "message": err.message}, status=err.status)

        return wrapper

    return decorate


def _parse_body(request):
    if request.method != "POST":
        return {}
    try:
        data = json.loads(request.body or b"{}")
    except (ValueError, UnicodeDecodeError) as exc:
        raise bad("The request body is not valid JSON.") from exc
    if not isinstance(data, dict):
        raise bad("The request body must be a JSON object.")
    return data


def _bearer_token(request):
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise ApiError(401, "not_signed_in", "Please sign in.")
    return token.strip()


def _signed_in_admin(request):
    user = read_admin_token(_bearer_token(request))
    if user is None:
        raise ApiError(401, "not_signed_in", "Your admin sign-in has expired. Please sign in again.")
    return user


def _signed_in_student(request):
    pk = read_token(_bearer_token(request))
    student = Student.objects.filter(pk=pk).first() if pk is not None else None
    if student is None:
        raise ApiError(401, "not_signed_in", "Your sign-in has expired. Please sign in again.")
    # Update at most once a minute, not on every request.
    now = timezone.now()
    if student.last_seen_at is None or (now - student.last_seen_at).total_seconds() > 60:
        Student.objects.filter(pk=student.pk).update(last_seen_at=now)
        student.last_seen_at = now
    return student


# ---- field validators: each returns the clean value or raises ApiError(400) ----


def get_str(data, key, *, max_length, min_length=0, required=True):
    value = data.get(key, None if required else "")
    if not isinstance(value, str):
        raise bad(f"'{key}' must be text.")
    value = value.strip()
    if not min_length <= len(value) <= max_length:
        raise bad(f"'{key}' must be {min_length} to {max_length} characters.")
    return value


def get_int(data, key, *, min_value, max_value, allow_null=False):
    value = data.get(key)
    if value is None and allow_null:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or not min_value <= value <= max_value:
        raise bad(f"'{key}' must be a whole number from {min_value} to {max_value}.")
    return value


def get_bool(data, key, *, allow_null=False, default=None):
    value = data.get(key, default)
    if value is None and allow_null:
        return None
    if not isinstance(value, bool):
        raise bad(f"'{key}' must be true or false.")
    return value


def get_object(data, key, *, max_bytes=8000, required=True):
    value = data.get(key, None if required else {})
    if not isinstance(value, dict):
        raise bad(f"'{key}' must be a JSON object.")
    if len(json.dumps(value)) > max_bytes:
        raise bad(f"'{key}' is too large.")
    return value


def get_uuid(data, key):
    try:
        return uuid.UUID(str(data.get(key)))
    except ValueError as exc:
        raise bad(f"'{key}' must be a UUID.") from exc


def get_query_choice(request, key, choices, default=None):
    value = request.GET.get(key, default)
    if value not in choices:
        raise bad(f"'{key}' must be one of: {', '.join(map(str, choices))}.")
    return value


def get_choice(data, key, choices):
    value = data.get(key)
    if value not in choices:
        raise bad(f"'{key}' must be one of: {', '.join(map(str, choices))}.")
    return value
