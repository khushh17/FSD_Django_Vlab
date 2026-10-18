# Django Request–Response Cycle — Virtual Lab

A Virtual Labs experiment for Somaiya Vidyavihar University on the Django request–response
cycle. Built with Vite + React 18, plain CSS (CSS Modules), and `react-router-dom`'s
`HashRouter` so it can be hosted on GitHub Pages. The layout follows the IIT Bombay Virtual
Labs experiment pages (see `references/screenshots/`).

## Requirements

- Node.js 20.19+ or 22.12+ (Vite 8)

## Scripts

```bash
npm install        # install dependencies
npm run dev        # development server at http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build locally
npm run lint       # oxlint (React, hooks and jsx-a11y rules)
npm run deploy     # build, then publish dist/ to the gh-pages branch
```

## Deploying

The site and the backend go on Vercel: follow [DEPLOY.md](DEPLOY.md). The steps below
put the site alone on GitHub Pages; that works only without the backend (no sign-in, no
records), because GitHub Pages cannot run Django.

### GitHub Pages (site only)

1. Create the GitHub repository and push this project to it (the folder is not a git
   repository yet).
2. Run `npm run deploy`. It builds the site and pushes `dist/` to a `gh-pages` branch
   (with a `.nojekyll` file) using the `gh-pages` package.
3. In the repository on GitHub: **Settings → Pages → Build and deployment → Source:
   Deploy from a branch**, branch `gh-pages`, folder `/ (root)`.

The site is then served at `https://<user>.github.io/<repo>/`.

`vite.config.js` uses `base: './'` (relative asset paths). Because the app uses
`HashRouter`, the document URL never changes, so the build works under any repository
name without configuration. This was tested by serving the build from a `/django-vlab/`
sub-path: assets, fonts, logos, diagrams, deep links (`#/experiments/…/posttest`) and
back/forward all work.

`gh-pages` is pinned to 6.1.1: 6.2+ depends on a `braces` version with an open advisory
(`npm audit`); 6.1.1 has the same options and audits clean.

## Where things live

```
public/diagrams/                 diagram images for the Theory tab (add the PNGs here)
src/styles/global.css            design tokens (colours, fonts, sizes) and tab content styles
src/config/site.js               footer content and Feedback form settings
src/components/layout/           header, orange bar, breadcrumb, sidebar, drawer, footer, Rate popup
src/components/content/          Figure, CodeBlock, Callout, TableScroll, Flowchart
src/components/viz/              Stepper, useStepper, VizFrame (shared by the visualizations)
src/components/quiz/             quiz engine (Quiz, LevelPicker, QuestionCard, ResultSummary)
src/experiments/django-request-response/
  meta.js                        title, breadcrumb, tabs, Report a Bug URL, rating
  tabs/                          one component per sidebar tab (each is its own route)
  viz/                           RequestJourney, MiddlewareOnion, UrlMatcher
  data/                          pretest.js, posttestBank.js, references.js, contributors.js, vizSteps.js
  simulation/                    Simulation tab: Middleware lab + URL resolver lab
    engine/                      pure-JS models of Django's handler and URL resolver
scripts/sim-check/               differential tests: the engines vs real Django
```

### Adding the diagrams

Put these files in `public/diagrams/` and fill in `credit` / `creditUrl` for each
`<Figure>` in `tabs/Theory.jsx`. Until a file exists, its slot shows a dashed box with the
expected filename.

- `cycle-overview.png` — the full request → response flow
- `middleware-onion.png` — the onion / layer view
- `middleware-hooks-flow.png` — the hook-by-hook flow
- `url-resolution.png` — URL resolver matching

### Editing the quizzes

Questions live in `data/pretest.js` and `data/posttestBank.js`, in the shape documented at
the top of `posttestBank.js`. Each Posttest level shows 10 questions drawn from that
level's pool, spread across topics; Retake shuffles question and option order. The last
score per level is kept in `localStorage`.

## Content accuracy

Content targets the Django **stable** docs (6.1 at the time of writing). Behavioural
claims in the Theory text, the visualizations and the quiz answers were checked by
running the scenarios on Django 6.1.1, and the Procedure's console output was reproduced
on a real `startproject`. Every reference and question source URL was checked to resolve.

## Simulation

The Simulation tab has two labs in the reference simulator's three-panel layout
(Problem / Step Execute / Result, with Start, Next, Run to end and Reset):

- **Middleware lab**: arrange `MIDDLEWARE` (the 7 defaults plus 5 custom middleware),
  choose a request and what the view does, predict the status and whether the view runs,
  then step through `__call__`, `process_view`, `process_exception`,
  `process_template_response`, exception conversion and rendering.
