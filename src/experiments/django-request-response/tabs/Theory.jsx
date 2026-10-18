import Callout from '../../../components/content/Callout.jsx'
import CodeBlock from '../../../components/content/CodeBlock.jsx'
import Figure from '../../../components/content/Figure.jsx'
import TableScroll from '../../../components/content/TableScroll.jsx'
import MiddlewareOnion from '../viz/MiddlewareOnion.jsx'
import RequestJourney from '../viz/RequestJourney.jsx'
import UrlMatcher from '../viz/UrlMatcher.jsx'

// Facts below follow the Django documentation (stable = 6.1 at the time of writing).
// Code samples are shared with the URL-matching visualization, so keep them in sync with data/vizSteps.js.

const WSGI_PY = `
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysite.settings")

application = get_wsgi_application()
`

const REQUEST_ATTRS = `
# A GET request for /blog/42/?page=2 arrives at a view as:
request.method          # "GET"
request.path            # "/blog/42/"
request.GET["page"]     # "2"   (a QueryDict built from the query string)
request.POST            # empty QueryDict (no form data in a GET)
request.META["HTTP_USER_AGENT"]   # the browser's User-Agent header
request.COOKIES.get("sessionid")  # cookie values are strings
`

const MIDDLEWARE_SETTING = `
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
`

const PRINT_MIDDLEWARE = `
class PrintMiddleware:
    def __init__(self, get_response):
        # Runs once, when the server starts.
        self.get_response = get_response

    def __call__(self, request):
        # Runs for every request, before the view (and the middleware below this one).
        print(f"before view: {request.method} {request.path}")

        response = self.get_response(request)

        # Runs for every request, after the view has returned a response.
        print(f"after view: {response.status_code}")
        return response
`

const ROOT_URLS = `
from django.urls import include, path

from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("blog/", include("blog.urls")),
    path("about/", views.about, name="about"),
]
`

const BLOG_URLS = `
from django.urls import path

from . import views

urlpatterns = [
    path("<int:pk>/", views.post_detail, name="post-detail"),
    path("<int:year>/<slug:slug>/", views.post_by_year, name="post-by-year"),
]
`

const FBV = `
from django.shortcuts import get_object_or_404, render

from .models import Post


def post_detail(request, pk):
    post = get_object_or_404(Post, pk=pk)
    return render(request, "blog/post_detail.html", {"post": post})
`

const CBV = `
from django.shortcuts import get_object_or_404, render
from django.views import View

from .models import Post


class PostDetailView(View):
    def get(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        return render(request, "blog/post_detail.html", {"post": post})


# blog/urls.py
# path("<int:pk>/", PostDetailView.as_view(), name="post-detail")
`

const RESPONSES = `
from django.http import (
    HttpResponse,
    HttpResponseRedirect,
    JsonResponse,
    StreamingHttpResponse,
)
from django.shortcuts import redirect

HttpResponse("<h1>Hello</h1>")                 # 200, text/html; charset=utf-8
HttpResponse("Not allowed", status=403)
JsonResponse({"id": 42, "title": "Django tips"})  # 200, application/json
HttpResponseRedirect("/blog/")                 # 302 Found
redirect("post-detail", pk=42)                 # 302, URL built with reverse()
StreamingHttpResponse(row_generator())         # body sent in chunks
`

const ERROR_HANDLERS = `
# mysite/urls.py (only the root URLconf is read for these)
handler404 = "blog.views.page_not_found"
handler500 = "blog.views.server_error"
`

