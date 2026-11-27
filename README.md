# MediCast

A full-stack application with a FastAPI backend and a React + Vite + TypeScript + Tailwind CSS frontend.

## Prerequisites

### Backend
- Python 3.14+ (see `backend/.python-version`)
- [uv](https://docs.astral.sh/uv/) - Python package/project manager

### Frontend
- [Node.js](https://nodejs.org/) (recommended: latest LTS)
- npm (comes with Node.js)

## Getting Started (Fresh Clone)

```bash
git clone https://github.com/THEJAS-BK/MediCast.git
cd MediCast
```

### Backend Setup

```bash
cd backend

# Create/sync the virtual environment and install dependencies
uv sync

# Configure the database connection (edit the file if your credentials differ)
cp .env.example .env

# Apply the PostgreSQL migrations, in order, if not already applied
psql -d Medicast -f src/app/migrations/001_init.sql
psql -d Medicast -f src/app/migrations/002_hospital_details.sql
psql -d Medicast -f src/app/migrations/003_auth_join_requests.sql

# Run the development server
uv run fastapi dev
# Or with uvicorn directly
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000` by default. FastAPI docs are available at `http://localhost:8000/docs`.

The app entrypoint is defined in `pyproject.toml` as `app.main:app` (under `[tool.fastapi]`).

### Neon development database

This repository is linked to the shared Neon project `soft-art-86345950`, branch `production`, in organization `org-patient-dream-55077860`. The `neon.ts` policy declares the Postgres service.

If the global CLI install is not permitted on your machine, use `npx neon@latest` in place of `neon` below.

```bash
# One-time local sign-in
npx neon@latest login

# Link this checkout and pull the branch env vars into .env.local
npx neon@latest link --org-id org-patient-dream-55077860 \
  --project-id soft-art-86345950 --branch production -y
npx neon@latest env pull
```

`neon env pull` writes `DATABASE_URL` (pooled, used by the running app) and `DATABASE_URL_UNPOOLED` (direct, for migrations) to the root `.env.local`. That file is git-ignored — never commit it. `backend/src/app/config.py` loads it automatically, so no `backend/.env` is needed.

If you already have a pooled connection string, you can skip the login/link/env pull steps:

```bash
cp .env.example .env.local
# Edit .env.local and replace the placeholder with the connection string.
```

Do not add quotes around the value. Do not commit `.env.local`.

The migrations in `backend/src/app/migrations/001_init.sql`, `002_hospital_details.sql`, and `003_auth_join_requests.sql` have already been applied to the `production` branch. If you create a fresh Neon branch, apply them with `DATABASE_URL_UNPOOLED`, not the pooled URL.

From the repository root, build the frontend with:

```bash
npm run build
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend dev server will typically start at `http://localhost:5173` (Vite's default).

The frontend is **connected to the backend**: auth, organizations, admin actions, inventory, and calculations all call the FastAPI endpoints. Start the backend first, then copy `frontend/.env.example` to `frontend/.env` if the API is not at the default `http://localhost:8000`. Charts, the India map, and cover estimates remain labeled frontend-only demo visuals. See [`frontend/README.md`](frontend/README.md) for details.

## Project Structure

```
MediCast/
├── backend/          # FastAPI backend (managed with uv)
│   ├── src/app/      # Application source code
│   ├── pyproject.toml
│   └── uv.lock
└── frontend/         # React + Vite frontend
    ├── src/          # Application source code
    └── package.json
```

## Notes

- Backend uses FastAPI with standard extras (`fastapi[standard]`). `uv sync` will install all dependencies from `pyproject.toml`/`uv.lock`.
- Frontend uses Vite 8, React 19, TypeScript, Tailwind CSS v4 with `@tailwindcss/vite`.
- The backend is configured with build system `uv_build` and module name `app`.
- Authentication, organizations, and join requests are stored in PostgreSQL (see `backend/.env.example` for `DATABASE_URL`); inventory and calculation still use the in-memory store and JSON model artifacts.
- `frontend/.env.example` contains `VITE_API_BASE_URL=http://localhost:8000`; override it in `frontend/.env` if the backend runs elsewhere. All frontend API calls go through `src/api/http.ts`, which attaches the bearer token and surfaces backend error messages. The Calculator sends the organization's state so the backend can use state-month baselines and automatic rainfall lookup.
- See `project_context/README.md` and `project_context/frontend_README.md` for the full architecture and page-by-page behavior. For an agent or teammate setting up a fresh checkout, follow `project_context/agent_setup_README.md`.