- **URL resolver lab**: build `urlpatterns` (any `path()` route, one level of `include()`),
  enter a path, set `APPEND_SLASH` and `DEBUG`, predict the outcome, then step through
  resolution: matches with typed kwargs, 404 with the tried list, 301 redirects, the
  `RuntimeError` for POST under `DEBUG`, and the empty-URLconf welcome page.

Both labs run on deterministic JavaScript models (`simulation/engine/`). The Python code
shown for the custom middleware and views is the same code the tests execute.

### Re-checking the engines against Django

```bash
python -m venv .venv-check && .venv-check/Scripts/pip install django   # macOS/Linux: .venv-check/bin/pip
node scripts/sim-check/generate-middleware-cases.mjs mw-cases.json 3000
.venv-check/Scripts/python scripts/sim-check/check_middleware.py mw-cases.json
node scripts/sim-check/generate-url-cases.mjs url-cases.json 4000
.venv-check/Scripts/python scripts/sim-check/check_urls.py url-cases.json
```

On Django 6.1.1: 3,240 middleware cases and 4,000 URL cases, 0 mismatches. Deliberately
broken copies of the engines (wrong hook order, short-circuit that still calls inward, no
`APPEND_SLASH` `RuntimeError`, and others) are all caught, so a clean run is meaningful.
Run these again after changing an engine, or after a new Django release.

## Backend (student records)

`backend/` is a Django project that stores what students do on the site: pretest and
posttest attempts (with every answer), simulation runs (setup, prediction, outcome),
ratings, feedback and bug reports. Students sign in with their Google account on the
university domain and enter their roll number once.

Without `VITE_API_URL` the site works exactly as before: no sign-in, nothing is sent.

### Running it locally

Needs Python 3.12 or later.

```bash
cd backend
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py runserver 127.0.0.1:8000
```

Then, in the project root, copy `.env.example` to `.env.local` and run `npm run dev`.
Locally the data goes to `backend/db.sqlite3`. With `DEV_LOGIN=1` (backend) and
`VITE_DEV_LOGIN=1` (site), the sign-in popup also has a test form that signs in as any
email without Google; it only works with `DJANGO_DEBUG=1` and is left out of production
builds.

`npm run build` also reads `.env.local`, so a local build points at `127.0.0.1:8000`. On
Vercel, set the variables in the project settings instead.

### Admin

The professor's account is a Django superuser. Create it yourself (it asks for a password):

```bash
backend\.venv\Scripts\python backend\manage.py createsuperuser
```

The admin pages are part of the site at `#/admin` (locally
`http://localhost:5173/#/admin`). They sign in with that username and password, and are a
separate bundle that students never download.

| Page | Shows |
| --- | --- |
| Overview | Students, progress (pretest, simulation, posttest), learning gain, first-attempt scores per test, simulation prediction accuracy, ratings |
| Students | One row per student for marking: best and first score per test, attempts, simulation runs, rating, last seen. Search by roll number, name or email |
| Student (click a roll number) | Every attempt with each answer (question text, chosen and correct option), every simulation run, their feedback |
| Quiz analysis | Per test and level: score spread, then each question hardest first, with the most chosen wrong answer |
| Simulation analysis | Runs grouped by setup, hardest to predict first, with the actual outcome and the wrong predictions students made most |
| Feedback | Every message, newest first, searchable, linked to the student |
| Bug reports | Open, fixed or all; mark a report fixed or reopen it |

The sign-in lasts 12 hours and ends when the tab is closed; changing the password signs
out everywhere. After 5 wrong passwords for a username, sign-in is blocked for 15 minutes.

"Raw data" in the admin header opens Django's built-in admin (`/admin/` on the backend),
where records can be browsed and filtered, a roll number corrected or a bug marked fixed.

### Demo data

To try the admin pages with realistic numbers (development only):

```bash
backend\.venv\Scripts\python backend\manage.py seed_demo
```

This adds 24 made-up students (roll numbers `DEMO001` to `DEMO024`) with attempts, runs,
ratings, feedback and a bug report. It also creates a local admin from `DEV_ADMIN_USERNAME`
and `DEV_ADMIN_PASSWORD` in `backend/.env`, if they are set. `seed_demo --clear` removes the
demo students again. It needs Node, which it uses to read the question banks
(`scripts/export-question-banks.mjs`).

### API

