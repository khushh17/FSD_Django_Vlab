/*
 * Posttest question bank.
 *
 * Shape: { id, topic, levels, question, code?, options, answer, explanation, source }
 *   topic:  wsgi | request | middleware | urls | view | response | errors
 *   levels: any of easy | medium | hard (shared questions list several)
 *   answer: index into options (as authored; the quiz may shuffle options on retake)
 *   Text may use `code` and **bold**.
 *
 * Every behavioural answer (redirects, status codes, which hooks run, which view is called)
 * was checked by running the scenario on Django 6.1.1. Every source URL was checked to
 * resolve on 2026-10-04 (Django "stable" = 6.1).
 *
 * Levels: easy = recall, medium = apply or predict, hard = code reading and edge cases.
 * Seed questions 1-7 from the brief are used word for word.
 */

const DOCS = 'https://docs.djangoproject.com/en/stable'
const SRC = 'https://github.com/django/django/blob/stable/6.1.x/django'

export const posttestBank = [
  /* ---------------- Seed questions (word for word) ---------------- */
  {
    id: 'mw-order-01',
    topic: 'middleware',
    levels: ['easy', 'medium', 'hard'],
    question: 'In what order does Django run the middleware in `MIDDLEWARE` while handling the **request**?',
    options: [
      'Bottom to top (the response is processed top to bottom)',
      'Top to bottom (the response is processed bottom to top)',
      'Top to bottom for both the request and the response',
      'In alphabetical order of the class names',
    ],
    answer: 1,
    explanation:
      'During the request phase Django applies middleware in the order of `MIDDLEWARE`, top to bottom; the response then passes back through the same layers in reverse, like the layers of an onion. “Top to bottom for both” is tempting, but the way out is always the reverse of the way in.',
    source: `${DOCS}/topics/http/middleware/`,
  },
  {
    id: 'urls-root-urlconf-01',
    topic: 'urls',
    levels: ['easy', 'medium'],
    question: 'Which setting tells Django which URLconf module to start matching from?',
    options: ['`WSGI_APPLICATION`', '`APPEND_SLASH`', '`ROOT_URLCONF`', '`URLCONF_MODULE`'],
    answer: 2,
    explanation:
      '`ROOT_URLCONF` names the root URLconf, for example `"mysite.urls"` (a middleware can override it for one request by setting `request.urlconf`). `WSGI_APPLICATION` is tempting because it also names a module path, but it points to the WSGI application object that `runserver` uses, not to URL patterns. `URLCONF_MODULE` is not a Django setting.',
    source: `${DOCS}/topics/http/urls/`,
  },
  {
    id: 'mw-short-circuit-01',
    topic: 'middleware',
    levels: ['medium', 'hard'],
    question: '`MIDDLEWARE = [A, B, C]`. B returns an `HttpResponse` without calling `get_response`. What runs?',
    options: [
      'A, B, C and the view all run, because Django always calls every middleware.',
      "A's request code, then B. The response goes back out through C, B and A.",
      'Only B runs; A is skipped because B produced the response.',
      "A's request code, then B. The response goes back out through A. C and the view never run.",
    ],
    answer: 3,
    explanation:
      'A middleware that returns without calling `get_response` short-circuits the onion: the layers inside it (C) and the view never see the request, and the response goes back out only through the layers the request already passed (A). Sending the response out through C as well is tempting, but C was never entered, so it has nothing to unwind.',
    source: `${DOCS}/topics/http/middleware/`,
  },
  {
    id: 'urls-append-slash-01',
    topic: 'urls',
    levels: ['medium'],
    question:
      '`urlpatterns = [path("blog/<int:year>/", archive)]`, `APPEND_SLASH = True`, `CommonMiddleware` is enabled. A GET request is made for `/blog/2024`. Result?',
    options: [
      'A permanent redirect to `/blog/2024/`.',
      '404 Not Found, because the pattern requires a trailing slash.',
      '`archive(request, year=2024)` is called directly.',
      'A `RuntimeError`, because `APPEND_SLASH` cannot redirect.',
    ],
    answer: 0,
    explanation:
      '`/blog/2024` matches no pattern, but `/blog/2024/` would, so `CommonMiddleware` replaces the 404 with a permanent redirect (301) to the slashed URL. A plain 404 is tempting, and it is what you get with `APPEND_SLASH = False`. The `RuntimeError` happens only for POST, PUT, PATCH or DELETE requests when `DEBUG` is `True`.',
    source: `${DOCS}/ref/middleware/`,
  },
  {
    id: 'mw-template-response-01',
    topic: 'middleware',
    levels: ['hard'],
    question: 'When is `process_template_response()` called?',
    options: [
      'For every response, just after the view returns.',
      'Only when the view uses the `render()` shortcut.',
      'Only when the response has a `render()` method, e.g. a `TemplateResponse`.',
      'Before the view is called, so that it can choose the template.',
    ],
    answer: 2,
    explanation:
      'Django calls `process_template_response()` after the view, and only if the response object has a `render()` method, which marks it as a `TemplateResponse` or equivalent. The `render()` shortcut is the tempting answer, but it returns an ordinary, already-rendered `HttpResponse`, which has no `render()` method, so the hook is not called.',
    source: `${DOCS}/topics/http/middleware/`,
  },
  {
    id: 'mw-auth-after-session-01',
    topic: 'middleware',
    levels: ['hard'],
    question: 'Why must `AuthenticationMiddleware` come after `SessionMiddleware`?',
    options: [
      'It reads the user from `request.session`, which `SessionMiddleware` sets up.',
      '`SessionMiddleware` needs `request.user` in order to create the session.',
      '`AuthenticationMiddleware` must see the response before `SessionMiddleware` saves it.',
      'It does not matter; Django reorders the built-in middleware automatically.',
    ],
    answer: 0,
    explanation:
      '`AuthenticationMiddleware` sets `request.user` from data stored in the session, so `request.session` must already exist, and `SessionMiddleware` is what creates it. The reverse dependency is tempting but wrong: sessions work without authentication. Django never reorders `MIDDLEWARE`; the list order is the order of execution.',
    source: `${DOCS}/ref/middleware/`,
  },
  {
    id: 'view-returns-none-01',
    topic: 'view',
    levels: ['hard'],
    question: 'A view function ends without a `return` statement. What happens?',
    options: [
      'Django returns an empty 200 OK response.',
      'Django returns 404 Not Found.',
      'Django renders the template whose name matches the view.',
      "Django raises `ValueError` because the view didn't return an `HttpResponse`.",
    ],
    answer: 3,
    explanation:
      'A function without `return` returns `None`, and Django checks the result: it raises `ValueError` (“…didn’t return an HttpResponse object. It returned None instead.”), which becomes a 500 response. An empty 200 response is tempting, but Django never invents a response for a view.',
    source: `${SRC}/core/handlers/base.py`,
  },

  /* ---------------- Easy ---------------- */
  {
    id: 'wsgi-application-01',
    topic: 'wsgi',
    levels: ['easy'],
    question:
      'In a project created by `django-admin startproject mysite`, what does a WSGI server such as Gunicorn load to run the site?',
    options: [
      '`main()` in `manage.py`',
      '`application` in `mysite/wsgi.py`',
      '`urlpatterns` in `mysite/urls.py`',
      '`MIDDLEWARE` in `mysite/settings.py`',
    ],
    answer: 1,
    explanation:
      'A WSGI server is pointed at the module-level callable `application` in `mysite/wsgi.py` (for example `gunicorn mysite.wsgi`). `manage.py` is tempting because it starts the development server, but it is a command-line tool, not the WSGI entry point.',
    source: `${DOCS}/howto/deployment/wsgi/`,
  },
  {
    id: 'wsgi-runserver-01',
    topic: 'wsgi',
    levels: ['easy'],
    question: 'What is `python manage.py runserver` meant for?',
    options: [
      'Serving the site in production behind Nginx',
      'Compiling templates before deployment',
      'Local development only; it is not meant for production',
      'Applying database migrations',
    ],
    answer: 2,
    explanation:
      '`runserver` starts a lightweight development server. The Django documentation says not to use it in production because it has not gone through security audits or performance tests. Production sites run Django under a WSGI or ASGI server such as Gunicorn or Uvicorn, usually behind a web server like Nginx.',
    source: `${DOCS}/ref/django-admin/`,
  },
  {
    id: 'request-class-01',
    topic: 'request',
    levels: ['easy'],
    question: 'Under WSGI, what type of object does a view receive as its first argument?',
    options: [
      'The raw `environ` dictionary from the WSGI server',
      'A `QueryDict` of the request parameters',
      'An `HttpResponse` to fill in',
      'A `WSGIRequest`, a subclass of `HttpRequest`',
    ],
    answer: 3,
    explanation:
      '`WSGIHandler` wraps the WSGI `environ` dictionary in a `WSGIRequest`, a subclass of `HttpRequest`, and passes that object through middleware to the view. The raw `environ` is tempting, but it is only stored inside the request (its values appear in `request.META`).',
    source: `${SRC}/core/handlers/wsgi.py`,
  },
  {
    id: 'request-get-01',
    topic: 'request',
    levels: ['easy'],
    question: 'For a request to `/search/?q=django`, where does the view find the value `"django"`?',
    options: ['`request.path`', '`request.GET["q"]`', '`request.POST["q"]`', '`request.META["q"]`'],
    answer: 1,
    explanation:
      '`request.GET` is a `QueryDict` built from the query string, so `request.GET["q"]` is `"django"`. `request.path` is tempting, but it holds only `/search/`: the path never includes the query string.',
    source: `${DOCS}/ref/request-response/`,
  },
  {
    id: 'mw-process-view-01',
    topic: 'middleware',
    levels: ['easy'],
    question: 'Which middleware hook is called just before Django calls the view, after the URL has been resolved?',
    options: [
      '`process_view()`',
      '`process_exception()`',
      '`process_template_response()`',
      '`__init__()`',
    ],
    answer: 0,
    explanation:
      '`process_view(request, view_func, view_args, view_kwargs)` runs after URL resolution and just before the view. `__init__()` is tempting because it sounds like set-up, but it runs only once, when the server starts, not for each request.',
    source: `${DOCS}/topics/http/middleware/`,
  },
  {
    id: 'urls-first-match-01',
    topic: 'urls',
    levels: ['easy', 'medium', 'hard'],
    question: 'Two patterns in the same `urlpatterns` list both match the requested path. Which one is used?',
    options: [
      'The most specific one',
      'The last one in the list',
      'Neither; Django raises an error about conflicting patterns',
      'The first one in the list',
    ],
    answer: 3,
    explanation:
      'Django tries the patterns in order and stops at the first one that matches. “The most specific one” is tempting, but Django never compares patterns; a general pattern listed first wins over a specific one listed later.',
    source: `${DOCS}/topics/http/urls/`,
  },
  {
    id: 'urls-int-converter-01',
    topic: 'urls',
    levels: ['easy'],
    question:
      'With `path("articles/<int:year>/", views.year_archive)`, what is `year` when the view is called for `/articles/2024/`?',
    options: [
      'The string `"2024"`',
      'The integer `2024`',
      'The float `2024.0`',
      'A `ResolverMatch` object',
    ],
    answer: 1,
    explanation:
      'The `int` converter matches digits and converts them with its `to_python()` method, so the view receives the integer `2024`. The string is tempting because URLs are text, and it is what `str` (the default converter) or `re_path()` would pass.',
    source: `${DOCS}/topics/http/urls/`,
  },
  {
    id: 'view-as-view-01',
    topic: 'view',
    levels: ['easy'],
    question: 'In `path("<int:pk>/", PostDetailView.as_view())`, what does `as_view()` return?',
    options: [
      'An instance of `PostDetailView`',
      'An `HttpResponse`',
      'A function that Django calls as the view',
      'The URL pattern for the view',
    ],
    answer: 2,
    explanation:
      '`as_view()` returns a function. For each request that function creates a new instance of the class, calls `setup()` and then `dispatch()`. An instance is tempting, but no instance exists until a request arrives, and a new one is made per request.',
    source: `${DOCS}/ref/class-based-views/base/`,
  },
  {
    id: 'response-json-01',
    topic: 'response',
    levels: ['easy'],
    question: 'Which class serialises data to JSON and sets `Content-Type: application/json` for you?',
    options: ['`HttpResponse`', '`JsonResponse`', '`StreamingHttpResponse`', '`HttpResponseRedirect`'],
    answer: 1,
    explanation:
      '`JsonResponse(data)` encodes `data` as JSON and sets the JSON content type; `data` must be a `dict` unless `safe=False`. `HttpResponse` is tempting because it can send any text, but you would have to encode the JSON and set the content type yourself.',
    source: `${DOCS}/ref/request-response/`,
  },
  {
    id: 'errors-http404-01',
    topic: 'errors',
    levels: ['easy'],
    question: 'With `DEBUG = False`, a view raises `Http404`. Which view produces the response?',
    options: [
      '`handler500`, because an exception was raised',
      '`handler400`',
      '`handler404` (by default `django.views.defaults.page_not_found`)',
      'None; the client receives an empty response',
    ],
    answer: 2,
    explanation:
      '`Http404` is converted into a 404 response by the view named in `handler404` in the root URLconf. `handler500` is tempting because an exception was raised, but it handles only exceptions Django does not recognise; `Http404`, `PermissionDenied` and `BadRequest` have their own handlers.',
    source: `${DOCS}/topics/http/views/`,
  },
  {
    id: 'response-request-finished-01',
    topic: 'response',
    levels: ['easy'],
    question: 'Which signal does Django send when it finishes delivering an HTTP response to the client?',
    options: ['`request_started`', '`got_request_exception`', '`post_save`', '`request_finished`'],
    answer: 3,
    explanation:
      '`request_finished` is sent when the response has been delivered (when the server closes the response). `request_started` is its partner, sent by the handler before the request object is built. `got_request_exception` is sent only when an exception occurs while handling a request.',
    source: `${DOCS}/ref/signals/`,
  },

  /* ---------------- Medium ---------------- */
  {
    id: 'mw-predict-output-01',
    topic: 'middleware',
    levels: ['easy', 'medium', 'hard'],
    question: '`MIDDLEWARE = ["app.middleware.A", "app.middleware.B"]`. What is printed for one request?',
    code: `class A:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        print("A in")
        response = self.get_response(request)
        print("A out")
        return response

# B is identical, but prints "B in" and "B out".`,
    options: [
      'A in, B in, B out, A out',
      'A in, B in, A out, B out',
      'B in, A in, A out, B out',
      'A in, A out, B in, B out',
    ],
    answer: 0,
    explanation:
      'A is listed first, so it runs first on the way in and calls `get_response`, which runs B. B returns first, then control comes back to A, so the output is A in, B in, B out, A out. “A in, B in, A out, B out” is tempting if you think the response also goes top to bottom.',
    source: `${DOCS}/topics/http/middleware/`,
  },
  {
    id: 'urls-include-01',
    topic: 'urls',
    levels: ['medium'],
    question: 'Which request path makes Django call `views.item(request, id=7)`?',
    code: `# mysite/urls.py
urlpatterns = [path("shop/", include("shop.urls"))]

# shop/urls.py
urlpatterns = [path("item/<int:id>/", views.item)]`,
    options: ['`/item/7/`', '`/shop/item/7/`', '`/shop/7/item/`', '`/item/shop/7/`'],
    answer: 1,
    explanation:
      '`include()` matches the prefix `shop/`, removes it and passes the rest, `item/7/`, to `shop.urls`, where `item/<int:id>/` matches. `/item/7/` is tempting because that is how the pattern looks inside `shop/urls.py`, but the included patterns only apply below the `shop/` prefix, so `/item/7/` gives 404.',
    source: `${DOCS}/topics/http/urls/`,
  },
  {
    id: 'urls-order-01',
    topic: 'urls',
    levels: ['medium', 'hard'],
    question: 'A GET request is made for `/articles/new/`. Which view is called?',
    code: `urlpatterns = [
    path("articles/<str:slug>/", views.article),
    path("articles/new/", views.new_article),
]`,
    options: [
      '`views.new_article(request)`',
      'Neither; the patterns conflict, so Django returns 404',
      '`views.article(request, slug="new")`',
      'Both views, in order',
    ],
    answer: 2,
    explanation:
      'Patterns are tested in order and the first match wins. `<str:slug>` matches any segment without a slash, including `new`, so `views.article` is called with `slug="new"` and `new_article` is unreachable. `new_article` is tempting because it matches exactly, but Django does not prefer exact matches; the fix is to list `articles/new/` first.',
    source: `${DOCS}/topics/http/urls/`,
  },
  {
    id: 'urls-int-no-match-01',
    topic: 'urls',
    levels: ['medium'],
    question: '`urlpatterns = [path("posts/<int:pk>/", views.post)]`. A GET request is made for `/posts/abc/`. Result?',
    options: [
      '`views.post(request, pk="abc")` is called',
      '404 Not Found',
      '500 error, because `"abc"` cannot be converted to an integer',
      '`views.post(request, pk=0)` is called',
    ],
    answer: 1,
    explanation:
      'The `int` converter only matches digits, so the pattern does not match `abc` and, with no other pattern, the resolver raises `Resolver404` and the client gets 404. A 500 error is tempting, but the conversion is never attempted: the converter’s regular expression fails first.',
    source: `${DOCS}/topics/http/urls/`,
  },
  {
    id: 'request-post-json-01',
    topic: 'request',
    levels: ['medium'],
    question:
      'A client sends a POST with the body `{"title": "Hi"}` and `Content-Type: application/json`. What does `request.POST` contain in the view?',
    options: [
      'A `QueryDict` with `title` set to `"Hi"`',
      'The raw bytes of the body',
      'An empty `QueryDict`; the JSON is in `request.body`',
      'Nothing; Django raises `ValueError` for JSON bodies',
    ],
    answer: 2,
    explanation:
      '`request.POST` is filled only from form-encoded or multipart bodies. For a JSON body it is empty, and the data must be read from `request.body` (for example with `json.loads(request.body)`). Expecting `title` in `request.POST` is the common mistake, because the request method is POST.',
    source: `${DOCS}/ref/request-response/`,
  },
  {
    id: 'view-dispatch-405-01',
    topic: 'view',
    levels: ['medium'],
    question:
      'The class-based view below receives a POST request that passes the CSRF check. What does the client get?',
    code: `from django.http import HttpResponse
from django.views import View


class ReportView(View):
    def get(self, request):
        return HttpResponse("report")`,
    options: [
      '200 with "report", because `get()` handles every method',
      '404 Not Found',
      '500, because `post()` is missing',
      '405 Method Not Allowed',
    ],
    answer: 3,
    explanation:
      '`dispatch()` looks for a method named after the lower-cased HTTP method. There is no `post()`, so it calls `http_method_not_allowed()`, which returns 405. A 500 error is tempting because a method is missing, but the missing handler is an expected case that `View` handles.',
    source: `${DOCS}/ref/class-based-views/base/`,
  },
  {
    id: 'mw-process-view-response-01',
    topic: 'middleware',
    levels: ['medium', 'hard'],
    question:
      '`MIDDLEWARE = [A, B, C]`. A, B and C each define `process_view()`. B’s `process_view()` returns an `HttpResponse`. What happens?',
    options: [
      'The response goes back out through A only, as in a short-circuit.',
      'C’s `process_view()` and the view are skipped; the response goes out through C, B and A.',
      'The view still runs, and its response replaces B’s.',
      'C’s `process_view()` still runs, then the view is skipped.',
    ],
    answer: 1,
    explanation:
      'By the time `process_view()` runs, every middleware’s `__call__` has already passed the request inwards. Returning a response skips the remaining `process_view()` hooks (C’s) and the view, but the response still travels out through all of the middleware: C, B, then A. “A only” is tempting by analogy with a short-circuit in `__call__`, which is a different case.',
    source: `${DOCS}/topics/http/middleware/`,
  },
  {
    id: 'response-redirect-01',
    topic: 'response',
    levels: ['medium'],
    question:
      'A view returns `redirect("post-detail", pk=42)`, where the `post-detail` pattern is `"posts/<int:pk>/"`. What does the browser receive?',
    options: [
      'The HTML of the post-detail page, with status 200',
      'A 301 response with `Location: /posts/42/`',
      'A 302 response with `Location: /posts/42/`',
      'A 404, because `redirect()` needs a full URL',
    ],
    answer: 2,
    explanation:
      '`redirect()` reverses the URL name with the given arguments and returns an `HttpResponseRedirect`: status 302 with a `Location` header. The browser then makes a second request. A 301 is tempting, but `redirect()` makes a permanent redirect only when you pass `permanent=True`.',
    source: `${DOCS}/topics/http/shortcuts/`,
  },
  {
    id: 'errors-permission-denied-01',
    topic: 'errors',
    levels: ['medium'],
    question: 'A view raises `django.core.exceptions.PermissionDenied` and no middleware handles it. What status code does the client get?',
    options: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '500 Internal Server Error'],
    answer: 1,
    explanation:
      'Django converts `PermissionDenied` into a 403 Forbidden response, produced by `handler403`. 401 is tempting because it sounds like an access problem, but Django does not use it for `PermissionDenied`; 401 is meant for missing authentication credentials.',
    source: `${DOCS}/ref/exceptions/`,
  },
  {
    id: 'view-queryset-lazy-01',
    topic: 'view',
    levels: ['medium'],
    question: 'The template `list.html` loops over `posts`. When does the database query run?',
    code: `def post_list(request):
    posts = Post.objects.filter(published=True)      # line 1
    posts = posts.order_by("-created")               # line 2
    return render(request, "list.html", {"posts": posts})  # line 3`,
    options: [
      'At line 1, when `filter()` is called',
      'Twice: once at line 1 and again at line 2',
      'During line 3, when the template iterates over `posts`',
      'After the response has been sent to the browser',
    ],
    answer: 2,
    explanation:
      'QuerySets are lazy: `filter()` and `order_by()` only build the query. It runs when the QuerySet is evaluated, here when the template loops over it, which happens inside `render()` at line 3. Line 1 is tempting because that is where the query appears to be made.',
    source: `${DOCS}/topics/db/queries/`,
  },

  {
    id: 'wsgi-settings-module-01',
    topic: 'wsgi',
    levels: ['medium'],
    question:
      'The server is started with the environment variable `DJANGO_SETTINGS_MODULE=mysite.settings_prod`. Which settings module does this `wsgi.py` use?',
    code: `import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")

application = get_wsgi_application()`,
    options: [
      '`mysite.settings`, because `wsgi.py` names it',
      '`mysite.settings_prod`',
      'Both, merged together',
      'Neither; Django raises an error because the two values conflict',
    ],
    answer: 1,
    explanation:
      '`os.environ.setdefault()` sets the variable only if it is not already set, so the value from the environment, `mysite.settings_prod`, is kept. `mysite.settings` is tempting because it is written in the file, but it is only the default used when the environment does not provide one.',
    source: `${DOCS}/howto/deployment/wsgi/`,
  },

  /* ---------------- Hard ---------------- */
  {
    id: 'urls-request-urlconf-01',
    topic: 'urls',
    levels: ['hard'],
    question: 'This middleware runs before URL resolution. For a request to `/api/items/`, which URLconf does Django use?',
    code: `class ApiUrlconfMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/api/"):
            request.urlconf = "api.urls"
        return self.get_response(request)`,
    options: [
      '`ROOT_URLCONF`, because a setting cannot change per request',
      '`api.urls`, in place of `ROOT_URLCONF` for this request',
      '`ROOT_URLCONF` first, then `api.urls` if nothing matched',
      '`api.urls`, but only if `api` is in `INSTALLED_APPS`',
    ],
    answer: 1,
    explanation:
      'If a middleware sets `request.urlconf`, Django uses that module instead of `ROOT_URLCONF` for that request only. Keeping `ROOT_URLCONF` is tempting because settings are global, but `request.urlconf` is designed as a per-request override. Django does not fall back from one URLconf to the other.',
    source: `${DOCS}/topics/http/urls/`,
  },
  {
    id: 'mw-exception-order-01',
    topic: 'middleware',
    levels: ['hard'],
    question:
      '`MIDDLEWARE = [A, B]`. Both define `process_exception()`. The view raises `ValueError`, and B’s `process_exception()` returns an `HttpResponse`. Does A’s `process_exception()` run?',
    options: [
      'Yes, first: exception hooks run top to bottom, so A runs before B.',
      'Yes: every `process_exception()` always runs.',
      'No: exception hooks run bottom to top, and once one returns a response the rest are skipped.',
      'No: `process_exception()` only runs for `Http404`.',
    ],
    answer: 2,
    explanation:
      'Like the rest of the response phase, `process_exception()` hooks run in reverse order, so B’s runs first. When it returns a response, the hooks of middleware above it (A) are not called. Top to bottom is tempting because that is the order of `process_view()`, but exception handling is part of the way out.',
    source: `${DOCS}/topics/http/middleware/`,
  },
  {
    id: 'mw-exception-scope-01',
    topic: 'middleware',
    levels: ['hard'],
    question:
      'A middleware’s `__call__` raises an exception before calling `get_response`. Is `process_exception()` of the other middleware called?',
    options: [
      'Yes, for every middleware, from bottom to top',
      'Yes, but only for the middleware above it',
      'No; the exception is converted to an error response (500 here), which the outer middleware receive',
      'No; the exception reaches the WSGI server and the connection is closed',
    ],
    answer: 2,
    explanation:
      '`process_exception()` applies only to exceptions raised by the view (or by a `TemplateResponse` while rendering). An exception raised inside a middleware is converted to the appropriate HTTP response, here a 500, and the outer middleware receive that response from `get_response`. Expecting the exception hooks to run is tempting because an exception was raised during the request.',
    source: `${DOCS}/topics/http/middleware/`,
  },
  {
    id: 'urls-append-slash-post-01',
    topic: 'urls',
    levels: ['hard'],
    question:
      '`DEBUG = True`, `APPEND_SLASH = True`, `CommonMiddleware` is enabled and the only pattern is `path("contact/", views.contact)`. A form sends a POST to `/contact`. Result?',
    options: [
      'A 301 redirect to `/contact/`',
      '`views.contact` is called',
      '404 Not Found',
      '`RuntimeError`: Django cannot redirect to the slashed URL while keeping the POST data',
    ],
    answer: 3,
    explanation:
      'A redirect would make the browser repeat the request as a GET and lose the form data, so with `DEBUG = True` `CommonMiddleware` raises `RuntimeError` for POST, PUT, PATCH and DELETE, telling you to fix the form’s URL. The 301 is tempting because that is what a GET to `/contact` gets.',
    source: `${SRC}/middleware/common.py`,
  },
  {
    id: 'view-template-response-swap-01',
    topic: 'view',
    levels: ['hard'],
    question:
      'A view returns `TemplateResponse(request, "a.html", context)`. A middleware’s `process_template_response()` sets `response.template_name = "b.html"` and returns the response. Which template is rendered?',
    options: [
      '`a.html`, because the view chose it',
      '`b.html`',
      'Both, one after the other',
      'Neither; Django raises an error because the response was already rendered',
    ],
    answer: 1,
    explanation:
      'A `TemplateResponse` is not rendered until after the `process_template_response()` hooks, so a middleware can still change `template_name` or `context_data`; `b.html` is rendered. `a.html` is tempting because the view named it, and it would be correct if the view had used `render()`, which renders immediately.',
    source: `${DOCS}/ref/template-response/`,
  },
  {
    id: 'errors-debug-404-01',
    topic: 'errors',
    levels: ['hard'],
    question:
      '`DEBUG = True` and the root URLconf sets a custom `handler404`. A view raises `Http404`. What does the browser show?',
    options: [
      'Django’s debug 404 page; `handler404` is used only when `DEBUG` is `False`',
      'The custom `handler404` page',
      'A 500 error page, because `Http404` is an exception',
      'An empty 404 response',
    ],
    answer: 0,
    explanation:
      'With `DEBUG = True`, `Http404` produces Django’s technical 404 page, which lists the URL patterns that were tried. The custom `handler404` is tempting, but it is only used when `DEBUG` is `False`, which is why custom error pages must be tested with debugging off.',
    source: `${DOCS}/topics/http/views/`,
  },
  {
    id: 'errors-middleware-sees-response-01',
    topic: 'errors',
    levels: ['hard'],
    question: 'A view raises `Http404`. What does an outer middleware’s `__call__` get back from `self.get_response(request)`?',
    options: [
      'The `Http404` exception, which it must catch with `try`/`except`',
      '`None`',
      'An `HttpResponse` whose `status_code` is 404',
      'Nothing; `__call__` is skipped when the view raises',
    ],
    answer: 2,
    explanation:
      'Django converts exceptions into responses between every pair of middleware layers, so `get_response` always returns a response; here its `status_code` is 404. Catching `Http404` is tempting, but the exception has already been converted before it reaches the middleware.',
    source: `${DOCS}/topics/http/middleware/`,
  },
  {
    id: 'response-streaming-content-01',
    topic: 'response',
    levels: ['hard'],
    question:
      'A middleware does `html = response.content.decode()` on every response. A view returns a `StreamingHttpResponse`. What happens?',
    options: [
      '`AttributeError`: a streaming response has no `content`; check `response.streaming` and use `streaming_content`',
      'It works, but the whole stream is read into memory first',
      '`content` is an empty byte string',
      'Django skips that middleware for streaming responses',
    ],
    answer: 0,
    explanation:
      'Accessing `content` on a `StreamingHttpResponse` raises `AttributeError` telling you to use `streaming_content`. Middleware that edits bodies should test `response.streaming` first. Reading the stream into memory is tempting, but Django deliberately refuses, because streaming content may be too large to hold in memory.',
    source: `${DOCS}/topics/http/middleware/`,
  },
  {
    id: 'wsgi-handler-order-01',
    topic: 'wsgi',
    levels: ['hard'],
    question: 'Inside `WSGIHandler.__call__(environ, start_response)`, which of these happens first for each request?',
    options: [
      'Each middleware’s `__init__()` runs',
      'The `request_started` signal is sent',
      'The URL is resolved',
      'The `request_finished` signal is sent',
    ],
    answer: 1,
    explanation:
      'The handler sends `request_started` (with `environ`) and then builds the `WSGIRequest` and passes it into the middleware chain. Middleware `__init__()` is tempting, but it runs once, when the handler loads the middleware at start-up, not on each request. URL resolution happens later, after the middleware’s request phase.',
    source: `${SRC}/core/handlers/wsgi.py`,
  },
  {
    id: 'request-post-in-middleware-01',
    topic: 'request',
    levels: ['hard'],
    question: 'Why does the Django documentation advise against reading `request.POST` in a middleware’s `process_view()`?',
    options: [
      'It is always empty before the view runs',
      'It prevents any view that runs afterwards from changing the upload handlers for the request',
      'It raises an error because the body can only be read by the view',
      'It disables CSRF protection for that request',
    ],
    answer: 1,
    explanation:
      'Reading `request.POST` parses the body, and after that the upload handlers can no longer be changed, so views that need custom upload handling break. “Always empty” is tempting, but `request.POST` is available as soon as the request is built. The documentation names `CsrfViewMiddleware` as the exception, since views can control when its check happens with `csrf_exempt()` and `csrf_protect()`.',
    source: `${DOCS}/topics/http/middleware/`,
  },
]
