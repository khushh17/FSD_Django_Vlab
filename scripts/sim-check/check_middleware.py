"""
Differential test for the Middleware lab engine.

Runs every case produced by generate-middleware-cases.mjs through real Django and compares
the result with the JS engine's prediction: middleware/hook call order, status code, whether
the view ran, which template rendered, printed lines, key headers and the exception type.

Usage (needs Django 6.1 installed):
    python scripts/sim-check/check_middleware.py cases.json
"""

import builtins
import json
import sys
import types

import django
from django.conf import settings

data = json.load(open(sys.argv[1], encoding="utf-8"))

TOKENS = []
PRINTS = []


def sim_print(*args, **kwargs):
    PRINTS.append(" ".join(str(a) for a in args))


settings.configure(
    DEBUG=False,
    SECRET_KEY="sim-check",
    ALLOWED_HOSTS=["*"],
    ROOT_URLCONF="simurls",
    INSTALLED_APPS=[
        "django.contrib.auth",
        "django.contrib.contenttypes",
        "django.contrib.sessions",
        "django.contrib.messages",
    ],
    DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}},
    SESSION_ENGINE="django.contrib.sessions.backends.signed_cookies",
    TEMPLATES=[
        {
            "BACKEND": "django.template.backends.django.DjangoTemplates",
            "OPTIONS": {
                "loaders": [
                    (
                        "django.template.loaders.locmem.Loader",
                        {
                            "blog/post_detail.html": "Post {{ post.title }}",
                            "blog/post_detail_v2.html": "V2 {{ post.title }}",
                        },
                    )
                ]
            },
        }
    ],
    MIDDLEWARE=[],
)
django.setup()

from django.core.signals import got_request_exception  # noqa: E402
from django.test import Client, override_settings  # noqa: E402
from django.urls import path  # noqa: E402
from django.utils.module_loading import import_string  # noqa: E402

LAST_EXC = []
got_request_exception.connect(lambda **kw: LAST_EXC.append(sys.exc_info()[0].__name__), weak=False)


def wrap(cls, name):
    """Subclass that records __call__ entry/exit and hook calls, then defers to cls."""
    attrs = {}

    def __call__(self, request):
        TOKENS.append(f"{name} in")
        try:
            response = cls.__call__(self, request)
        except Exception:
            TOKENS.append(f"{name} raised")
            raise
        TOKENS.append(f"{name} out")
        return response

    attrs["__call__"] = __call__
    for hook in ("process_view", "process_exception", "process_template_response"):
        if hasattr(cls, hook):
            original = getattr(cls, hook)

            def make(original, hook):
                def method(self, *args):
                    TOKENS.append(f"{name} {hook}")
                    return original(self, *args)

                return method

            attrs[hook] = make(original, hook)
    return type(name, (cls,), attrs)


# Build the middleware classes under importable paths: sim_mw.<Name>
sim_mw = types.ModuleType("sim_mw")
sys.modules["sim_mw"] = sim_mw
for name, info in data["middleware"].items():
    if info["builtin"]:
        cls = import_string(info["path"])
    else:
        ns = {"print": sim_print}
        exec(info["code"], ns)  # the exact code shown to students
        cls = ns[name]
    setattr(sim_mw, name, wrap(cls, name))

# Views: the exact code shown to students
VIEWS = {}
for key, code in data["views"].items():
    ns = {"print": sim_print}
    exec(code, ns)
    VIEWS[key] = ns["post_detail"]
CURRENT = {"view": None}


def dispatch_view(request, pk):
    TOKENS.append("VIEW")
    return CURRENT["view"](request, pk)


dispatch_view.__name__ = "post_detail"
simurls = types.ModuleType("simurls")
simurls.urlpatterns = [path("blog/<int:pk>/", dispatch_view, name="post-detail")]
sys.modules["simurls"] = simurls

HEADER_KEYS = ["Content-Type", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Cross-Origin-Opener-Policy", "Allow"]
SECRET = "a" * 32

failures = []
for case in data["cases"]:
    cfg = case["config"]
    TOKENS.clear()
    PRINTS.clear()
    LAST_EXC.clear()
    CURRENT["view"] = VIEWS[cfg["view"]]
    req = data["requests"][cfg["request"]]
    with override_settings(MIDDLEWARE=[f"sim_mw.{n}" for n in cfg["middleware"]]):
        client = Client(enforce_csrf_checks=True, raise_request_exception=False)
        extra = {}
        if req["method"] == "POST":
            client.cookies["csrftoken"] = SECRET
            if req["csrfToken"]:
                extra["HTTP_X_CSRFTOKEN"] = SECRET
            response = client.post(req["path"], {"comment": "hi"}, **extra)
        else:
            response = client.get(req["path"])

    content = b"" if getattr(response, "streaming", False) else response.content
    template = None
    if content.startswith(b"Post Django tips"):
        template = "blog/post_detail.html"
    elif content.startswith(b"V2 Django tips"):
        template = "blog/post_detail_v2.html"
    actual = {
        "tokens": list(TOKENS),
        "status": response.status_code,
        "viewCalled": "VIEW" in TOKENS,
        "template": template,
        "prints": list(PRINTS),
        "headers": {k: response.headers[k] for k in HEADER_KEYS if k in response.headers},
        "error": None,
    }
    # The engine reports the exception that produced an error page; Django reports uncaught
    # exceptions (500) through got_request_exception. 404s from Http404/Resolver404 are not
    # "uncaught", so compare the error type only for handler500 responses.
    expected = dict(case["expected"])
    if response.status_code == 500 and LAST_EXC:
        actual["error"] = LAST_EXC[-1]
    if expected["error"] in ("Http404", "Resolver404") or not (response.status_code == 500 and LAST_EXC):
        expected["error"] = None
        actual["error"] = None
    if actual != expected:
        failures.append((case["id"], cfg, expected, actual))

print(f"{len(data['cases'])} cases, {len(failures)} mismatches")
for cid, cfg, exp, act in failures[:15]:
    print("\n--- case", cid, cfg)
    for key in exp:
        if exp[key] != act[key]:
            print(f"  {key}:\n    engine: {exp[key]}\n    django: {act[key]}")
sys.exit(1 if failures else 0)
