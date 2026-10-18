/*
 * Step data for the three Theory visualizations. Plain data (no JSX) so the
 * Simulation tab can reuse it later.
 *
 * Behaviour checked against the Django 6.1 documentation and source
 * (django/core/handlers/base.py, django/middleware/, and the middleware modules in django/contrib).
 * The URLconf here is the one shown in the Theory tab (mysite/urls.py, blog/urls.py).
 */

/* ------------------------------------------------------------------ */
/* V1. Request journey: GET /blog/42/                                  */
/* ------------------------------------------------------------------ */

export const requestJourney = {
  request: 'GET /blog/42/',
  response: '200 OK',
  // Boxes left to right. `group` puts boxes in the same column (Model/DB above Template).
  nodes: [
    { id: 'browser', label: 'Browser' },
    { id: 'webserver', label: 'Web server', detail: 'Nginx' },
    { id: 'wsgi', label: 'WSGI server', detail: 'Gunicorn + WSGIHandler' },
    { id: 'middleware', label: 'Middleware', detail: '7 classes' },
    { id: 'resolver', label: 'URL resolver', detail: 'mysite.urls' },
    { id: 'view', label: 'View', detail: 'post_detail' },
    { id: 'model', label: 'Model / DB', detail: 'Post', group: 'data' },
    { id: 'template', label: 'Template', detail: 'post_detail.html', group: 'data' },
  ],
  // direction: 'request' (inward) or 'response' (outward)
  steps: [
    {
      node: 'browser',
      direction: 'request',
      caption: 'The browser sends GET /blog/42/ HTTP/1.1 with its headers to the server.',
    },
    {
      node: 'webserver',
      direction: 'request',
      caption:
        'Nginx accepts the connection. /blog/42/ is not a static file, so it forwards the request to Gunicorn.',
    },
    {
      node: 'wsgi',
      direction: 'request',
      caption:
        'Gunicorn calls application(environ, start_response). Django’s WSGIHandler sends request_started and wraps environ in a WSGIRequest.',
    },
    {
      node: 'middleware',
      direction: 'request',
      caption:
        'The request passes through the seven classes in MIDDLEWARE, top to bottom, from SecurityMiddleware to XFrameOptionsMiddleware.',
    },
    {
      node: 'resolver',
      direction: 'request',
      caption:
        'The resolver loads ROOT_URLCONF. "blog/" (an include()) matches, then "<int:pk>/" matches 42/. Result: post_detail with kwargs {"pk": 42}.',
    },
    {
      node: 'view',
      direction: 'request',
      caption: 'After the process_view() hooks, Django calls post_detail(request, pk=42).',
    },
    {
      node: 'model',
      direction: 'request',
      caption:
        'get_object_or_404(Post, pk=42) runs a SELECT query. The database returns the row, and Django builds a Post object.',
    },
    {
      node: 'template',
      direction: 'response',
      caption:
        'render() fills blog/post_detail.html with the post and returns an HttpResponse with status 200.',
    },
    {
      node: 'middleware',
      direction: 'response',
      caption:
        'The response passes back through the middleware, bottom to top. XFrameOptionsMiddleware adds X-Frame-Options; SecurityMiddleware adds its headers last.',
    },
    {
      node: 'wsgi',
      direction: 'response',
      caption:
        'WSGIHandler calls start_response("200 OK", headers) and returns the body. Gunicorn writes it to the connection.',
    },
    {
      node: 'webserver',
      direction: 'response',
      caption: 'Nginx passes the response on to the browser. When the response is closed, Django sends request_finished.',
    },
    {
      node: 'browser',
      direction: 'response',
      caption: 'The browser receives 200 OK and renders the post page.',
    },
  ],
}

/* ------------------------------------------------------------------ */
/* V2. Middleware onion                                                */
/* ------------------------------------------------------------------ */

// The default MIDDLEWARE list from django-admin startproject, outermost first.
export const onionLayers = [
  'SecurityMiddleware',
  'SessionMiddleware',
  'CommonMiddleware',
  'CsrfViewMiddleware',
  'AuthenticationMiddleware',
  'MessageMiddleware',
  'XFrameOptionsMiddleware',
]

export const CSRF_LAYER = 3

