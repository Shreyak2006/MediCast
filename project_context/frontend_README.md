# Frontend Guide: Pages and Workflows

This guide covers the React frontend in `frontend/src/`: what each page does, how the routes are guarded, and the end-to-end workflows a user can follow. For the backend/data side, see [`README.md`](README.md); for notebooks, see [`dataProcessing_README.md`](dataProcessing_README.md).

> **Scope note:** the frontend runs standalone by default — authentication, organizations, members, join requests, and inventory all come from a browser-local fixture in `data/demoState.ts`, with no backend or database needed. Setting `VITE_BACKEND_CONNECTED=true` switches them to the FastAPI backend and PostgreSQL (React context then holds server state and `localStorage` holds the opaque session token). The Calculator always tries `POST /api/calculate` first and falls back to a labeled local estimate. Charts, cover estimates, and demo datasets remain frontend-only. See `README.md` section 4.8 for the full dummy-data reference.

---

## 1. Stack and setup

- React 19, Vite 8, TypeScript, Tailwind CSS v4 via `@tailwindcss/vite`, React Router v7.
- Charts use `recharts`; the India map uses `@svg-maps/india` (CC BY 4.0, attributed in the UI).
- Run from `frontend/`:

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint     # oxlint
npm run preview  # serve the production build
```

- The API base URL comes from `VITE_API_BASE_URL` (see `frontend/.env.example`) and defaults to `http://localhost:8000`. The backend must be running for inventory and calculator pages to work.

---

## 2. File layout

```text
frontend/src/
├── api/
│   ├── http.ts               # Shared fetch client with bearer token + error mapping
│   ├── types.ts              # Backend response shapes -> frontend types
│   ├── auth.ts               # signup, login, getMe, logout
│   ├── organizations.ts      # create, join request, leave, remove member
│   ├── admin.ts              # pending join requests, accept/reject
│   └── inventory.ts          # Inventory + calculation helpers (unchanged pages)
├── components/
│   ├── NavBar.tsx            # Shared nav + profile dropdown
│   ├── StockLedger.tsx       # Stock table with share bars and admin add/remove actions
│   ├── CoverStatus.tsx       # Cover badge with units needed/surplus
│   ├── CoverageMeter.tsx     # Current vs target stock bar on the calculator
│   ├── MonthlyUseChart.tsx   # Bar chart of demo medicine use
│   ├── IndiaDengueMap.tsx    # India choropleth of demo dengue state data
│   └── SeasonalityChart.tsx  # 12-month line chart on the calculator
├── context/
│   ├── auth.ts               # Auth types and context definition
│   ├── AuthProvider.tsx      # Server-backed session, org/member state, token persistence
│   └── useAuth.ts            # Context hook
├── data/
│   ├── districts.ts          # Static state -> districts map (sample data)
│   └── demoAnalytics.ts      # Frontend-only demo usage, state baselines, seasonality
├── lib/
│   ├── cover.ts              # Days of cover + units needed for a 30-day target
│   ├── format.ts             # Shared number and percent formatting
│   └── localStock.ts         # Browser-local adjustment layer for admin removals
├── types/svg-maps-india.d.ts # Local type shim for @svg-maps/india
├── pages/
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   ├── OrganizationPage.tsx  # Create or join, plus success screens
│   ├── DashboardPage.tsx
│   ├── InventoryPage.tsx
│   ├── CalculatorPage.tsx
│   ├── ProfilePage.tsx
│   ├── OrganizationInfoPage.tsx
│   └── AdminPage.tsx         # Pending requests + members
├── App.tsx                   # Routes and access guards
└── main.tsx                  # AuthProvider + BrowserRouter entry point
```

---

## 3. Routes and access rules

Guards live in `App.tsx`.

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Public | Login form |
| `/signup` | Public | Signup form |
| `/organization` | Logged in | Create or join an organization; success screens |
| `/dashboard` | Logged in + organization | Stock ledger + demo demand charts |
| `/inventory` | Logged in + organization | Read-only ledger for members; admin add/remove stock |
| `/calculator` | Logged in + organization | Calculate a stock recommendation + demo seasonality |
| `/profile` | Logged in + organization | Session details |
| `/organization-info` | Logged in + organization | Read-only org details and members |
| `/admin` | Logged in + organization + admin role | Pending requests and member management |
| anything else | — | Redirects to `/` |

