# Frontend Guide: Pages and Workflows

This guide covers the React frontend in `frontend/src/`: what each page does, how the routes are guarded, and the end-to-end workflows a user can follow. For the backend/data side, see [`README.md`](README.md); for notebooks, see [`dataProcessing_README.md`](dataProcessing_README.md).

> **Scope note:** authentication, organizations, members, and join requests are all frontend-only simulations today. There is no backend auth, no organization endpoint, and no database write from these flows. State lives in React context and `localStorage`.

---

## 1. Stack and setup

- React 19, Vite 8, TypeScript, Tailwind CSS v4 via `@tailwindcss/vite`, React Router v7.
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
├── api/inventory.ts          # Typed fetch helpers (inventory, calculation, request stubs)
├── components/
│   ├── NavBar.tsx            # Shared nav + profile dropdown
│   └── MedicineCard.tsx      # Stock card on the dashboard
├── context/
│   ├── auth.ts               # Auth types and context definition
│   ├── AuthProvider.tsx      # Dummy auth, org/member state, localStorage persistence
│   └── useAuth.ts            # Context hook
├── data/districts.ts         # Static state -> districts map (sample data)
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
| `/dashboard` | Logged in + organization | Current stock levels |
| `/inventory` | Logged in + organization | Add stock, list medicines |
| `/calculator` | Logged in + organization | Calculate a stock recommendation |
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
Email + password form. Requires a non-empty, well-formed email and a password of at least 8 characters. On submit it calls `login(email)` and navigates to `/organization`. The password is not checked by any server.

### SignupPage (`/signup`)
Name + email + password form with the same email/password rules plus a required name. Calls `signup(name, email)` and navigates to `/organization`.

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
3. **Join form** — a non-empty organization code is accepted. Submitting shows a **Request sent** card naming the code. Its **Next** button currently calls `joinOrganization(code)` and navigates to `/dashboard`; this is a frontend placeholder for the future approval flow.

### DashboardPage (`/dashboard`)
Loads `GET /api/inventory` on mount and renders one `MedicineCard` per medicine with its quantity. Has loading, error, and empty states. Predicted demand / reorder flags are not implemented yet.

### InventoryPage (`/inventory`)
Lists medicines and their stock. An **Add medicine** button opens a modal with a medicine select and quantity input; submitting posts to `POST /api/inventory` via `addInventory()` and updates the local list. The `addMedicine()` helper exists but is not used by any page yet.

### CalculatorPage (`/calculator`)
Loads medicines from `GET /api/inventory` for the dropdown. The form collects current stock, average yearly sales, and days of stock to cover (default 30), validates them client-side, and posts `medicine`, `current_stock`, `yearly_sales`, `days` to `POST /api/calculate`. The result card shows status, target stock, shortfall, daily average, expected daily use, seasonal factor, baseline source, and rainfall/capping badges. Non-dengue medicines return only a status and get a plain "Request received" message.

> The UI does not send `state`, `month`, or `rain_prev_departure`, so web calculations never use state-specific baselines or the rainfall adjustment. Direct API calls can supply them.

### ProfilePage (`/profile`)
Read-only display of the current user's name, email, organization name, and role.

### OrganizationInfoPage (`/organization-info`)
Read-only organization name, code, and member table. Members see a **Leave Organization** button, which clears organization/role/members and returns to `/organization`; admins do not.

### AdminPage (`/admin`)
- Organization card with name and join code.
- **Pending Requests** table (Name, Email, Requested, Action), styled like the Members table. Shows "No pending requests." when empty. Each row has **Accept** (primary) and **Reject** (outline) buttons; both are disabled for that row while the action is in flight. Accept calls `acceptRequest(id)` then adds the person to Members with the member role; Reject calls `rejectRequest(id)`. Either way the row is removed locally on success.
- **Members** table with a **Remove** button per row (browser confirm required). The current user's own Remove button is disabled.
- The former "Add Member" form was removed; accepted requests are now the intended way to add members.

---

## 5. Workflows

