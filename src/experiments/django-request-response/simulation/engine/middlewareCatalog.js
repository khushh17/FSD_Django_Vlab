/*
 * Catalogue for the Middleware lab: middleware, requests and views a student can choose.
 *
 * The `code` strings are shown to students AND executed by the differential test
 * (scripts/sim-check), so what students read is exactly what was verified on Django.
 * Behaviour of the built-in middleware follows the Django 6.1 source; see middlewareEngine.js.
 */

export const DEFAULT_MIDDLEWARE = [
  'SecurityMiddleware',
  'SessionMiddleware',
  'CommonMiddleware',
  'CsrfViewMiddleware',
  'AuthenticationMiddleware',
  'MessageMiddleware',
  'XFrameOptionsMiddleware',
]

export const MIDDLEWARE = {
  SecurityMiddleware: {
    path: 'django.middleware.security.SecurityMiddleware',
    builtin: true,
    summary: 'Adds security headers to every response (HTTPS redirect is off by default).',
  },
  SessionMiddleware: {
    path: 'django.contrib.sessions.middleware.SessionMiddleware',
    builtin: true,
    summary: 'Attaches request.session on the way in; saves the session on the way out.',
  },
  CommonMiddleware: {
    path: 'django.middleware.common.CommonMiddleware',
    builtin: true,
    summary: 'APPEND_SLASH / PREPEND_WWW redirects and Content-Length.',
  },
  CsrfViewMiddleware: {
    path: 'django.middleware.csrf.CsrfViewMiddleware',
    builtin: true,
    summary: 'Checks the CSRF token of unsafe requests (POST…) in process_view().',
  },
  AuthenticationMiddleware: {
    path: 'django.contrib.auth.middleware.AuthenticationMiddleware',
    builtin: true,
    summary: 'Sets request.user from the session. Needs SessionMiddleware above it.',
  },
  MessageMiddleware: {
    path: 'django.contrib.messages.middleware.MessageMiddleware',
    builtin: true,
    summary: 'Enables the messages framework. Needs SessionMiddleware above it (default storage).',
  },
  XFrameOptionsMiddleware: {
    path: 'django.middleware.clickjacking.XFrameOptionsMiddleware',
    builtin: true,
    summary: 'Adds X-Frame-Options: DENY to every response.',
  },

  LoggingMiddleware: {
    path: 'blog.middleware.LoggingMiddleware',
    builtin: false,
    summary: 'Prints when the request comes in and when the response goes out.',
    code: `class LoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        print("LoggingMiddleware: request in")
        response = self.get_response(request)
        print(f"LoggingMiddleware: response out ({response.status_code})")
        return response`,
  },
  MaintenanceMiddleware: {
    path: 'blog.middleware.MaintenanceMiddleware',
    builtin: false,
    summary: 'Returns 503 at once, without calling get_response (a short-circuit).',
    code: `from django.http import HttpResponse


class MaintenanceMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        print("MaintenanceMiddleware: site is down, returning 503")
        return HttpResponse("Down for maintenance", status=503)`,
  },
  ReadOnlyMiddleware: {
    path: 'blog.middleware.ReadOnlyMiddleware',
    builtin: false,
    summary: 'process_view() refuses POST requests with 405.',
    code: `from django.http import HttpResponseNotAllowed


class ReadOnlyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_view(self, request, view_func, view_args, view_kwargs):
        if request.method == "POST":
            print("ReadOnlyMiddleware.process_view: POST refused")
            return HttpResponseNotAllowed(["GET"])
        return None`,
  },
  FriendlyErrorMiddleware: {
    path: 'blog.middleware.FriendlyErrorMiddleware',
    builtin: false,
    summary: 'process_exception() turns any exception from the view into a friendly 500 page.',
    code: `from django.http import HttpResponse


class FriendlyErrorMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        print(f"FriendlyErrorMiddleware.process_exception: {type(exception).__name__}")
        return HttpResponse("Sorry, something went wrong.", status=500)`,
  },
  TemplateSwapMiddleware: {
    path: 'blog.middleware.TemplateSwapMiddleware',
    builtin: false,
    summary: 'process_template_response() switches a TemplateResponse to another template.',
    code: `class TemplateSwapMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_template_response(self, request, response):
        print("TemplateSwapMiddleware: switching to post_detail_v2.html")
        response.template_name = "blog/post_detail_v2.html"
        return response`,
  },
}

export const REQUESTS = {
  get: { label: 'GET /blog/42/', method: 'GET', path: '/blog/42/', csrfToken: false },
  postToken: { label: 'POST /blog/42/ with a valid CSRF token', method: 'POST', path: '/blog/42/', csrfToken: true },
  postNoToken: { label: 'POST /blog/42/ without a CSRF token', method: 'POST', path: '/blog/42/', csrfToken: false },
  missing: { label: 'GET /missing/ (no URL pattern matches)', method: 'GET', path: '/missing/', csrfToken: false },
}

// URLconf used by the Middleware lab: only blog/<int:pk>/ exists.
export const LAB_URLCONF = `urlpatterns = [
    path("blog/<int:pk>/", views.post_detail, name="post-detail"),
]`

export const VIEWS = {
  render: {
    label: 'Returns render(...)',
    code: `from django.shortcuts import render


def post_detail(request, pk):
    post = {"pk": pk, "title": "Django tips"}
    return render(request, "blog/post_detail.html", {"post": post})`,
  },
  templateResponse: {
    label: 'Returns a TemplateResponse',
    code: `from django.template.response import TemplateResponse


def post_detail(request, pk):
    post = {"pk": pk, "title": "Django tips"}
    return TemplateResponse(request, "blog/post_detail.html", {"post": post})`,
  },
  http404: {
    label: 'Raises Http404',
    code: `from django.http import Http404


def post_detail(request, pk):
    raise Http404("No Post matches the given query.")`,
  },
  bug: {
    label: 'Has a bug (raises ValueError)',
    code: `def post_detail(request, pk):
    year = int("twenty-twenty")  # ValueError
    return None`,
  },
  noReturn: {
    label: 'Forgets to return a response',
    code: `from django.shortcuts import render


def post_detail(request, pk):
    post = {"pk": pk, "title": "Django tips"}
    render(request, "blog/post_detail.html", {"post": post})`,
  },
}

export const CUSTOM_MIDDLEWARE = Object.keys(MIDDLEWARE).filter((k) => !MIDDLEWARE[k].builtin)