- `RequireAuth` sends logged-out users to `/login`.
- `RequireOrganization` sends users without an organization to `/organization`.
- `AdminOnly` sends non-admins from `/admin` to `/dashboard`.
- Authenticated routes are wrapped in `AuthLayout`, which renders the shared `NavBar`.

`NavBar` links to Dashboard, Inventory, and Calculate, highlights the active link, and opens a profile dropdown with Profile, Organization, Admin Panel (admins only), and Logout. The dropdown closes on an outside click or Escape.

---

## 4. Pages

### LandingPage (`/`)
Public hero with the MediCast pitch and Login / Sign Up buttons.

### LoginPage (`/login`)
Email + password form. Requires a non-empty, well-formed email and a password of at least 8 characters. On submit it calls `login(email, password)`, which posts to `/api/auth/login`; invalid credentials are shown inline. On success it navigates to `/organization`.

### SignupPage (`/signup`)
Name + email + password form with the same email/password rules plus a required name. Calls `signup(name, email, password)`, which posts to `/api/auth/signup`; duplicate emails are shown inline. On success it navigates to `/organization`.

### OrganizationPage (`/organization`)
Three states, all rendered by this one page:

1. **Choice screen** — Create Organization or Join Organization cards, with a Back button in either form.
2. **Create form** — fields:
   - Organization name (required).
   - State (required select, options from `data/districts.ts`).
   - District (required select, disabled until a state is chosen, filtered by that state, cleared when the state changes).
   - Pincode (required text input, digits only, `maxLength={6}`, validated with `^[1-9][0-9]{5}$`).
   - Hospital type (required select: Government / Private / Clinic, stored as `government` / `private` / `clinic`).
   
   Each field has its own inline error and invalid submissions are blocked. On success `createOrganization({ name, state, district, pincode, hospital_type })` is called and the page shows the generated code (e.g. `ORG-4X7K2`) with a **Continue to Dashboard** button.
3. **Join form** — a non-empty organization code is sent to the backend. Submitting shows a **Request sent** card naming the code. Its **Check approval status** button re-fetches the session and navigates to `/dashboard` once an admin has accepted the request.

### DashboardPage (`/dashboard`)
Loads `GET /api/inventory` on mount. A compact summary line shows the medicine count, total units, and the number of units needed to reach a 30-day cover target; `StockLedger` renders each medicine with its quantity and a bar for its share of tracked stock. Below it, a **Demand intelligence** panel adds a month selector, `MonthlyUseChart` for demo medicine use, and `IndiaDengueMap` for demo state-level dengue data. The organization's state is outlined on the map. Loading, error, and empty states are unchanged.

### InventoryPage (`/inventory`)
Shows the same `StockLedger` with a **Stock ledger** summary and a `CoverStatus` estimate per medicine. Below the ledger, a **How much medicine is needed** panel totals the units required to bring every medicine up to the 30-day target and lists each shortfall. Admins get **Add stock** and **Remove stock** buttons globally and two actions per row; clicking a medicine name opens the add modal. The modal previews `current → after` units and cover status, and offers a **Use suggested N units** shortcut when stock is below target. Adds call `POST /api/inventory`; removals are applied through the browser-local adjustment layer because the API has no remove endpoint. Members see a read-only ledger with no mutation controls. The `addMedicine()` helper exists but is not used by any page yet.

### CalculatorPage (`/calculator`)
Loads medicines from `GET /api/inventory` for the dropdown. A two-column layout puts the validated input form on the left and the forecast result on the right. The form collects current stock, average yearly sales, and days of stock to cover (default 30), then posts `medicine`, `current_stock`, `yearly_sales`, `days` to `POST /api/calculate`. The result panel leads with target stock, uses `CoverageMeter` to show current stock against that target plus any shortfall or surplus, and lists the derivation and provenance. Changing any input clears the previous result. A `SeasonalityChart` below the result shows a 12-month demo dengue pattern for the organization's state, falling back to the national demo average. Non-dengue medicines return only a status and get a plain "Request received" message.

> The UI does not send `state`, `month`, or `rain_prev_departure`, so web calculations never use state-specific baselines or the rainfall adjustment. Direct API calls can supply them.

