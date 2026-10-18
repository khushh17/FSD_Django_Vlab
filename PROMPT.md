# Build: Django Request–Response Cycle — Virtual Lab (React)

You are building a virtual lab experiment for **Somaiya Vidyavihar University**. The layout copies the IIT Bombay **Virtual Labs** site (vlab.co.in). The topic is the **Django request–response cycle**. It is built in **React**.

Read this whole file before writing any code.

---

## 0. How to work

1. **Study the reference first.**
   - Screenshots of the real Virtual Labs site are in `reference/screenshots/`. They are the **only source of truth** for the look.
   - Section 2 gives a starting colour theme that was approximated in an earlier build. Use it as a starting point, then correct every value against the screenshots: colours, font sizes, spacing, borders, the sidebar active state and button shapes.
   - When the theme and a screenshot disagree, the screenshot wins. List every value you changed in your phase report.
2. **Plan before coding.** Your first reply is only a plan: the file tree, the component list, the routes, and any questions. Wait for my approval.
3. **Build in phases** and stop after each one so I can check it:
   - Phase 1: scaffold and layout shell (header, orange bar, subheader, sidebar, footer, routing). No content yet.
   - Phase 2: all content tabs except quizzes and visualizations.
   - Phase 3: the three Theory visualizations (section 5).
   - Phase 4: quiz engine and question bank.
   - Phase 5: responsive pass, accessibility pass, and GitHub Pages deploy setup.
   After each phase, run `npm run build` and `npm run lint` and fix everything before reporting back.
4. **Ask, don't invent.** If a name, logo, link or fact is missing, leave a clearly marked `TODO:` and list it in your phase report. Never make up contributor names, statistics or citations.

---

## 1. Tech stack

- **Vite + React 18**, JavaScript (no TypeScript).
- **react-router-dom** with **HashRouter**, because the site will be hosted on GitHub Pages.
- **Plain CSS**:
  - one global stylesheet, `src/styles/global.css`, holding all design tokens as CSS variables;
  - CSS Modules for each component.
- **Do NOT use** Tailwind, Bootstrap, MUI, shadcn, Chakra or any other UI kit. They change the look.
- **Code highlighting**: `prism-react-renderer` with a light theme.
- **Visualizations**: hand-written React + inline SVG + CSS transitions. Do not use D3, framer-motion, GSAP or chart libraries.
- `vite.config.js`: set `base: '/<REPO_NAME>/'` (TODO: I will give you the repo name). Add a `deploy` script using `gh-pages`.

---

## 2. Starting theme (approximate — correct it against the screenshots)

```css
:root{
  --orange:#F4761F;            /* accent bar under header, active sidebar tab */
  --blue-link:#3E86C4;         /* logo text, nav links, headings, breadcrumb, buttons */
  --green-accent:#7CBB3F;      /* "Labs" in the Virtual Labs wordmark */
  --sidebar-inactive:#3B6E8F;
  --sidebar-active:#F4761F;
  --border:#E4E7EA;
  --text:#2B2F33;
  --muted:#8A8A8A;
  --star:#F4C430;
  --font: "Segoe UI", Arial, sans-serif;
}
```

Starting measurements:
- **Header**: padding `14px 30px`, 1px bottom border; nav links 14px, weight 600, gap 34px, uppercase (HOME / PARTNERS / CONTACT).
- **Orange bar**: 4px tall.
- **Domain title**: 26px, blue.
- **Subheader**: padding `16px 30px`, 1px bottom border. Breadcrumb 15px blue, with `>` separators in `#B7C2CA`. "Rate Me" and "Report a Bug" are pill buttons: blue background, white 13px text, radius 16px, padding `8px 18px`.
- **Sidebar**: 230px wide, 1px right border. Links 15px, padding `11px 28px`, 3px left border. Active link is orange text, orange left border, weight 600. Hover background `#F6F8F9`.
- **Content area**: padding `36px 40px`. h2 is 22px blue.

---

## 3. Layout and UI (must match the screenshots)

**Header** (same on every page), left to right:
1. Hamburger icon.
2. **Somaiya logo** (`src/assets/img/somaiya-logo.png`).
3. **Virtual Labs logo** (`src/assets/img/vlabs-logo.png`), placed to the **right** of the Somaiya logo.
4. Star rating.
5. Nav links, pushed to the right.

Both logos have the same visual height and are vertically centred, with the gap matching the screenshot spacing. Both link to Home. Give them meaningful alt text.

Under the header comes the orange accent bar.

