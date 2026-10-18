# Deploying to Vercel

The site and the backend are two Vercel projects made from the same GitHub repository:

| Vercel project | Root Directory | What it is |
| --- | --- | --- |
| Site (for example `django-vlab`) | `.` (the repository root) | The React lab pages and the admin pages |
| Backend (for example `django-vlab-api`) | `backend` | Django: the API, the database, Django's own admin |

The files Vercel needs are already in the repository: `vercel.json` (site), and
`backend/pyproject.toml`, `backend/.python-version`, `backend/vercel.json`,
`backend/vercel_build.py`, `backend/.vercelignore` (backend).

Never paste secrets (database URL, secret key, passwords) into chat or commit them. Put
them only in Vercel's Environment Variables.

## 1. Before you start

- [ ] The project is on GitHub. Check that `backend/.env`, `.env.local`, `backend/db.sqlite3`
      and `backend/.venv` are **not** in the repository (they are git-ignored).
- [ ] You have chosen the class password for roll-number sign-in.
- [ ] Optional: the Google OAuth **Client ID** (see the README's TODOs).

## 2. Backend project

1. Vercel → **Add New → Project** → import the repository.
2. **Root Directory**: `backend`. Vercel should detect **Django**. Leave the build settings
   empty: the build step comes from `backend/pyproject.toml`.
3. **Environment Variables** (Production):

   | Name | Value |
   | --- | --- |
   | `DJANGO_DEBUG` | `0` |
   | `DJANGO_SECRET_KEY` | A long random value. Generate one with `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
   | `STUDENT_SHARED_PASSWORD` | The class password students use with their roll number |
   | `GOOGLE_CLIENT_ID` | The Google OAuth Client ID (optional; leave out to use roll-number sign-in only) |
   | `ALLOWED_EMAIL_DOMAIN` | `somaiya.edu` |
   | `CORS_ALLOWED_ORIGINS` | The site's address, for example `https://django-vlab.vercel.app` (fill in after step 3; no trailing slash) |
   | `DJANGO_SUPERUSER_USERNAME` | The professor's admin username |
   | `DJANGO_SUPERUSER_EMAIL` | The professor's email |
   | `DJANGO_SUPERUSER_PASSWORD` | The professor's admin password. **Delete this variable after the first successful deploy** |

   `DJANGO_ALLOWED_HOSTS` is not needed: the backend accepts its own Vercel addresses
   automatically. Set it only if you add a custom domain.
4. **Storage → Connect Database → Neon (Postgres)**, and connect it to this project. Vercel
   sets `DATABASE_URL`. Use the **pooled** connection string if Neon offers a choice.
5. **Deploy.** The build log should show `Applying labs.0001_initial... OK` and
   `created admin '<username>'`. Preview deployments (from other branches) skip this and
   do not touch the database.
6. Check: open `https://<backend address>/admin/` and sign in with the admin account. Then
   delete `DJANGO_SUPERUSER_PASSWORD` from the environment variables.

## 3. Site project

1. Vercel → **Add New → Project** → import the **same** repository again.
2. **Root Directory**: leave as the repository root. The framework is set to Vite by
   `vercel.json`.
3. **Environment Variables** (Production):

   | Name | Value |
   | --- | --- |
   | `VITE_API_URL` | The backend's address, for example `https://django-vlab-api.vercel.app` (no trailing slash) |
   | `VITE_GOOGLE_CLIENT_ID` | The same Google OAuth Client ID (optional) |

   Do not set `VITE_DEV_LOGIN` here.
4. **Deploy.**

## 4. Connect them

1. In the **backend** project, set `CORS_ALLOWED_ORIGINS` to the site's address and
   **redeploy** the backend (environment variable changes need a new deployment).
2. Only if you use Google sign-in: in **Google Cloud Console → Credentials → your OAuth client**, add the site's address
   (for example `https://django-vlab.vercel.app`) to **Authorized JavaScript origins**.

## 5. Check it works

- [ ] The site opens. "Sign in to save your results" appears beside the breadcrumb.
- [ ] Sign in with a roll number and the class password (and, if set up, with a
      `@somaiya.edu` Google account).
- [ ] Take the pretest. The result says it is saved to your record.
- [ ] Open `https://<site address>/#/admin`, sign in as the professor, and find the
      attempt under Students.

If a step fails, look at the backend project's **Logs** in Vercel. Common causes:
`CORS_ALLOWED_ORIGINS` not matching the site's address exactly, the backend not
redeployed after changing a variable, or the site's address missing from the Google
client's authorized origins.

## Later changes

- **Code changes**: push to GitHub; both projects redeploy. Production deployments of the
  backend apply new migrations automatically.
- **Changing the admin password**: sign in to Django's admin (`/admin/` on the backend),
  open Users, and change it there.
- **Running other management commands** against the live database: run
  `vercel env pull` in `backend/` to fetch the variables to a local file, copy
  `DATABASE_URL` into `backend/.env` for the time you need it, then remove it again.