### ProfilePage (`/profile`)
Read-only display of the current user's name, email, organization name, and role. In standalone mode it also shows demo profile fields (employee ID, designation, department, phone, joined date, location) from `data/demoState.ts`. When nobody is signed in, `useDisplayAuth()` falls back to the always-present "test" fixtures so the page still shows dummy values — useful with the dev page dock, which can open every page at any auth state. The same fallback keeps Organization info, Admin, Inventory, Dashboard, and the nav bar populated when signed out; pending requests and stock fall back in `api/admin.ts` and `api/inventory.ts`. Connected mode is unchanged.

### OrganizationInfoPage (`/organization-info`)
Read-only organization name, code, and member table from the API. Members see a **Leave Organization** button, which posts to `/api/organizations/me/leave` and returns to `/organization`; admins do not.

### AdminPage (`/admin`)
- Organization card with name and join code.
- **Pending Requests** table (Name, Email, Requested, Action), styled like the Members table. Shows "No pending requests." when empty. Each row has **Accept** (primary) and **Reject** (outline) buttons; both are disabled for that row while the action is in flight. Accept calls `acceptRequest(id)` and refreshes the session so the new member appears in the Members table; Reject calls `rejectRequest(id)`. Either way the row is removed locally on success.
- **Members** table with a **Remove** button per row (browser confirm required). The current user's own Remove button is disabled.
- The former "Add Member" form was removed; accepted requests are now the intended way to add members.

### Data representation

The three feature pages share a quiet clinical visual language, with charts used only where they add meaning:

- **Dashboard and Inventory** use `StockLedger`, a table on desktop and stacked rows on mobile. Quantities are right-aligned with tabular numerals. Each row's bar is the medicine's share of total tracked units, labeled as a percentage — not capacity, which the API does not provide.
- **Dashboard** adds `MonthlyUseChart` (horizontal-value bar chart) and `IndiaDengueMap` (state choropleth with top-5 list). Both are driven entirely by `data/demoAnalytics.ts` and are labeled "Demo data" so they cannot be mistaken for live surveillance.
- **Inventory** adds `CoverStatus`: green for 30+ days of cover, amber for 14–29 days, red for under 14 days. Each badge states how many units are needed to reach the 30-day target, or how many units are above it. A restock panel totals the shortfall per medicine, and the add modal can fill in the suggested amount. Everything is derived from demo last-month usage and the current displayed stock; no order is sent to the backend.
- **Calculator** uses a two-column form/result layout. `CoverageMeter` compares current stock with target stock, and `SeasonalityChart` adds a 12-month trend line with an amber reference line for the selected month.
- Charts use `recharts`; the map uses `@svg-maps/india` with attribution in the UI. No backend data file or endpoint was added for these visuals.
- Status is always written in words as well as color, numeric values use `.tabular-data`, and transitions respect `prefers-reduced-motion`.

---

## 5. Workflows

### 5.1 First-time setup: create an organization
1. Land on `/`, click **Sign Up** (or **Login**).
2. Enter valid credentials → redirected to `/organization`.
3. Choose **Create Organization**.
4. Fill name, state, district, pincode, and hospital type; fix any inline errors.
5. Submit → the generated join code is shown.
6. Click **Continue to Dashboard** → the user is an admin of the new hospital.

### 5.2 Join an existing organization
1. From `/organization`, choose **Join Organization** and enter a code.
2. Submit → the code is sent to `POST /api/organizations/join` and a **Request sent** card appears.
3. An admin sees the request in the Admin panel and accepts it.
4. Click **Check approval status** → the session is re-fetched; once approved the app navigates to `/dashboard` as a member. Until then, the route guards keep the user on `/organization`.

### 5.3 Adjust stock (admins only)
1. Go to `/inventory`. Members see a read-only ledger and no action buttons.
2. Click **Add stock** / **Remove stock**, or use the **Add** / **Remove** action in a ledger row.
3. Enter a positive whole-number quantity, or use **Use suggested N units** to fill the 30-day gap. Removal is capped at the displayed quantity. The modal previews `current → after` units and cover status.
4. Submit → an add calls `POST /api/inventory` and updates the server's in-memory store; a removal updates the browser-local adjustment key and refreshes the displayed ledger. The restock panel and dashboard summary update with the new shortfall.