### 5.1 First-time setup: create an organization
1. Land on `/`, click **Sign Up** (or **Login**).
2. Enter valid credentials → redirected to `/organization`.
3. Choose **Create Organization**.
4. Fill name, state, district, pincode, and hospital type; fix any inline errors.
5. Submit → the generated join code is shown.
6. Click **Continue to Dashboard** → the user is an admin with a seeded member list.

### 5.2 Join an existing organization
1. From `/organization`, choose **Join Organization** and enter a code.
2. Submit → **Request sent** card (nothing is persisted yet).
3. Click **Next** → the local auth state is populated with the joined organization and the user lands on `/dashboard` as a member.

The TODOs in `OrganizationPage.tsx` mark where a real join-request API call and a real "next step" belong.

### 5.3 Record incoming stock
1. Go to `/inventory`.
2. Click **Add medicine** and select a medicine.
3. Enter a positive whole-number quantity and submit.
4. The list refreshes locally with the new total; the backend in-memory store is updated via `POST /api/inventory`.

### 5.4 Run a calculation
1. Go to `/calculator`.
2. Pick a medicine, enter current stock, yearly sales, and days to cover.
3. Submit → the result card renders the recommendation returned by the backend.

### 5.5 Handle join requests as an admin
1. Log in as the organization creator and open `/admin` from the profile dropdown.
2. Review the **Pending Requests** table (currently hardcoded stub data).
3. Click **Accept** to add the person as a member, or **Reject** to drop the request. The row disappears in both cases.
4. Use the **Members** table to remove existing members if needed.

### 5.6 Leave or switch organization
1. Open the profile dropdown → **Organization** (`/organization-info`).
2. A member can click **Leave Organization** and is returned to `/organization` to create or join another.

### 5.7 Log out
Open the profile dropdown → **Logout**. Auth state is cleared from `localStorage` and the browser is sent to `/`.

---

## 6. State and persistence

`AuthProvider` holds `user`, `organization`, `role`, and `members`. It is persisted under the `medicast.auth` key in `localStorage` and restored on page load, so refreshes keep the session.

- `login(email)` derives a display name from the email address; `signup(name, email)` uses the given name.
- `createOrganization(input)` generates an `ORG-XXXXX` code, sets the creator as `admin`, stores `state`/`district`/`pincode`/`hospital_type` on the organization, and seeds a member list with the admin plus four dummy members.
- `joinOrganization(code)` sets the role to `member` and creates an organization named `Organization <CODE>` with a seeded member list including a dummy admin.
- `addMember(name, email)` adds a `member`; `removeMember(id)` cannot remove the current user; `leaveOrganization()` is member-only.

---

## 7. API helpers

All helpers are in `frontend/src/api/inventory.ts`.

| Helper | Call | Status |
|---|---|---|
| `getInventory()` | `GET /api/inventory` | Live |
| `addInventory(input)` | `POST /api/inventory` | Live |
| `addMedicine(name)` | `POST /api/medicines` | Live; not wired into a page |
| `sendCalculation(input)` | `POST /api/calculate` | Live |
| `fetchPendingRequests()` | returns two hardcoded `{ id, name, email, requestedAt }` rows | Stub with TODO |
| `acceptRequest(requestId)` | resolved promise | Stub with TODO |
| `rejectRequest(requestId)` | resolved promise | Stub with TODO |

---

## 8. Known placeholders

- **Auth is simulated.** No tokens, passwords, server sessions, or role enforcement outside the frontend guards.
- **Join requests are not sent anywhere.** The "Request sent" screen and admin pending list are local UI only.
- **`Next` on the request-sent screen fakes approval** by joining locally; this exists so the rest of the app can be demoed.
- **State/district data is sample data** in `src/data/districts.ts`, with a TODO to replace it.
- **Pending request actions are stubs**, including the hardcoded request rows and their dates.
- **Calculator sends no `state` or `month`**, so it never exercises the backend's state-aware baseline or rainfall adjustment.
- **No automated frontend tests** are configured yet; `npm run build` (TypeScript + Vite) and `npm run lint` are the current checks.