export default function Theory() {
  return (
    <>
      <p>
        This section follows one request, <code>GET /blog/42/</code>, through a Django project.
        Each stage below hands its result to the next one; the visualizations let you step
        through the same journey.
      </p>

      {/* 1 */}
      <h2>1. Where Django sits</h2>
      <p>
        Django does not accept network connections itself. In a typical deployment a request
        passes through other programs before any project code runs:
      </p>
      <ol>
        <li>
          <strong>Browser.</strong> Opens a connection and sends an HTTP request, for example{' '}
          <code>GET /blog/42/ HTTP/1.1</code> with its headers.
        </li>
        <li>
          <strong>Web server</strong> (for example Nginx). Accepts the connection, usually
          terminates HTTPS, serves static files directly and forwards other requests to the
          application server.
        </li>
        <li>
          <strong>WSGI or ASGI server</strong> (for example Gunicorn for WSGI, Uvicorn for ASGI).
          Runs the Python processes and turns each HTTP request into a call to Django’s
          application object.
        </li>
        <li>
          <strong>Django.</strong> Builds a request object, runs it through the middleware,
          resolves the URL, calls the view and returns the response to the server.
        </li>
      </ol>
      <p>
        During development, <code>python manage.py runserver</code> starts a lightweight
        development server that takes the place of both servers. The Django documentation states
        that it must not be used in production: it has not gone through security audits or
        performance tests.
      </p>
      <RequestJourney />
      <Figure
        src="cycle-overview.gif"
        alt="Flow diagram: the browser sends a request through the web server (Nginx or Apache) and WSGI to the request middleware, URL resolution (urls.py), the view middleware and the view (views.py), which uses the model, managers and the database. The view's result passes through the template middleware and the template, or through the exception middleware on an error, then the response middleware, and goes back through WSGI and the web server to the browser."
        caption="Figure 1. The request–response cycle in a Django project."
        credit={null} // TODO: source and author of cycle-overview.gif
        creditUrl={null}
      />

      {/* 2 */}
      <h2>2. Building the request</h2>
      <p>
        <code>django-admin startproject mysite</code> creates <code>mysite/wsgi.py</code>. It
        exposes a module-level callable named <code>application</code>, which is what the WSGI
        server is configured to load:
      </p>
      <CodeBlock title="mysite/wsgi.py" code={WSGI_PY} />
      <p>
        <code>get_wsgi_application()</code> calls <code>django.setup()</code> and returns an
        instance of <code>WSGIHandler</code>. For every request the WSGI server calls{' '}
        <code>application(environ, start_response)</code>, where <code>environ</code> is a
        dictionary holding the request line, the headers and details about the server. The
        handler then:
      </p>
      <ol>
        <li>
          sends the <code>request_started</code> signal;
        </li>
        <li>
          wraps <code>environ</code> in a <code>WSGIRequest</code>, a subclass of{' '}
          <code>HttpRequest</code>;
        </li>
        <li>passes that request object into the middleware chain.</li>
      </ol>
      <p>The attributes a view uses most often are:</p>
      <TableScroll label="HttpRequest attributes">
        <table>
          <thead>
            <tr>
              <th>Attribute</th>
              <th>Contents</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>method</code>
              </td>
              <td>
                The HTTP method as an upper-case string: <code>"GET"</code>, <code>"POST"</code>.
              </td>
            </tr>
            <tr>
              <td>
                <code>path</code>
              </td>
              <td>The full path, without the domain or the query string.</td>
            </tr>
            <tr>
              <td>
                <code>GET</code>
              </td>
              <td>
                A <code>QueryDict</code> of the query-string parameters.
              </td>
            </tr>
            <tr>
              <td>
                <code>POST</code>
              </td>
              <td>
                A <code>QueryDict</code> of form data. It is filled only for form-encoded or
                multipart bodies; a JSON body is read from <code>request.body</code>.
              </td>
            </tr>
            <tr>
              <td>
                <code>META</code>
              </td>
              <td>
                A dictionary of all HTTP headers and server variables, such as{' '}
                <code>REMOTE_ADDR</code> and <code>HTTP_USER_AGENT</code>.
              </td>
            </tr>
            <tr>
              <td>
                <code>COOKIES</code>
              </td>
              <td>A dictionary of cookie names to string values.</td>
            </tr>
          </tbody>
        </table>
      </TableScroll>
      <CodeBlock code={REQUEST_ATTRS} />

      {/* 3 */}
      <h2>3. Middleware</h2>
      <p>
        Middleware is a set of hooks into request and response processing. Each middleware
        does one job for every request, such as attaching the session or checking a CSRF token.
      </p>

      <h3>The MIDDLEWARE setting</h3>
      <p>
        The <code>MIDDLEWARE</code> setting lists middleware by their full Python path. A project
        created by <code>django-admin startproject</code> starts with these seven:
      </p>
      <CodeBlock title="mysite/settings.py" code={MIDDLEWARE_SETTING} />
      <ul>
        <li>
          <code>SecurityMiddleware</code> adds security headers and can redirect HTTP to HTTPS
          (<code>SECURE_SSL_REDIRECT</code>).
        </li>
        <li>
          <code>SessionMiddleware</code> loads the session named by the session cookie into{' '}
          <code>request.session</code>.
        </li>
        <li>
          <code>CommonMiddleware</code> applies <code>APPEND_SLASH</code> and{' '}
          <code>PREPEND_WWW</code> redirects, blocks <code>DISALLOWED_USER_AGENTS</code> and sets{' '}
          <code>Content-Length</code>.
        </li>
        <li>
          <code>CsrfViewMiddleware</code> checks the CSRF token on unsafe methods such as POST.
        </li>
        <li>
          <code>AuthenticationMiddleware</code> adds <code>request.user</code>, read from the
          session.
        </li>
        <li>
          <code>MessageMiddleware</code> enables the messages framework (one-time notices such as
          “Saved”).
        </li>
        <li>
          <code>XFrameOptionsMiddleware</code> sets the <code>X-Frame-Options</code> header to
          protect against clickjacking.
        </li>
      </ul>

      <h3>The onion: in top-down, out bottom-up</h3>
      <p>
        During the request phase Django applies middleware in the order they appear in{' '}
        <code>MIDDLEWARE</code>, top to bottom. Each middleware is a layer wrapped around the
        view, which sits at the centre. When the view returns, the response passes back through
        every layer in reverse order, bottom to top. With the default list, the request meets{' '}
        <code>SecurityMiddleware</code> first, and the response meets it last.
      </p>

      <h3>Writing middleware</h3>
      <p>
        A middleware is a factory that takes a <code>get_response</code> callable and returns a
        callable that takes a request and returns a response. Written as a class:
      </p>
      <ul>
        <li>
          <code>__init__(self, get_response)</code> runs once, when the server starts. It must
          accept only <code>get_response</code>.
        </li>
        <li>
          <code>__call__(self, request)</code> runs for every request. Code before{' '}
          <code>self.get_response(request)</code> runs on the way in; code after it runs on the
          way out.
        </li>
      </ul>
      <CodeBlock title="mysite/middleware.py" code={PRINT_MIDDLEWARE} />
      <p>
        <code>get_response</code> is the next middleware in the list or, for the last one, a
        wrapper from the handler that resolves the URL, applies the view hooks below and calls
        the view.
      </p>

      <h3>The other hooks</h3>
      <p>A class-based middleware may also define three special methods:</p>
      <ul>
        <li>
          <code>process_view(request, view_func, view_args, view_kwargs)</code> is called just
          before the view, after the URL has been resolved. Hooks run top to bottom. Returning{' '}
          <code>None</code> continues; returning an <code>HttpResponse</code> skips the remaining{' '}
          <code>process_view()</code> hooks and the view.
        </li>
        <li>
          <code>process_exception(request, exception)</code> is called only when the view raises
          an exception. Hooks run bottom to top. The first one to return a response stops the
          rest; if all return <code>None</code>, default exception handling takes over.
        </li>
        <li>
          <code>process_template_response(request, response)</code> is called after the view
          returns, only if the response has a <code>render()</code> method (for example a{' '}
          <code>TemplateResponse</code>). Hooks run bottom to top, and the response is rendered
          after all of them.
        </li>
      </ul>
      <p>For one request, the order is therefore:</p>
      <ol>
        <li>
          the code before <code>get_response</code> in each <code>__call__</code>, top to bottom;
        </li>
        <li>URL resolution;</li>
        <li>
          <code>process_view()</code>, top to bottom;
        </li>
        <li>the view;</li>
        <li>
          <code>process_exception()</code>, bottom to top, if the view raised an exception;
        </li>
        <li>
          <code>process_template_response()</code>, bottom to top, then rendering, if the
          response has <code>render()</code>;
        </li>
        <li>
          the code after <code>get_response</code> in each <code>__call__</code>, bottom to top.
        </li>
      </ol>

      <h3>Short-circuiting</h3>
      <p>
        A middleware may return a response from <code>__call__</code> without calling{' '}
        <code>get_response</code>. The layers inside it, and the view, never see the request.
        The response goes back out only through the layers the request already passed.
      </p>
      <p>
        A <code>process_view()</code> that returns a response behaves differently. By that point
        every <code>__call__</code> has already passed the request inwards, so the response
        travels back out through all of the middleware; only the remaining{' '}
        <code>process_view()</code> hooks and the view are skipped. This is how{' '}
        <code>CsrfViewMiddleware</code> rejects a POST that has no valid token: its{' '}
        <code>process_view()</code> returns a 403 Forbidden response.
      </p>

      <h3>Ordering rules</h3>
      <ul>
        <li>
          <code>SecurityMiddleware</code> goes near the top, so that an HTTPS redirect happens
          before any other middleware runs.
        </li>
        <li>
          <code>SessionMiddleware</code> comes before <code>AuthenticationMiddleware</code>,
          because authentication reads the user from the session.{' '}
          <code>MessageMiddleware</code> also comes after <code>SessionMiddleware</code>.
        </li>
        <li>
          <code>CommonMiddleware</code> sits close to the top because it may redirect (
          <code>APPEND_SLASH</code>) before later middleware do any work.
        </li>
        <li>
          <code>CsrfViewMiddleware</code> comes before any view middleware that assumes CSRF
          attacks have already been dealt with.
        </li>
      </ul>
      <MiddlewareOnion />
      <Figure
        src="middleware-onion.png"
        alt="Middleware drawn as layers around the view, with the request entering and the response leaving"
        caption="Figure 2. The middleware onion."
        credit={null} // TODO: source of middleware-onion.png
        creditUrl={null}
      />
      <Figure
        src="middleware-hooks-flow.png"
        alt="The order in which __call__, process_view, process_exception and process_template_response run"
        caption="Figure 3. Middleware hooks in the order Django calls them."
        credit={null} // TODO: source of middleware-hooks-flow.png
        creditUrl={null}
      />

      {/* 4 */}
      <h2>4. URL resolution</h2>
      <p>
        After the request has passed inwards through the middleware, Django decides which view
        to call:
      </p>
      <ol>
        <li>
          It picks the root URLconf module: the <code>ROOT_URLCONF</code> setting (for example{' '}
          <code>"mysite.urls"</code>), unless a middleware has set <code>request.urlconf</code>,
          which then replaces it for this request.
        </li>
        <li>
          It loads the module’s <code>urlpatterns</code> list and tries each pattern in order. The
          first pattern that matches wins. The path is compared without its leading slash, and
          the query string and the HTTP method play no part.
        </li>
        <li>
          It calls the matched view with the request and the captured values as keyword
          arguments.
        </li>
      </ol>
      <CodeBlock title="mysite/urls.py" code={ROOT_URLS} />
      <CodeBlock title="blog/urls.py" code={BLOG_URLS} />
      <p>
        <strong>Converters.</strong> <code>&lt;int:pk&gt;</code> captures a value and converts
        it. The built-in converters are <code>str</code> (the default, any text without a slash),{' '}
        <code>int</code> (zero or a positive integer, passed to the view as an <code>int</code>),{' '}
        <code>slug</code>, <code>uuid</code> and <code>path</code> (text that may include
        slashes).
      </p>
      <p>
        <strong>include().</strong> When a pattern that uses <code>include()</code> matches, Django
        removes the matched part of the path and continues with the rest in the included
        URLconf.
      </p>
      <p>
        <strong>A worked example.</strong> For <code>/blog/2024/django-tips/</code>, Django tests{' '}
        <code>""</code> (no match), then <code>"blog/"</code>, which matches the start of the path
        and passes <code>2024/django-tips/</code> to <code>blog.urls</code>. There,{' '}
        <code>"&lt;int:pk&gt;/"</code> does not match, and{' '}
        <code>"&lt;int:year&gt;/&lt;slug:slug&gt;/"</code> does. The <code>"about/"</code>{' '}
        pattern is never tested. Django calls{' '}
        <code>views.post_by_year(request, year=2024, slug="django-tips")</code>.
      </p>
      <p>
        <strong>ResolverMatch.</strong> The result of resolving is stored on{' '}
        <code>request.resolver_match</code>. Its attributes include <code>func</code>,{' '}
        <code>args</code>, <code>kwargs</code>, <code>url_name</code> (here{' '}
        <code>"post-by-year"</code>) and <code>route</code>.
      </p>
      <p>
        <strong>No match.</strong> If no pattern matches, the resolver raises{' '}
        <code>Resolver404</code>, a subclass of <code>Http404</code>, and Django returns a 404
        response.
      </p>
      <p>
        <strong>APPEND_SLASH.</strong> <code>APPEND_SLASH</code> is <code>True</code> by default.
        When a path such as <code>/blog/2024</code> matches nothing but{' '}
        <code>/blog/2024/</code> would match, <code>CommonMiddleware</code> replaces the 404 with
        a permanent redirect (301) to the slashed URL. When <code>DEBUG</code> is{' '}
        <code>True</code> it raises <code>RuntimeError</code> for a POST, PUT, PATCH or DELETE
        instead, because a redirect would lose the request data.
      </p>
      <UrlMatcher />
      <Figure
        src="url-resolution.png"
        alt="The URL resolver testing patterns in order until one matches"
        caption="Figure 4. URL resolution."
        credit={null} // TODO: source of url-resolution.png
        creditUrl={null}
      />

      {/* 5 */}
      <h2>5. The view</h2>
      <p>
        A view takes an <code>HttpRequest</code> and returns an <code>HttpResponse</code>. It
        can be a function or a class.
      </p>
      <h3>Function-based view</h3>
      <CodeBlock title="blog/views.py" code={FBV} />
      <h3>Class-based view</h3>
      <CodeBlock title="blog/views.py" code={CBV} />
      <p>
        <code>as_view()</code> returns a function, which is what the URLconf stores. For each
        request that function creates a new instance of the class, calls <code>setup()</code>,
        then <code>dispatch()</code>. <code>dispatch()</code> calls the method named after the
        lower-cased HTTP method (<code>get()</code>, <code>post()</code>), or{' '}
        <code>http_method_not_allowed()</code>, which returns 405, if there is none.
      </p>
      <h3>A view must return a response</h3>
      <p>
        If a view returns <code>None</code>, for example because it ends without a{' '}
        <code>return</code> statement, Django raises <code>ValueError</code> with a message that
        the view “didn’t return an HttpResponse object. It returned None instead.”
      </p>
      <h3>QuerySets are lazy</h3>
      <p>
        <code>Post.objects.filter(published=True)</code> builds a query but does not touch the
        database. The query runs when the QuerySet is evaluated: when it is iterated, or passed
        to <code>len()</code>, <code>list()</code> or <code>bool()</code>. Often that happens
        while the template is being rendered.
      </p>
      <h3>render() and TemplateResponse</h3>
      <ul>
        <li>
          <code>render(request, template_name, context)</code> renders the template immediately
          and returns an <code>HttpResponse</code> that already holds the final HTML.
        </li>
        <li>
          <code>TemplateResponse(request, template_name, context)</code> keeps the template and
          context and renders later, after the <code>process_template_response()</code> hooks.
          Middleware can still change <code>template_name</code> or{' '}
          <code>context_data</code>.
        </li>
      </ul>
      <p>
        Both run the <strong>context processors</strong> listed in{' '}
        <code>TEMPLATES[...]["OPTIONS"]["context_processors"]</code>. Each one is a function that
        takes the request and adds variables to every template context; for example{' '}
        <code>django.contrib.auth.context_processors.auth</code> adds <code>user</code> and{' '}
        <code>perms</code>.
      </p>

      {/* 6 */}
      <h2>6. The response</h2>
      <p>
        <code>django.http</code> provides a response class for each common case:
      </p>
      <CodeBlock code={RESPONSES} />
      <ul>
        <li>
          <code>HttpResponse</code> holds the body as bytes, a status code (200 by default) and
          headers.
        </li>
        <li>
          <code>JsonResponse</code> serialises its data to JSON and sets{' '}
          <code>Content-Type: application/json</code>. The data must be a <code>dict</code>{' '}
          unless <code>safe=False</code> is passed.
        </li>
        <li>
          <code>HttpResponseRedirect</code> (302) and <code>HttpResponsePermanentRedirect</code>{' '}
          (301) send the browser to another URL; the <code>redirect()</code> shortcut builds them.
        </li>
        <li>
          <code>StreamingHttpResponse</code> sends its body from an iterator, piece by piece. It
          has no <code>content</code> attribute, so middleware that edits bodies must check{' '}
          <code>response.streaming</code>.
        </li>
      </ul>
      <p>
        The response then passes back out through the middleware in reverse order: with the
        default list, <code>XFrameOptionsMiddleware</code> sees it first and{' '}
        <code>SecurityMiddleware</code> last. <code>WSGIHandler</code> calls{' '}
        <code>start_response()</code> with the status line and headers (cookies included) and
        returns the body to the WSGI server, which writes it to the connection. When the server
        closes the response, Django sends the <code>request_finished</code> signal.
      </p>

      {/* 7 */}
      <h2>7. When things go wrong</h2>
      <p>
        Django converts exceptions into HTTP responses. The conversion happens between every pair
        of middleware layers, so a middleware always receives a response from{' '}
        <code>get_response</code>, never an exception.
      </p>
      <TableScroll label="Exceptions and the responses they produce">
        <table>
          <thead>
            <tr>
              <th>Raised</th>
              <th>Response</th>
              <th>Handler in the root URLconf</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>Http404</code> (also from <code>get_object_or_404()</code>)
              </td>
              <td>404 Not Found</td>
              <td>
                <code>handler404</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>PermissionDenied</code>
              </td>
              <td>403 Forbidden</td>
              <td>
                <code>handler403</code>
              </td>
            </tr>
            <tr>
              <td>
                <code>BadRequest</code>, <code>SuspiciousOperation</code>
              </td>
              <td>400 Bad Request</td>
              <td>
                <code>handler400</code>
              </td>
            </tr>
            <tr>
              <td>Any other unhandled exception</td>
              <td>500 Internal Server Error</td>
              <td>
                <code>handler500</code>
              </td>
            </tr>
          </tbody>
        </table>
      </TableScroll>
      <CodeBlock title="mysite/urls.py" code={ERROR_HANDLERS} />
      <p>
        If the exception was raised by the view, the <code>process_exception()</code> hooks run
        first and may return a response of their own.
      </p>
      <p>
        With <code>DEBUG = True</code>, an <code>Http404</code> shows Django’s debug 404 page,
        which lists the URL patterns that were tried, and an unhandled exception shows the debug
        500 page with the traceback, local variables and settings. These pages replace{' '}
        <code>handler404</code> and <code>handler500</code>.
      </p>
      <Callout>
        <p>
          Never run a public site with <code>DEBUG = True</code>: the debug pages expose source
          code and configuration.
        </p>
      </Callout>

      {/* 8 */}
      <h2>8. A note on ASGI</h2>
      <p>
        ASGI is the asynchronous successor to WSGI. A project also contains{' '}
        <code>mysite/asgi.py</code>, whose <code>get_asgi_application()</code> returns an{' '}
        <code>ASGIHandler</code> that an ASGI server such as Uvicorn, Daphne or Hypercorn can
        run. The handler builds an <code>ASGIRequest</code> instead of a{' '}
        <code>WSGIRequest</code>; the middleware, URL resolution, view and response stages are
        the same. Under ASGI, views and middleware may be written with <code>async def</code>,
        and Django adapts between synchronous and asynchronous code where needed.
      </p>
    </>
  )
}