### 5.4 Run a calculation
1. Go to `/calculator`.
2. Pick a medicine, enter current stock, yearly sales, and days to cover.
3. Submit → the result panel shows the target stock, a current-vs-target coverage bar, and the numbers behind the forecast.
4. The seasonality chart below shows the demo monthly pattern for the organization's state, or the national demo average if no state is set.

### 5.5 Handle join requests as an admin
1. Log in as the organization creator and open `/admin` from the profile dropdown.
2. Review the **Pending Requests** table (fetched from `GET /api/admin/join-requests`).
3. Click **Accept** to add the person as a member, or **Reject** to drop the request. The row disappears in both cases.
4. Use the **Members** table to remove existing members if needed.

### 5.6 Leave or switch organization
1. Open the profile dropdown → **Organization** (`/organization-info`).
2. A member can click **Leave Organization** and is returned to `/organization` to create or join another.

### 5.7 Log out
Open the profile dropdown → **Logout**. `POST /api/auth/logout` deletes the server-side session, the token is removed from `localStorage`, and the browser is sent to `/`.

---

## 6. State and persistence

`AuthProvider` holds `user`, `organization`, `role`, `members`, and `pendingJoinCode`, all returned by the API. Only the opaque session token is persisted under `medicast.token` in `localStorage`; on page load the session is restored with `GET /api/auth/me`, so refreshes keep the session without trusting locally cached state.

A second, unrelated `localStorage` key, `medicast.inventoryAdjustments`, stores admin-only stock removals as negative per-medicine deltas. They are applied on top of the API response after every fetch. This keeps the demo frontend-only, but removals are not shared between users or persisted on the server.

- `login(email, password)` and `signup(name, email, password)` store the returned token and adopt the server's auth state.
- `createOrganization(input)` has the server create the hospital, returns its generated `ORG-XXXXX` code, and makes the creator an admin.
- `joinOrganization(code)` records a pending request; the user only gains membership after an admin accepts it.
- `refresh()` re-fetches `/api/auth/me` (used by the "Check approval status" action and after admin actions).
- `removeMember(id)` cannot remove the current user; `leaveOrganization()` is member-only.

---

## 7. API helpers

Inventory and calculation helpers live in `api/inventory.ts`; auth, organization, and admin helpers live in the other modules under `api/`. All calls go through `api/http.ts`, which adds the bearer token and surfaces backend error messages.

| Helper | Call | Module |
|---|---|---|
| `getInventory()` | `GET /api/inventory` | inventory.ts |
| `addInventory(input)` | `POST /api/inventory` | inventory.ts |
| `addMedicine(name)` | `POST /api/medicines` | inventory.ts |
| `sendCalculation(input)` | `POST /api/calculate` | inventory.ts |
| `signup(name, email, password)` | `POST /api/auth/signup` | auth.ts |
| `login(email, password)` | `POST /api/auth/login` | auth.ts |
| `getMe()` | `GET /api/auth/me` | auth.ts |
| `logout()` | `POST /api/auth/logout` | auth.ts |
| `createOrganization(input)` | `POST /api/organizations` | organizations.ts |
| `joinOrganization(code)` | `POST /api/organizations/join` | organizations.ts |
| `leaveOrganization()` | `POST /api/organizations/me/leave` | organizations.ts |
| `removeMember(id)` | `DELETE /api/admin/members/{id}` | organizations.ts |
| `fetchPendingRequests()` | `GET /api/admin/join-requests` | admin.ts |
| `acceptRequest(id)` | `POST /api/admin/join-requests/{id}/accept` | admin.ts |
| `rejectRequest(id)` | `POST /api/admin/join-requests/{id}/reject` | admin.ts |

---

## 8. Known placeholders

- **State/district data is sample data** in `src/data/districts.ts`; the create-organization form submits it as text and the backend stores it on the hospital row.
- **Calculator sends no `state` or `month`**, so it never exercises the backend's state-aware baseline or rainfall adjustment (unchanged page).
- **Demand charts and the India map use static demo data** from `src/data/demoAnalytics.ts`; they are not live usage or surveillance data.
- **Cover estimates and suggested order quantities use the demo dataset** because the API supplies current stock but no dispensing history.
- **Inventory remains in memory** and resets when the backend restarts. Admin removals are browser-local adjustments and are not synced to the server.
- **No automated frontend tests** are configured yet; `npm run build` (TypeScript + Vite) and `npm run lint` are the current checks.
