# MediCast Frontend

React + TypeScript + Vite, styled with Tailwind CSS v4.

## Run the frontend on its own

No backend, database, or `.env` file is needed:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The app starts with a **demo admin**, a **demo
organization**, demo inventory, and demo analytics. Everything a page needs is
generated in this browser.

| Script            | Description                         |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Start the Vite dev server           |
| `npm run build`   | Type-check and build for production |
| `npm run preview` | Preview the production build        |
| `npm run lint`    | Run Oxlint                          |

## What is connected right now

The frontend is **disconnected from the backend by default**. Page data comes
from local demo state; nothing is written to a server.

| Area | Disconnected (default) | Reconnected |
| --- | --- | --- |
| Login / signup / session | Demo accounts in this browser | `POST /api/auth/*` |
| Organization, members, join requests | Demo fixture in this browser | `POST /api/organizations`, `/api/admin/*` |
| Dashboard / Inventory stock | Demo inventory + browser-local changes | `GET/POST /api/inventory` |
| Charts, map, cover estimates | Frontend-only demo data (unchanged) | Frontend-only demo data (unchanged) |
| **Calculator** | Tries `POST /api/calculate` first; falls back to a labeled local estimate when the backend is unreachable | Uses `POST /api/calculate` |

The Calculator is deliberately always "connected": it attempts the real
endpoint on every submit and shows a **Local estimate** badge only when that
request fails (or times out after 2.5 seconds). With the backend up it shows a
**Backend result** badge.

### Demo data and resetting it

Demo state is stored in `localStorage`:

- `medicast.demo` — current demo user, organization, members, join requests, and
  stock quantities.
- `medicast.inventoryAdjustments` — browser-local stock removals (used in both
  modes because the API has no remove endpoint).
- `medicast.token` — session token; harmless placeholder in demo mode.

To start over from the original fixture, clear site data for
`http://localhost:5173`, or run this in the browser console:

```js
localStorage.removeItem('medicast.demo')
localStorage.removeItem('medicast.inventoryAdjustments')
localStorage.removeItem('medicast.token')
location.reload()
```

Logged out, the login screen accepts any valid email with a password of 8+
characters and signs in as the demo admin. Signing up creates a demo member
(read-only inventory) so role gating can be checked without a server.

## Reconnecting the backend later

1. Start the backend from the repository root. Follow the backend setup in the
   [root README](../README.md) (install with `uv sync`, apply migrations
   001–003, then `uv run fastapi dev`). It must be listening on
   `http://localhost:8000`.
2. Copy the environment template:

   ```bash
   cd frontend
   cp .env.example .env
   ```

3. Set the switch to `true` in `frontend/.env`:

   ```dotenv
   VITE_BACKEND_CONNECTED=true
   VITE_API_BASE_URL=http://localhost:8000
   ```

4. Restart the Vite dev server (`npm run dev`). Vite only reads `.env` at
   startup.
5. Log in again. The demo session is not a real server session, so the first
   API call will clear it and show the login screen. Use a real account created
   through `/signup`, then create or join an organization.

To go back to standalone mode, set `VITE_BACKEND_CONNECTED=false` (or delete
`.env`) and restart Vite. No code changes are required in either direction.

### Where the switch lives

- `src/config.ts` — the single `backendConnected` flag and API base URL.
- `src/api/{auth,organizations,admin,inventory}.ts` — each helper chooses the
  local demo branch or the real HTTP endpoint based on that flag.
- `src/context/AuthProvider.tsx` — restores session state from either source.
- `src/data/demoState.ts` — the browser-local fixture.
- `src/lib/localCalculate.ts` — the offline Calculator estimate.

**For frontend design work:** edit files under `src/pages/`, `src/components/`,
`src/data/demoAnalytics.ts`, and `src/index.css`/`tailwind.config.ts`. Leave
`src/config.ts`, `src/api/`, `src/context/`, and `src/data/demoState.ts` alone
unless you are deliberately changing how data is loaded. The `backend/` folder
is not involved in standalone mode.

## Tailwind

Tailwind CSS v4 is enabled through the `@tailwindcss/vite` plugin. Theme
customization (colors, fonts, etc.) lives in `tailwind.config.ts`, which is
loaded from `src/index.css` with the `@config` directive.
