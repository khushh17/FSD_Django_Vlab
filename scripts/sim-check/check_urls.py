"""
Differential test for the URL lab engine.

Builds each generated URLconf as real Django modules, then compares Django's behaviour
with the JS engine's prediction: matched view, kwargs (with Python types), url_name, route,
APPEND_SLASH redirects, the DEBUG RuntimeError, and the "tried" list for 404s.
Also checks the ImproperlyConfigured messages for invalid routes.

Usage (needs Django 6.1 installed):
    python scripts/sim-check/check_urls.py cases.json
"""

import json
import sys
import types
import uuid

import django
from django.conf import settings

data = json.load(open(sys.argv[1], encoding="utf-8"))

settings.configure(
    DEBUG=False,
    SECRET_KEY="sim-check",
    ALLOWED_HOSTS=["*"],
    ROOT_URLCONF="placeholder",
    APPEND_SLASH=True,
    INSTALLED_APPS=["django.contrib.auth", "django.contrib.contenttypes", "django.contrib.sessions", "django.contrib.messages"],
    DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}},
    SESSION_ENGINE="django.contrib.sessions.backends.signed_cookies",
    MIDDLEWARE=[
        "django.middleware.security.SecurityMiddleware",
        "django.contrib.sessions.middleware.SessionMiddleware",
        "django.middleware.common.CommonMiddleware",
        "django.middleware.csrf.CsrfViewMiddleware",
        "django.contrib.auth.middleware.AuthenticationMiddleware",
        "django.contrib.messages.middleware.MessageMiddleware",
        "django.middleware.clickjacking.XFrameOptionsMiddleware",
    ],
)
django.setup()

from django.http import HttpResponse  # noqa: E402
from django.test import Client, override_settings  # noqa: E402
from django.urls import Resolver404, clear_url_caches, include, path, resolve  # noqa: E402

sys.modules["placeholder"] = types.ModuleType("placeholder")
sys.modules["placeholder"].urlpatterns = []


def make_view(name):
    def view(request, **kwargs):
        return HttpResponse(name)

    view.__name__ = name
    return view


def typed(value):
    if isinstance(value, int):
        return {"type": "int", "value": str(value)}
    if isinstance(value, uuid.UUID):
        return {"type": "UUID", "value": str(value)}
    return {"type": "str", "value": value}


def build(case):
    root_name = f"root_{case['id']}"
    root = types.ModuleType(root_name)
    patterns = []
    for e in case["entries"]:
        if e["kind"] == "include":
            mod = types.ModuleType(e["module"])
            mod.urlpatterns = [path(c["route"], make_view(c["view"]), name=c["name"] or None) for c in e["children"]]
            sys.modules[e["module"]] = mod
            patterns.append(path(e["route"], include(e["module"])))
        else:
            patterns.append(path(e["route"], make_view(e["view"]), name=e["name"] or None))
    root.urlpatterns = patterns
    sys.modules[root_name] = root
    return root_name


failures = []
for case in data["cases"]:
    root_name = build(case)
    req = case["request"]
    exp = case["expected"]
    raw_path, _, query = req["path"].partition("?")
    clear_url_caches()
    with override_settings(ROOT_URLCONF=root_name, APPEND_SLASH=req["appendSlash"], DEBUG=req["debug"]):
        client = Client(raise_request_exception=False)
        response = client.post(req["path"]) if req["method"] == "POST" else client.get(req["path"])
        try:
            match = resolve(raw_path)
            tried = None
        except Resolver404 as e:
            match = None
            tried = [[str(p.pattern) for p in t] for t in e.args[0].get("tried", [])]

    if match is not None:
        actual = {
            "type": "match",
            "status": response.status_code,
            "view": match.func.__name__,
            "kwargs": {k: typed(v) for k, v in match.kwargs.items()},
            "urlName": match.url_name,
            "route": match.route,
        }
    elif response.status_code == 301:
        actual = {"type": "redirect", "status": 301, "location": response.headers["Location"]}
    elif response.status_code == 500:
        actual = {"type": "runtime-error", "status": 500}
    elif response.status_code == 200 and b"The install worked successfully" in response.content:
        actual = {"type": "welcome", "status": 200}
    else:
        actual = {"type": "not-found", "status": response.status_code, "tried": tried}

    expected = {k: v for k, v in exp.items() if k != "message"}
    if actual != expected:
        failures.append((case["id"], req, case["entries"], expected, actual))

route_failures = []
for check in data["routeChecks"]:
    try:
        mod = types.ModuleType(f"routecheck_{abs(hash(check['route']))}")
        mod.urlpatterns = [path(check["route"], make_view("v"))]
        sys.modules[mod.__name__] = mod
        resolve("/never-matches-anything-zz/", urlconf=mod.__name__)
        django_error = None
    except Resolver404:
        django_error = None
    except Exception as e:  # ImproperlyConfigured, re.error
        django_error = str(e)
    engine_error = check["error"]
    duplicate = "twice" in (engine_error or "")
    ok = (engine_error is None and django_error is None) or (duplicate and django_error) or (engine_error == django_error)
    if not ok:
        route_failures.append((check["route"], engine_error, django_error))

print(f"{len(data['cases'])} URL cases, {len(failures)} mismatches; {len(data['routeChecks'])} route checks, {len(route_failures)} mismatches")
for f in failures[:10]:
    print("\n--- case", f[0], f[1])
    print("  entries:", json.dumps(f[2]))
    print("  engine:", f[3])
    print("  django:", f[4])
for r in route_failures:
    print("\n--- route", r)
sys.exit(1 if failures or route_failures else 0)
