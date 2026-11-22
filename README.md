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

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend dev server will typically start at `http://localhost:5173` (Vite's default).

The frontend runs **standalone by default**: no backend or `.env` file is needed, and all page data is local demo data. The Calculator tries `POST /api/calculate` anyway and falls back to a labeled local estimate when the backend is unavailable. See [`frontend/README.md`](frontend/README.md) for demo behavior, localStorage reset steps, and the `VITE_BACKEND_CONNECTED=true` checklist to reconnect everything later.

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
- `frontend/.env.example` contains `VITE_BACKEND_CONNECTED=false` (standalone) and `VITE_API_BASE_URL=http://localhost:8000`. Set the first to `true` and restart Vite to send auth/org/admin/inventory traffic to the backend again.
- See `project_context/README.md` and `project_context/frontend_README.md` for the full architecture and page-by-page behavior.