**Experiment page**
- A subheader with the breadcrumb (Domain > Lab > current tab) and the Rate Me / Report a Bug buttons. The buttons link to TODO URLs.
- Left sidebar tabs, in this order: Aim, Theory, Pretest, Procedure, Simulation, Posttest, References, Contributors, Feedback.
- **Each tab is its own route**, e.g. `#/experiments/django-request-response/theory`, so back/forward and shared links work. The bare experiment URL redirects to `aim`.
- The breadcrumb's last item updates to show the current tab.

**Home page**
- The same domain-title style as the landing screenshot.
- An experiment list or cards styled like the reference, with this experiment as the first entry.

**Footer**: copy it from the screenshots.

**Responsive**: below 768px the sidebar turns into a toggle/drawer. Check the layout at 360px, 768px and 1280px.

**Accessibility**:
- Use semantic landmarks.
- Sidebar and quiz controls must work with the keyboard.
- Every image needs alt text.
- Respect `prefers-reduced-motion` (see section 5).

---

## 4. Directory structure (adjust only with a stated reason)

```
django-vlab/
├─ public/diagrams/               # real sourced diagram images (I add these)
├─ reference/screenshots/         # reference only, not shipped
├─ src/
│  ├─ assets/img/                 # somaiya-logo, vlabs-logo
│  ├─ styles/global.css
│  ├─ components/
│  │  ├─ layout/                  # Header, OrangeBar, SubHeader, Sidebar, Footer, ExperimentLayout
│  │  ├─ content/                 # Figure, CodeBlock, Callout
│  │  ├─ viz/                     # Stepper controls shared by all visualizations
│  │  └─ quiz/                    # Quiz, LevelPicker, QuestionCard, ResultSummary
│  ├─ experiments/django-request-response/
│  │  ├─ meta.js
│  │  ├─ tabs/                    # Aim.jsx, Theory.jsx, Procedure.jsx, ...
│  │  ├─ viz/                     # RequestJourney.jsx, MiddlewareOnion.jsx, UrlMatcher.jsx
│  │  ├─ data/                    # pretest.js, posttestBank.js, references.js,
│  │  │                           # contributors.js, vizSteps.js
│  │  └─ simulation/index.jsx     # placeholder only
│  ├─ pages/Home.jsx
│  ├─ App.jsx
│  └─ main.jsx
└─ vite.config.js
```

---

## 5. Visualizations (inside the Theory tab)

Two kinds of visual material are kept strictly apart:

- **Diagrams** are real images from published sources. **Never draw, generate or recreate them** (no SVG copies, no ASCII art, no Mermaid). Use `<Figure src caption credit />`, which loads from `public/diagrams/`. If the file is missing, show a dashed box with the expected filename and a one-line description. The slots are:
  - `cycle-overview.png`: the full request→response flow;
  - `middleware-onion.png`: the onion/layer view;
  - `middleware-hooks-flow.png`: the hook-by-hook flow;
  - `url-resolution.png`: URL resolver matching.
  Each figure shows a caption and "Source: …".
