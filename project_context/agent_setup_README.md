# Agent Setup README

This file is an executable runbook for an AI agent bringing a fresh MediCast checkout to a working local development state. A human should only be needed for decisions the agent is not allowed to make.

## Goal

End state:

- Backend running at `http://localhost:8000`
- Frontend running at `http://localhost:5173`
- Backend connected to the configured Postgres database
- No secrets committed
- No migrations run against `production`

## Hard rules

1. Do **not** print, echo, paste, or commit `.env.local`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, or any other secret.
2. Do **not** overwrite an existing root `.env.local` without asking the user first.
3. Do **not** run migrations against the `production` branch. They are already applied.
4. Do **not** create `backend/.env` for the Neon setup. The backend reads root `.env.local` automatically via `backend/src/app/config.py`.
5. Do **not** push, commit, or create branches unless the user explicitly asks.
6. Prefer a direct connection string if the user provides one; it removes the Neon login step.
7. If using the Neon CLI path and login requires a browser the agent cannot complete, stop and ask the user to finish it. Never ask for passwords or tokens.
8. If a command fails because the user lacks Neon org/project access, stop and ask them to be added to org `org-patient-dream-55077860` / project `soft-art-86345950`. This rule does not apply when using a direct connection string.

## Known values

| Item | Value |
| --- | --- |
| Repo | `git@github.com:THEJAS-BK/MediCast.git` |
| Neon org | `org-patient-dream-55077860` |
| Neon project | `soft-art-86345950` |
| Neon branch | `production` |
| Backend URL | `http://localhost:8000` |
| Frontend URL | `http://localhost:5173` |
| Backend docs | `http://localhost:8000/docs` |

## 1. Check the checkout

From the repository root:

```bash
git rev-parse --show-toplevel
git status --short --branch
```

- If the current directory is not the MediCast repo, clone it first:

```bash
git clone https://github.com/THEJAS-BK/MediCast.git
cd MediCast
```

- If the working tree is dirty, do **not** reset or stash anything. Ask the user whether to continue with their changes.

## 2. Check prerequisites

```bash
node --version
npm --version
python --version
uv --version
```

Expected:

- Node.js LTS or latest
- npm
- Python 3.14+
- uv

If something is missing, tell the user exactly what to install. Do not install system-wide tooling without permission.

## 3. Connect the database

Choose one path. Prefer Option A if the user already has a connection string.

### Option A — Direct connection string (no Neon login)

The backend reads environment variables first, then root `.env.local`.

1. Copy the template:

```bash
cp .env.example .env.local
```

2. Ask the user to paste the pooled connection string into `.env.local` as `DATABASE_URL=postgresql://neondb_owner:npg_QwC0Rc2lSFei@ep-icy-hat-bi85z26t-pooler.c-5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`. Do not ask them to paste it into chat unless they explicitly choose to.
3. If the user does provide the string, write it to `.env.local` but never echo it.

Expected file shape:

```dotenv
DATABASE_URL=<pooled-neon-connection-string>
```

Use the **pooled** URL. No quotes. `DATABASE_URL_UNPOOLED` is only needed for migrations.

### Option B — Neon CLI

Check whether root `.env.local` already exists:

```bash
test -f .env.local && echo "present" || echo "missing"
```

If it is present, ask before overwriting it.

If it is missing, run:

```bash
npx neon@latest login
npx neon@latest link --org-id org-patient-dream-55077860 \
  --project-id soft-art-86345950 --branch production -y
npx neon@latest env pull
```

If `login` needs interactive browser auth the agent cannot complete, stop and ask the user to finish it, then resume from `link`.

### Verify either path

Verify the required key exists **without printing its value**:

```bash
grep -q '^DATABASE_URL=' .env.local && echo "DATABASE_URL present"
```

Only check `DATABASE_URL_UNPOOLED` if Option B was used:

```bash
grep -q '^DATABASE_URL_UNPOOLED=' .env.local && echo "DATABASE_URL_UNPOOLED present"
```

Do not run migrations. The `production` branch already has migrations `001_init.sql`, `002_hospital_details.sql`, and `003_auth_join_requests.sql` applied. If the user provided a connection string for a different database, ask before running any migrations there.

## 4. Install and start the backend

```bash
cd backend
uv sync
```

Start the dev server in a separate terminal or as a background process:

```bash
uv run fastapi dev
```

If the harness supports background commands, start it in the background and keep the process handle/PID for the final report.

Verify:

```bash
curl -fsS http://localhost:8000/ >/dev/null && echo "backend OK"
```

Verify the database connection without printing credentials:

```bash
cd backend
uv run python - <<'PY'
from app.config import settings
from psycopg import connect

with connect(settings.database_url) as conn:
    with conn.cursor() as cur:
        cur.execute("select 1")
        assert cur.fetchone()[0] == 1
print("DB OK")
PY
```

If this fails, report only the error type/message. Do not print the connection string.

## 5. Install and start the frontend

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

Start it in a separate terminal or as a background process if supported.

No `frontend/.env` is needed when the backend is at `http://localhost:8000`. If the backend URL is different, ask the user for the URL and write `frontend/.env`:

```dotenv
VITE_API_BASE_URL=<backend-url-here>
```

Verify:

```bash
curl -fsS http://localhost:5173/ >/dev/null && echo "frontend OK"
```

## 6. Run checks

From the repository root:

```bash
npm run build
npm --prefix frontend run lint
```

A chunk-size warning from Vite is non-blocking. Any TypeScript or lint error should be reported and fixed only if the user asked for code changes.

## 7. Stop conditions

Stop and ask the user if any of these happen:

- Option B: Neon login needs browser interaction the agent cannot complete.
- Option B: the user does not have access to the Neon org/project.
- `.env.local` already exists and its contents might be intentionally custom.
- Option A: `DATABASE_URL` is missing from `.env.local` or the environment.
- Option B: `DATABASE_URL` or `DATABASE_URL_UNPOOLED` is missing after `env pull`.
- The DB connection check fails.
- Ports `8000` or `5173` are already in use by another process.
- The working tree has uncommitted changes and continuing could overwrite them.
- The user asks to run migrations against `production`.
- The user asks to commit, push, or create a branch without confirming the target.

## 8. Final report template

Report back with:

```text
Setup status: complete / partial / blocked
Backend: running at http://localhost:8000 (or blocked: reason)
Frontend: running at http://localhost:5173 (or blocked: reason)
Database: connected to configured Postgres (or blocked: reason)
.env.local: created / already present / not needed with exported env var (ignored, not committed)
Migrations: not run (already applied on production / not requested for user-provided DB)
Checks: build pass/fail, lint pass/fail
Secrets: not printed or committed
Remaining human step: <none or describe>
```

After setup, ask the user what feature they want to work on before creating a branch or editing code.