/*
 * Step shape:
 *   phase: 'in'     marker on the request lane at `layer` (code before get_response)
 *          'resolve' URL resolved, marker at the centre entrance
 *          'process_view' process_view() hooks; `layer` is the middleware whose hook acts
 *          'view'   the view runs
 *          'out'    marker on the response lane at `layer` (code after get_response)
 *          'done'   the response has left the onion
 *   status: response status carried by the marker on the way out
 *   viewSkipped: true when the view is never called
 */

const IN_STEPS = (csrfCaption) => [
  {
    phase: 'in',
    layer: 0,
    caption:
      'SecurityMiddleware sees the request first. SECURE_SSL_REDIRECT is off by default, so there is no HTTPS redirect and the request moves on.',
  },
  {
    phase: 'in',
    layer: 1,
    caption: 'SessionMiddleware reads the session cookie and attaches request.session. The data loads only when used.',
  },
  {
    phase: 'in',
    layer: 2,
    caption: 'CommonMiddleware checks DISALLOWED_USER_AGENTS and PREPEND_WWW. Neither applies, so the request continues.',
  },
  { phase: 'in', layer: 3, caption: csrfCaption },
  {
    phase: 'in',
    layer: 4,
    caption: 'AuthenticationMiddleware sets request.user, a lazy object that reads the user from the session when first used.',
  },
  {
    phase: 'in',
    layer: 5,
    caption: 'MessageMiddleware attaches the message storage to the request.',
  },
  {
    phase: 'in',
    layer: 6,
    caption: 'XFrameOptionsMiddleware has no request step. It calls get_response at once; its work happens on the way out.',
  },
]

const OUT_STEPS = (status, xFrameCaption, csrfCaption) => [
  { phase: 'out', layer: 6, status, caption: xFrameCaption },
  {
    phase: 'out',
    layer: 5,
    status,
    caption: 'MessageMiddleware stores any messages that were not displayed. There are none here.',
  },
  {
    phase: 'out',
    layer: 4,
    status,
    caption: 'AuthenticationMiddleware has no response step, so the response passes through unchanged.',
  },
  { phase: 'out', layer: 3, status, caption: csrfCaption },
  {
    phase: 'out',
    layer: 2,
    status,
    caption: 'CommonMiddleware sets Content-Length. APPEND_SLASH would act only on a 404, so nothing else changes.',
  },
  {
    phase: 'out',
    layer: 1,
    status,
    caption: 'SessionMiddleware saves the session if it was modified and adds Vary: Cookie if the session was read.',
  },
  {
    phase: 'out',
    layer: 0,
    status,
    caption: 'SecurityMiddleware sees the response last and adds X-Content-Type-Options: nosniff, Referrer-Policy and Cross-Origin-Opener-Policy.',
  },
]

export const middlewareOnion = {
  normal: {
    request: 'GET /blog/42/',
    steps: [
      ...IN_STEPS(
        'CsrfViewMiddleware reads the CSRF cookie, if any. The token check itself happens later, in process_view().',
      ),
      {
        phase: 'resolve',
        caption: 'Every layer has passed the request inwards. The URL resolver now picks post_detail with {"pk": 42}.',
      },
      {
        phase: 'process_view',
        layer: CSRF_LAYER,
        caption:
          'process_view() hooks run top to bottom. CsrfViewMiddleware’s accepts the request because GET is a safe method, and returns None.',
      },
      {
        phase: 'view',
        status: 200,
        caption: 'The view post_detail(request, pk=42) runs and returns an HttpResponse with status 200.',
      },
      ...OUT_STEPS(
        200,
        'XFrameOptionsMiddleware, the innermost layer, sees the response first and adds X-Frame-Options: DENY.',
        'CsrfViewMiddleware sets the csrftoken cookie only if the page used a token. This one did not.',
      ),
      {
        phase: 'done',
        status: 200,
        caption: 'The 200 OK response has passed every layer in reverse order and returns to the WSGI handler.',
      },
    ],
  },

  // POST /blog/42/ from a form without {% csrf_token %}: the cookie exists, the token does not.
  shortCircuit: {
    request: 'POST /blog/42/ (no CSRF token)',
    steps: [
      ...IN_STEPS(
        'CsrfViewMiddleware reads the csrftoken cookie into request.META. Nothing is rejected here: the check happens in process_view().',
      ),
      {
        phase: 'resolve',
        caption: 'Every layer has passed the request inwards. The URL resolver picks post_detail with {"pk": 42}.',
      },
      {
        phase: 'process_view',
        layer: CSRF_LAYER,
        status: 403,
        viewSkipped: true,
        caption:
          'CsrfViewMiddleware.process_view(): POST is not a safe method and the request has no token, so it returns 403 Forbidden (reason: "CSRF token missing.").',
      },
      {
        phase: 'view',
        status: 403,
        viewSkipped: true,
        caption:
          'Because a process_view() returned a response, the view is never called and the remaining process_view() hooks are skipped.',
      },
      ...OUT_STEPS(
        403,
        'Every __call__ already passed the request inwards, so the 403 still goes out through all seven layers. XFrameOptionsMiddleware adds X-Frame-Options: DENY.',
        'CsrfViewMiddleware’s response step runs as usual. No token was used, so no cookie is set.',
      ),
      {
        phase: 'done',
        status: 403,
        caption: 'The 403 Forbidden response leaves through every layer. Only the view was skipped.',
      },
    ],
  },
}

