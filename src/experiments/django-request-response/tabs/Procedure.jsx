import Callout from '../../../components/content/Callout.jsx'
import CodeBlock from '../../../components/content/CodeBlock.jsx'
import Flowchart from '../../../components/content/Flowchart.jsx'
import styles from './Procedure.module.css'

const MIDDLEWARE_FLOW = [
  { type: 'start', text: 'Open the Simulation tab and choose Middleware lab' },
  { type: 'step', text: 'Choose the request and what the view does' },
  { type: 'step', text: 'Arrange MIDDLEWARE: move, remove or add middleware' },
  { type: 'step', text: 'Predict the status code and whether the view will run' },
  { type: 'step', text: 'Press Start' },
  { type: 'step', text: 'Press Next (or Run to end) and read the newest step card' },
  { type: 'decision', text: 'More steps left?', yes: 'back to step 6', no: 'go to step 8' },
  { type: 'step', text: 'Read the Result: console output, status, headers and your prediction' },
  { type: 'decision', text: 'Try another setup?', yes: 'press Reset, back to step 2', no: 'go to step 10' },
  { type: 'end', text: 'Explain each result in your own words' },
]

const URL_FLOW = [
  { type: 'start', text: 'Open the Simulation tab and choose URL resolver lab' },
  { type: 'step', text: 'Pick a starting URLconf, or build your own patterns' },
  { type: 'step', text: 'Enter the path; choose the method, APPEND_SLASH and DEBUG' },
  { type: 'step', text: 'Predict the outcome: which view, a 404, or a redirect' },
  { type: 'step', text: 'Press Start (fix any route errors first)' },
  { type: 'step', text: 'Press Next (or Run to end) and read how each pattern is tested' },
  { type: 'decision', text: 'More steps left?', yes: 'back to step 6', no: 'go to step 8' },
  { type: 'step', text: 'Read the Result: the outcome, the kwargs or tried patterns, and urls.py as tested' },
  { type: 'decision', text: 'Try another path or URLconf?', yes: 'press Reset, back to step 2', no: 'go to step 10' },
  { type: 'end', text: 'Explain each result in your own words' },
]

const SETUP = `
python -m venv .venv

# Windows
.venv\\Scripts\\activate
# macOS / Linux
source .venv/bin/activate

pip install django
`

const START = `
django-admin startproject mysite
cd mysite
python manage.py migrate
`

const LOGGERS = `
class LoggingMiddleware:
    label = "logger"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        print(f"[{self.label}] request in:   {request.method} {request.path}")
        response = self.get_response(request)
        print(f"[{self.label}] response out: {response.status_code}")
        return response


class OuterLogger(LoggingMiddleware):
    label = "outer"


class InnerLogger(LoggingMiddleware):
    label = "inner"
`

const SETTINGS = `
MIDDLEWARE = [
    "mysite.middleware.OuterLogger",  # first: sees the request first, the response last
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "mysite.middleware.InnerLogger",  # last: closest to the view
]
`

const RUN = `
python manage.py runserver
`

const EXPECTED = `
[outer] request in:   GET /admin/login/
[inner] request in:   GET /admin/login/
[inner] response out: 200
[outer] response out: 200
`

const SHORT_CIRCUIT = `
from django.http import HttpResponse


class InnerLogger(LoggingMiddleware):
    label = "inner"

    def __call__(self, request):
        print(f"[{self.label}] request in:   {request.method} {request.path}")
        return HttpResponse("Stopped by InnerLogger")  # get_response is never called
`

const SHORT_CIRCUIT_EXPECTED = `
[outer] request in:   GET /admin/login/
[inner] request in:   GET /admin/login/
[outer] response out: 200
`

