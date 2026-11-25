# MediCast Frontend

React + TypeScript + Vite, styled with Tailwind CSS v4. The app talks to the FastAPI backend for all account, organization, inventory, and calculation data.

## Run the frontend

Start the backend first (see the [root README](../README.md)), then:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Sign up, create or join an organization with the generated code, then use the Dashboard, Inventory, and Calculator pages.

| Script            | Description                         |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Start the Vite dev server           |
| `npm run build`   | Type-check and build for production |
| `npm run preview` | Preview the production build        |
| `npm run lint`    | Run Oxlint                          |

If the backend is not at the default `http://localhost:8000`, copy `.env.example` to `.env` and set `VITE_API_BASE_URL`. Restart Vite after changing `.env`.

## Connected APIs

| Area | Endpoints |
| --- | --- |
| Session | `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` |
| Organizations | `POST /api/organizations`, `POST /api/organizations/join`, `GET /api/organizations/me`, `POST /api/organizations/me/leave`, `GET /api/organizations/me/members` |
| Admin | `GET /api/admin/join-requests`, `POST /api/admin/join-requests/{id}/accept`, `POST /api/admin/join-requests/{id}/reject`, `DELETE /api/admin/members/{id}` |
| Inventory | `GET /api/inventory`, `POST /api/medicines`, `POST /api/inventory`, `POST /api/inventory/remove` |
| Calculation | `POST /api/calculate` |

Every call goes through `src/api/http.ts`, which attaches the opaque bearer token and surfaces the backend's error message. Only the token is stored in `localStorage` under `medicast.token`; everything else is fetched from the server. To sign out of a stale session, clear that key and reload.

The Calculator sends the organization's state with each request, so dengue calculations use the state-month baseline and the backend's automatic rainfall lookup.

## Frontend-only visuals

The Dashboard demand charts and India dengue map, the Inventory cover badges, and the Calculator seasonality chart use synthetic data from `src/data/demoAnalytics.ts`. They are labeled as demo data in the UI and never sent to the backend. Cover estimates are planning aids based on current stock plus demo usage, not orders.

Inventory is stored in the backend's in-memory store and resets when the backend restarts. Adding and removing stock both call the API; there is no browser-local stock state.

For page-by-page behavior, see [`project_context/frontend_README.md`](../project_context/frontend_README.md).

## Tailwind

Tailwind CSS v4 is enabled through the `@tailwindcss/vite` plugin. Theme customization (colors, fonts, etc.) lives in `tailwind.config.ts`, which is loaded from `src/index.css` with the `@config` directive.