/* ------------------------------------------------------------------ */
/* V3. URL matching: /blog/2024/django-tips/                           */
/* ------------------------------------------------------------------ */

export const urlMatching = {
  requestPath: '/blog/2024/django-tips/',
  files: [
    {
      name: 'mysite/urls.py',
      note: 'ROOT_URLCONF',
      patterns: [
        { id: 'home', code: 'path("", views.home, name="home")' },
        { id: 'blog', code: 'path("blog/", include("blog.urls"))' },
        { id: 'about', code: 'path("about/", views.about, name="about")' },
      ],
    },
    {
      name: 'blog/urls.py',
      note: 'included under "blog/"',
      patterns: [
        { id: 'detail', code: 'path("<int:pk>/", views.post_detail, name="post-detail")' },
        { id: 'byYear', code: 'path("<int:year>/<slug:slug>/", views.post_by_year, name="post-by-year")' },
      ],
    },
  ],
  /*
   * status per pattern id: 'untested' | 'testing' | 'no-match' | 'prefix' (include matched) | 'match' | 'never'
   * remaining: the part of the path still to be matched (no leading slash)
   * consumed: the part already matched by include()
   */
  steps: [
    {
      testing: null,
      consumed: '',
      remaining: 'blog/2024/django-tips/',
      status: {},
      caption:
        'Django starts at ROOT_URLCONF (mysite.urls). It matches blog/2024/django-tips/: the path without its leading slash.',
    },
    {
      testing: 'home',
      consumed: '',
      remaining: 'blog/2024/django-tips/',
      status: { home: 'no-match' },
      caption: 'Pattern "" matches only an empty path. No match, so Django tries the next pattern.',
    },
    {
      testing: 'blog',
      consumed: 'blog/',
      remaining: '2024/django-tips/',
      status: { home: 'no-match', blog: 'prefix' },
      caption:
        '"blog/" uses include(), so it only needs to match the start of the path. It does. Django removes blog/ and continues in blog.urls with 2024/django-tips/.',
    },
    {
      testing: 'detail',
      consumed: 'blog/',
      remaining: '2024/django-tips/',
      status: { home: 'no-match', blog: 'prefix', detail: 'no-match' },
      caption:
        '"<int:pk>/" could match 2024/, but a pattern without include() must match the whole remainder, and django-tips/ is left over. No match.',
    },
    {
      testing: 'byYear',
      consumed: 'blog/',
      remaining: '2024/django-tips/',
      status: { home: 'no-match', blog: 'prefix', detail: 'no-match', byYear: 'match' },
      caption:
        '"<int:year>/<slug:slug>/" matches: 2024 fits int and django-tips fits slug. The int converter turns "2024" into the integer 2024.',
    },
    {
      testing: null,
      consumed: 'blog/',
      remaining: '2024/django-tips/',
      status: { home: 'no-match', blog: 'prefix', detail: 'no-match', byYear: 'match', about: 'never' },
      resolved: {
        view: 'blog.views.post_by_year',
        kwargs: '{"year": 2024, "slug": "django-tips"}',
        urlName: 'post-by-year',
        route: 'blog/<int:year>/<slug:slug>/',
      },
      caption:
        'The first match wins, so "about/" is never tested. Django calls post_by_year(request, year=2024, slug="django-tips").',
    },
  ],
}