export default function Procedure() {
  return (
    <>
      <h2>Part A: Simulation</h2>
      <p>
        The Simulation tab has two labs. Each has three panels: <strong>Problem</strong> (set up the
        experiment), <strong>Step Execute</strong> (what Django does, one step per Next) and{' '}
        <strong>Result</strong>. The flowcharts show the order of work; the numbered steps below explain each part.
      </p>
      <div className={styles.flows}>
        <Flowchart title="Middleware lab" nodes={MIDDLEWARE_FLOW} />
        <Flowchart title="URL resolver lab" nodes={URL_FLOW} />
      </div>

      <h3>Middleware lab</h3>
      <ol>
        <li>Open the Simulation tab and choose <strong>Middleware lab</strong>.</li>
        <li>
          Choose a <strong>request</strong> and what the <strong>view</strong> does. Use “Show the view code” to read
          the Python.
        </li>
        <li>
          Arrange <code>MIDDLEWARE</code> with Up, Down and Remove, or add a built-in or custom middleware. Each custom
          middleware has a “Show code” link.
        </li>
        <li>Predict the status code and whether the view will run.</li>
        <li>
          Press <strong>Start</strong>, then <strong>Next</strong> to go one step at a time. The indentation of each line
          shows how deep in the onion it runs; the current line is in red and explained underneath.
        </li>
        <li>
          At the end, read the <strong>Result</strong> panel: console output, status, what produced the response, the
          headers, and how your prediction compares. Press <strong>Reset</strong> to change the setup.
        </li>
      </ol>
      <p>Try these and explain each result:</p>
      <ul>
        <li>
          The default list with <code>GET /blog/42/</code> (200), then a POST without a CSRF token (403: the view never
          runs, yet the response still passes back through every layer).
        </li>
        <li>
          <code>MaintenanceMiddleware</code> at the top of the list, then at the bottom. Both give 503; compare which
          layers see the request.
        </li>
        <li>
          Move <code>SessionMiddleware</code> below <code>AuthenticationMiddleware</code> (500,{' '}
          <code>ImproperlyConfigured</code>).
        </li>
        <li>
          Add <code>FriendlyErrorMiddleware</code>, then try the views that raise <code>Http404</code>, raise{' '}
          <code>ValueError</code>, and forget to return. Why does the last one bypass{' '}
          <code>process_exception()</code>?
        </li>
        <li>
          Add <code>TemplateSwapMiddleware</code> and compare the <code>render()</code> view with the{' '}
          <code>TemplateResponse</code> view.
        </li>
        <li>
          Put <code>ReadOnlyMiddleware</code> above <code>CsrfViewMiddleware</code> and send a POST without a token
          (405, not 403).
        </li>
      </ul>

      <h3>URL resolver lab</h3>
      <ol>
        <li>
          Choose <strong>URL resolver lab</strong> and pick a starting URLconf, or build your own with Add path() and
          Add include(). Edit each route, view and name directly; Django’s errors for invalid routes appear under the
          pattern.
        </li>
        <li>
          Enter a request path, choose GET or POST, and set <code>APPEND_SLASH</code> and <code>DEBUG</code>.
        </li>
        <li>Predict the outcome, press Start, and step through. Each tested line is marked “no match”, “match” or “prefix matched”.</li>
      </ol>
      <p>Try these and explain each result:</p>
      <ul>
        <li>
          “Order trap”: <code>/articles/new/</code> calls <code>article</code>. Move <code>articles/new/</code> up and
          run it again.
        </li>
        <li>
          “Missing trailing slash”: <code>/blog/2024</code> with <code>APPEND_SLASH</code> on (301) and off (404); then
          a POST with <code>DEBUG</code> on (<code>RuntimeError</code>).
        </li>
        <li>
          “Theory example”: <code>/blog/0042/</code> (what is <code>pk</code>?) and <code>/blog/abc/</code> (which
          patterns were tried?).
        </li>
        <li>“Empty URLconf”: <code>DEBUG</code> on, then off.</li>
      </ul>

      <h2>Part B: Try it on your machine</h2>
      <p>
        These steps reproduce the middleware order from the Theory section on a real project.
        They need Python 3.12 or later, which Django 6.x requires.
      </p>

      <h3>Step 1. Install Django</h3>
      <p>Create a virtual environment, activate it and install Django:</p>
      <CodeBlock code={SETUP} language="text" />

      <h3>Step 2. Create a project</h3>
      <p>
        Create a project named <code>mysite</code> and apply the initial migrations, which the
        admin pages used in step 4 need:
      </p>
      <CodeBlock code={START} language="text" />

      <h3>Step 3. Add a printing middleware in two positions</h3>
      <p>
        Create <code>mysite/middleware.py</code> (next to <code>settings.py</code>) with one
        printing middleware and two named copies of it:
      </p>
      <CodeBlock title="mysite/middleware.py" code={LOGGERS} />
      <p>
        In <code>mysite/settings.py</code>, put <code>OuterLogger</code> at the top of{' '}
        <code>MIDDLEWARE</code> and <code>InnerLogger</code> at the bottom:
      </p>
      <CodeBlock title="mysite/settings.py" code={SETTINGS} />

      <h3>Step 4. Run the server and watch the order</h3>
      <CodeBlock code={RUN} language="text" />
      <p>
        Open <code>http://127.0.0.1:8000/admin/login/</code> in a browser and look at the
        terminal. For this request you should see:
      </p>
      <CodeBlock code={EXPECTED} language="text" />
      <p>
        The request passes <code>OuterLogger</code> before <code>InnerLogger</code>; the response
        passes them in the reverse order. Each request is followed by the development server’s
        own log line. The browser may also request <code>/favicon.ico</code>, which produces a
        second block ending in <code>404</code>.
      </p>

      <h3>Step 5. Short-circuit the inner layer</h3>
      <p>
        Replace <code>InnerLogger</code> with a version that returns a response without calling{' '}
        <code>get_response</code>, and reload the page:
      </p>
      <CodeBlock title="mysite/middleware.py" code={SHORT_CIRCUIT} />
      <CodeBlock code={SHORT_CIRCUIT_EXPECTED} language="text" />
      <p>
        The browser shows “Stopped by InnerLogger”. The view never ran, and the response went
        back out only through the layers the request had already passed.
      </p>
      <Callout>
        <p>
          Restore the original <code>InnerLogger</code> afterwards, or remove both loggers from{' '}
          <code>MIDDLEWARE</code>.
        </p>
      </Callout>
    </>
  )
}