- **Visualizations** are small interactive explainers that you build in React. They *demonstrate* one concept with a fixed example. The student watches and steps through, but makes no choices. (Student-driven scenarios belong to the Simulation tab later, so don't add scenario pickers here.)

All three visualizations share a `Stepper` control: Play, Pause, Step back, Step forward, Reset, and a step counter "3 / 9". Under each one is a caption line explaining the current step in one or two plain sentences. The step data lives in `data/vizSteps.js`, not inside the JSX, so the future simulation can reuse it.

**V1 — Request journey** (placed after "Where Django sits")
- A horizontal pipeline of labelled boxes: Browser → Web server → WSGI server → Middleware (one combined box) → URL resolver → View → Model/DB and Template → back through Middleware → WSGI → Web server → Browser.
- A marker moves box to box, and the active box gets the orange border.
- Example request: `GET /blog/42/`. The final caption shows `200 OK`.
- On narrow screens the pipeline stacks vertically.

**V2 — Middleware onion** (placed after the Middleware section)
- Draw the seven default middleware classes as nested rectangles, with the view in the centre and each layer labelled with its class name.
- A marker travels inward (top-down through the `MIDDLEWARE` order), reaches the view, then travels outward in reverse order.
- One toggle, "Short-circuit at CsrfViewMiddleware (POST without token)":
  - the marker stops at that layer;
  - the inner layers and the view grey out;
  - a `403` response travels back out through only the layers already passed.

**V3 — URL matching** (placed after the URL resolution section)
- Show a fixed `urlpatterns` list of 5 patterns, using converters and one `include()`.
- Example path: `/blog/2024/django-tips/`.
- Each step highlights the pattern being tested and shows "no match" or "match".
- On the match, a panel shows the view name and the captured kwargs, e.g. `{year: 2024, slug: "django-tips"}`.
- The remaining patterns are shown as never tested.

**Style rules for all visualizations**
- Use the same palette as the site: flat fills, 1px borders, the site font, orange for "active" and blue for labels.
- No gradients, shadows, glow, emoji or icons.
- Size each one to fit the content column, about 300–420px tall on desktop.
- With `prefers-reduced-motion`, Play is disabled and only manual stepping works, with no transitions.
- Correctness matters more than flair. Every step must match real Django behaviour and use real class and function names.

---

## 6. Content, tab by tab

**Tone**: write like a university lab manual. Be precise and plain. Base the content on the official Django docs (stable version). Every class, setting or function you mention must exist in current Django.

**Aim**: one paragraph, then 4 learning objectives. The student should be able to:
- trace the stages in order;
- explain the onion model;
- predict how a URL resolves;
- explain how the response returns to the client.

**Theory**: use these sections, in this order, and place the visualizations and figures as noted.

1. **Where Django sits.** Browser → web server (e.g. Nginx) → WSGI/ASGI server (e.g. Gunicorn/Uvicorn) → Django. Mention `runserver` for development. → **V1** + `cycle-overview.png`
2. **Building the request.** The `application` object in `wsgi.py`. `WSGIHandler` wraps the raw request in a `WSGIRequest` (a subclass of `HttpRequest`). Cover `method`, `path`, `GET`, `POST`, `META` and `COOKIES`, and the `request_started` signal.
3. **Middleware.**
   - The `MIDDLEWARE` setting and the default 7 classes.
   - Requests run top-down and responses run bottom-up (the onion).
   - New-style middleware: `__init__(get_response)` and `__call__`.
   - The hooks `process_view`, `process_exception` and `process_template_response`.
   - Short-circuiting.
   - Ordering rules: `SecurityMiddleware` near the top, `SessionMiddleware` before `AuthenticationMiddleware`.
   → **V2** + `middleware-onion.png` + `middleware-hooks-flow.png`
4. **URL resolution.**
   - `ROOT_URLCONF`, which a middleware can override by setting `request.urlconf`.
   - Patterns are tried in order and the first match wins.
   - Converters, `include()`, captured kwargs and `ResolverMatch`.
   - No match raises `Http404`.
   - `APPEND_SLASH` makes `CommonMiddleware` redirect to the slashed URL.
   → **V3** + `url-resolution.png`
5. **The view.**
   - Function-based vs class-based views (`as_view()` → `dispatch()`).
   - A view must return an `HttpResponse`; returning `None` raises `ValueError`.
   - QuerySets are lazy.
   - `render()` vs `TemplateResponse`, and context processors.
6. **The response.** `HttpResponse`, `JsonResponse`, redirects and `StreamingHttpResponse`. The response passes back out through middleware in reverse order. The `request_finished` signal fires.
7. **When things go wrong.** `Http404`, `PermissionDenied`, `handler404/403/500`, and the DEBUG error page.
8. **A note on ASGI.** One short paragraph.

Add code examples where they help:
- the default `MIDDLEWARE` list;
- a `urls.py` with converters and `include()`;
- one function-based view and one class-based view;
- a custom middleware that prints before and after `get_response`.

**Pretest**: 5 easy prerequisite questions covering HTTP methods, status codes (200/301/403/404/500), the parts of a URL, what MVT is, and what a web server does. Reuse the quiz component in single-level mode.

**Procedure**
- Part A: steps for the Simulation tab. Mark them `TODO`; the simulation is still being designed.
- Part B, "Try it on your machine":
  1. `pip install django`
  2. `django-admin startproject`
  3. Add a printing middleware in two positions in `MIDDLEWARE`.
  4. Run `runserver`, open a page, and watch the order printed in the console.

**Posttest**: the quiz engine (section 7).

**References**: real links only. Check that every URL resolves, and format them like the screenshot's References tab. Start with:
- Django docs, Middleware: https://docs.djangoproject.com/en/stable/topics/http/middleware/
- Django docs, URL dispatcher: https://docs.djangoproject.com/en/stable/topics/http/urls/
- Django docs, Request and response objects: https://docs.djangoproject.com/en/stable/ref/request-response/
- Django docs, How to deploy with WSGI: https://docs.djangoproject.com/en/stable/howto/deployment/wsgi/
- Finn Andersen, "Demystifying middleware in Django's request-response cycle": https://medium.com/@finndersen/demystifying-middleware-in-djangos-request-response-cycle-a463637390a2
- "How Django Works Internally: The Complete Request Response Cycle" (DEV): https://dev.to/alansomathew/how-django-works-internally-the-complete-request-response-cycle-io8
- MDN, Django introduction: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/Django/Introduction

**Contributors**: render from `contributors.js`. Names and roles are `TODO`. Do not invent people.

**Feedback**: copy the screenshot layout. There is no backend: Submit opens a Google Form link (TODO).

---

## 7. Quiz engine (Posttest)

**Question shape**

```js
{
  id: "mw-order-01",
  topic: "middleware",            // wsgi | request | middleware | urls | view | response | errors
  levels: ["easy", "medium"],     // a question may belong to several levels
  question: "…",
  code: "optional snippet",
  options: ["…", "…", "…", "…"],
  answer: 2,
  explanation: "why the right answer is right, and why the most tempting wrong one is wrong",
  source: "https://docs.djangoproject.com/…"
}
```

**Bank rules**
- At least 30 questions. Each level shows 10.
- **Shared questions**: at least 3 belong to all three levels, and at least 3 more belong to two levels.
- Difficulty meaning:
  - **Easy**: recall.
  - **Medium**: apply or predict (given this `MIDDLEWARE` or these `urlpatterns`, what happens?).
  - **Hard**: code reading and edge cases: short-circuiting, `process_view` returning a response, `process_template_response`, the exception path, `request.urlconf`, a view returning `None`, `APPEND_SLASH`.
- Spread topics across each level.
- Every question must be checkable against its `source` link. If you aren't sure of a question, drop it.
- Wrong options must be believable mistakes a student would actually make.

**Behaviour**
- A level picker shows Easy / Medium / Hard, styled like the reference buttons.
- Lay out the questions and the Submit button the way the quiz screenshot shows.
- After Submit: show the score, mark each answer right or wrong, highlight the correct option, and show the explanation.
- "Retake" shuffles the question order and the option order, keeping the right answer correct.
- Store the last score per level in `localStorage`, wrapped in try/catch.

**Seed questions.** Use these word for word and match their style:

1. *(easy, medium, hard)* In what order does Django run the middleware in `MIDDLEWARE` while handling the **request**? → **Top to bottom** (the response is processed bottom to top).
2. *(easy, medium)* Which setting tells Django which URLconf module to start matching from? → **`ROOT_URLCONF`**.
3. *(medium, hard)* `MIDDLEWARE = [A, B, C]`. B returns an `HttpResponse` without calling `get_response`. What runs? → **A's request code, then B. The response goes back out through A. C and the view never run.**
4. *(medium)* `urlpatterns = [path("blog/<int:year>/", archive)]`, `APPEND_SLASH = True`, `CommonMiddleware` is enabled. A GET request is made for `/blog/2024`. Result? → **A permanent redirect to `/blog/2024/`.**
5. *(hard)* When is `process_template_response()` called? → **Only when the response has a `render()` method, e.g. a `TemplateResponse`.**
6. *(hard)* Why must `AuthenticationMiddleware` come after `SessionMiddleware`? → **It reads the user from `request.session`, which `SessionMiddleware` sets up.**
7. *(hard)* A view function ends without a `return` statement. What happens? → **Django raises `ValueError` because the view didn't return an `HttpResponse`.**

---

## 8. Simulation tab: placeholder only

The simulation design is still being decided. **Do not build any simulation logic.**
- `simulation/index.jsx` renders a framed panel sized like the reference's simulation area.
- The panel shows "Simulation under development".
- Keep the component isolated so it can be swapped out later. It may later import the step data from `vizSteps.js`.

---

## 9. Avoiding a generic, AI-made look

- No gradients, glassmorphism, glow, heavy shadows, hero sections or "cards everywhere". Use only what the screenshots show.
- No emoji, decorative icons or stock illustrations.
- No marketing phrases like "Unlock", "Dive into", "Master", "Seamless", "Powerful", "Journey", or "In today's fast-paced world".
- No lorem ipsum, made-up stats or made-up quotes.
- Write short, factual sentences that name real Django classes and settings. Avoid long chains of em-dashes.
- No fonts beyond what the reference uses.
- No unrequested features: dark mode, search, chatbots, progress bars, confetti.

---

## 10. Done when

- [ ] Placed side by side with the screenshots, the header, subheader, sidebar, tabs, footer and home page match. Every value changed from the starting theme is listed.
- [ ] The Somaiya logo sits to the **left** of the Virtual Labs logo, and both link Home.
- [ ] Every tab has its own route, and back/forward work.
- [ ] Theory is complete, with V1, V2 and V3 working (Play, Step, Reset, reduced-motion) and 4 figure slots with credits. No generated diagrams.
- [ ] Pretest has 5 questions. Posttest has 3 levels, a bank of 30 or more, and shared questions included.
- [ ] Every reference link resolves.
- [ ] `npm run build` and `npm run lint` are clean.
- [ ] The site works under the GitHub Pages base path.
- [ ] Every `TODO:` is listed in the final report.