| Endpoint | What it does |
| --- | --- |
| `POST /api/auth/google` | Checks the Google ID token (`hd` must be the university domain); returns a sign-in token |
| `POST /api/auth/dev` | Test sign-in (only with `DJANGO_DEBUG=1` and `DEV_LOGIN=1`) |
| `GET /api/me` | The student and their ratings |
| `POST /api/me/roll-number` | Saves the roll number (once; the admin can change it later) |
| `POST /api/events` | Quiz attempts and simulation runs, up to 50 per request |
| `POST /api/ratings`, `/api/feedback`, `/api/bug-reports` | The Rate Me, Feedback and Report a Bug forms |
| `POST /api/admin/login`, `GET /api/admin/...` | Admin sign-in and the admin pages' data (`overview`, `students`, `students/<id>`, `quiz`, `simulation`, `feedback`, `bugs`); `POST /api/admin/bugs/<id>` marks a bug open or fixed |

Requests carry `Authorization: Bearer <token>`. The token expires after 7 days. Quiz
attempts and simulation runs wait in the browser (`localStorage`) until the server accepts
them, so a dropped connection does not lose them. Each record has a browser-made ID, so
one sent twice is stored once.

### Tests

```bash
backend\.venv\Scripts\python backend\manage.py test labs
```

### Known limits (later phases)

- Quiz scores are worked out in the browser. The server checks that the score matches the
  answers sent, but a student who edits requests could still send made-up answers. To stop
  that, the server needs the answer keys.
- No rate limiting yet on the student endpoints. The admin lockout counts wrong passwords in Django's
  cache, which on Vercel is per server instance, so it slows guessing but is not a hard limit.
- Signing out does not cancel an issued token; it just expires after 7 days.

## Accessibility

Semantic landmarks, a skip link, keyboard-operable sidebar, drawer, Rate popup,
visualizations and quizzes, alt text on every image, `prefers-reduced-motion` support
(autoplay off, no transitions), and an axe-core scan with no violations at 360, 768 and
1280 px. Text and button colours are the reference values darkened just enough to meet
WCAG AA contrast (see the comments in `global.css`).

## Open TODOs

Everything still to do, grouped by who can do it. Search the code for `TODO` to find the
items marked in it.

### Accounts and setup (you)

| Item | Where / how |
| --- | --- |
| Create the Google OAuth client ID (free, no billing needed) and put it in `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` | Google Cloud Console; `backend/.env`, `.env.local`, later Vercel settings |
| Create the professor's admin account | On Vercel: the `DJANGO_SUPERUSER_*` variables (DEPLOY.md, step 2). Locally: `createsuperuser` |
| Create the GitHub repository and push (needed for Vercel) | `git init`, then GitHub |
| Remove the demo data before real use (local database only) | `backend\.venv\Scripts\python backend\manage.py seed_demo --clear` |

### Content (waiting on the professor)

| Item | Where |
| --- | --- |
| Developer names, emails and IDs (4 rows); Subject Matter Experts table | `data/contributors.js` |
| Roll number format (now: 4–20 letters, digits, `/` or `-`) | `backend/labs/models.py` |
| Google Form URL for the Feedback tab (optional now that feedback is built in), and the sign-off name | `src/config/site.js` |
| Breadcrumb links (Computer Science and Engineering, Python, Django) | `meta.js` |
| The four diagram images and their source credits | `public/diagrams/`, `tabs/Theory.jsx` |
| Footer contact phone and email, further community links | `src/config/site.js` |
| Confirm the AGPL 3.0 / CC BY-NC-SA 4.0 licences apply | `src/config/site.js` |
| Favicon | `index.html` |
| Report a Bug: optional external URL (otherwise the built-in form is used) | `meta.js` |

### Deployment (Vercel + Neon)

| Item | Notes |
| --- | --- |
| Follow [DEPLOY.md](DEPLOY.md): two Vercel projects (site, and `backend/`), Neon Postgres, environment variables | The config files are written; migrations and the admin account run in the backend's build |
| Add the Vercel site address to the Google OAuth client's allowed origins | Google Cloud Console |
| First live test: Google sign-in has only been tested with the local test sign-in so far | DEPLOY.md, step 5 |

### Later features (phase 4 and after)

| Item | Notes |
| --- | --- |
| CSV export of students, attempts and runs (for marking) | Admin pages |
| Landing page listing every experiment; merge other students' experiments | `src/experiments/registry.js`, `LAB_EXPERIMENTS` in `backend/config/settings.py` |
| Show the average rating in the header from the backend (instead of `meta.rating`) | Needs a public ratings summary endpoint |
| Check quiz answers on the server (send it the answer keys) | See Known limits |
| Rate limiting on student endpoints; a shared store for the admin lockout | See Known limits |
| Students list currently shows every signed-in student, also those from other experiments | Filter by class or experiment once there are several |
