/*
 * Pretest: prerequisite questions (single level). Same shape as posttestBank.js.
 * Text may use `code` and **bold**. Every source URL was checked to resolve on 2026-10-04.
 */
export const pretest = [
  {
    id: 'pre-http-method-01',
    topic: 'request',
    levels: ['easy'],
    question: 'Which HTTP method is normally used to submit a form that creates or changes data on the server?',
    options: ['GET', 'POST', 'HEAD', 'OPTIONS'],
    answer: 1,
    explanation:
      'POST sends data in the request body for the server to process, such as creating a record. GET is the tempting choice because it is the most common method, but GET is meant only to retrieve data and should not change anything on the server.',
    source: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods',
  },
  {
    id: 'pre-status-codes-01',
    topic: 'response',
    levels: ['easy'],
    question: 'Which pairing of an HTTP status code and its meaning is correct?',
    options: [
      '301 Moved Permanently: the server hit an internal error',
      '403 Forbidden: the requested page does not exist',
      '200 OK: the request succeeded',
      '500 Internal Server Error: the page has moved to a new URL',
    ],
    answer: 2,
    explanation:
      '200 OK means the request succeeded. The others are mixed up: 301 means the resource has moved permanently, 403 means the server refuses the request (for example, missing permission), 404 means the page was not found, and 500 means the server failed with an internal error. 403 and 404 are the pair most often confused.',
    source: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status',
  },
  {
    id: 'pre-url-parts-01',
    topic: 'urls',
    levels: ['easy'],
    question: 'In the URL `https://example.com/blog/42/?page=2`, which part is the **path**?',
    options: ['`example.com`', '`/blog/42/`', '`?page=2`', '`https`'],
    answer: 1,
    explanation:
      'The path is `/blog/42/`, the part after the domain and before the `?`. `?page=2` is tempting because it follows the path, but it is the query string (parameters), `example.com` is the domain and `https` is the scheme. Django matches URL patterns against the path only.',
    source: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL',
  },
  {
    id: 'pre-mvt-01',
    topic: 'view',
    levels: ['easy'],
    question:
      'Django follows a Model–View–Template (MVT) design. Which part decides which data is presented in response to a request?',
    options: ['The model', 'The template', 'The view', 'The URLconf'],
    answer: 2,
    explanation:
      'In Django the view is the Python function or class that handles a request and decides which data is presented; it usually hands that data to a template. The template is tempting, but it only describes how the data looks. The model describes how data is stored, and the URLconf only maps URLs to views.',
    source: 'https://docs.djangoproject.com/en/stable/faq/general/',
  },
  {
    id: 'pre-web-server-01',
    topic: 'wsgi',
    levels: ['easy'],
    question: 'What is the main job of a web server such as Nginx placed in front of a Django site?',
    options: [
      'Rendering Django templates into HTML',
      'Running database migrations',
      'Accepting HTTP connections, serving static files and forwarding other requests to the application server',
      'Storing user passwords',
    ],
    answer: 2,
    explanation:
      'A web server accepts HTTP connections from browsers, serves static files directly and passes other requests on to the application server (for example Gunicorn) that runs Django. Rendering templates is tempting, but that happens inside Django, in the view.',
    source: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_web_server',
  },
]
