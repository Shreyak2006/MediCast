# Adding a New Disease

How to add a second disease (for example Tuberculosis) to the forecasting pipeline and backend. Read [`dataProcessing_README.md`](dataProcessing_README.md) first; this document assumes you know the three stages (prepare, train, publish).

> **Status of this doc:** the pipeline steps are grounded in the data processing guide, and the backend section has been checked against the current code in `backend/src/app/`.

---
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
Loads medicines from `GET /api/inventory` for the dropdown. The form collects current stock, average yearly sales, and days of stock to cover (default 30), validates them client-side, and posts `medicine`, `current_stock`, `yearly_sales`, `days`, and the organization's state to `POST /api/calculate`. The result card shows status, target stock, shortfall, daily average, expected daily use, seasonal factor, baseline source, and rainfall/capping badges. Non-dengue medicines return only a status and get a plain "Request received" message.

> The UI sends the organization's state, so the backend uses state-month baselines and automatic rainfall lookup. Direct API calls can override `month` or supply `rain_prev_departure`.

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

## 1. Approach: copy per disease, keep the JSON schema

To keep diffs small, do not build a generic framework yet.

- Copy the two disease-specific notebooks (prepare and train) with a disease suffix.
- Write outputs with a disease suffix.
- Keep `<disease>_model.json` in the **same schema** as `dengue_model.json`, so the prediction logic can be reused. The loader itself is currently a dengue-specific module-level singleton, so it needs a small refactor to hold several models (see section 6).
- The backend currently chooses a calculation from the `medicine` string, not from a `disease` field. Decide whether to keep that pattern or add a `disease` request field (section 6).

Parameterizing the notebooks into one script is a later cleanup, not part of adding a disease.

---

## 2. Check the data first

Do this before writing anything. Dengue lost a lot of rows (raw to 700 usable) because of cleaning and the join, so a thinner disease may not train at all.

In `original/Final_data.csv`, for the new disease:

1. Find the **exact** `Disease` spelling (case matters; the filter is an exact match).
2. Count rows, states, and the date range.
3. Check how many `Cases` values are non-numeric (e.g. `"3/1"`) and get dropped.
4. Count state-months after aggregation. You want enough that the time-based test split gives **at least 30 test rows**.

If the numbers are too small, stop here and decide whether the disease needs more data or a simpler model.

---

## 3. Decide: does weather apply?

The dengue model uses the previous month's rainfall departure because mosquito breeding follows rain. That reasoning does not automatically carry over.

| Situation | What to do |
|---|---|
| Disease plausibly weather-driven | Keep the rainfall lag and adjustment as in dengue |
| Not weather-driven (TB is a likely example) | Seasonal baseline only; skip the rainfall join |

Do not add a weather term just because the pipeline has one. If the test MAE does not improve (dengue's barely did), prefer the simpler model.

**Skipping rainfall helps data volume too:** the inner join with lagged rainfall drops any row whose previous month is missing from the historical rainfall file. The rainfall file starts `2009-04`, so the join cannot keep anything before `2009-05`. Without the join, those rows survive.

---

## 4. Data pipeline steps

Run everything from inside `dataProcessing/`.

### 4.1 Prepare notebook

Copy `prepare_dengue_data.ipynb` to `prepare_<disease>_data.ipynb`, then change:

- The disease filter: `Disease == "Dengue"` to the exact new spelling.
- The output path: `data_used/<disease>_monthly.csv`.
- If weather does **not** apply: remove the rainfall cleaning, aggregation, one-month shift, and the inner join. Output only `state`, `month`, `cases`.
- If weather applies: leave the rainfall steps as they are.

Keep the name cleaning (`clean_name`, `NAME_MAPPING`) identical, since names are the join key.

### 4.2 Train notebook

Copy `train_dengue_model.ipynb` to `train_<disease>_model.ipynb`, then change:

- The input file to `data_used/<disease>_monthly.csv`.
- The output file to `data_used/<disease>_model.json`.
- Re-check `TRAIN_END_YEAR`. The time-based split must stay time-based, and the test set must have 30 or more rows. The disease's date range may differ from dengue's.

If weather does **not** apply, more changes are needed than just paths:

- Remove `rain_prev_departure` from the `dropna(subset=[...])` call and from the feature code, otherwise the notebook fails on a missing column.
- Skip the residual regression (and its plot) and write `"slope": 0.0` and `"intercept": 0.0`.
- Keep `clip_bounds` in the file so the JSON schema stays valid; the rainfall term becomes a no-op.

### 4.3 Latest rainfall

`rain_latest.json` is disease-independent. Do not duplicate it. Only refresh it if the weather data changed.

---

## 5. Publish

```bash
cp dataProcessing/data_used/<disease>_model.json backend/src/app/data/<disease>_model.json
```

Then restart the backend. Models are loaded once at import time.

---

## 6. Backend changes

Files to read first (checked against the current code):

- `backend/src/app/schemas.py` — `CalculationRequest` has `medicine`, not `disease`.
- `backend/src/app/services/index.py` — dispatch is `if medicine == "Dengue medicines"`; everything else returns `{"status": "received"}`.
- `backend/src/app/services/dengue_data.py` — hardcoded module-level model load, `NAME_MAPPING`, and `calculate_dengue`.
- `backend/src/app/services/helpers/rain.py` — latest rainfall lookup.
- `backend/src/app/routers/calculate.py` — request wiring and automatic rainfall lookup.
- `frontend/src/api/inventory.ts` and `frontend/src/medicines.ts` — the client sends `medicine` and already lists `"TB medicines"`.

What you will need to do:

1. Refactor `dengue_data.py` so each disease loads its own model, for example:

   ```python
   _MODELS = {
       "dengue": load_model("dengue_model.json"),
       "tb": load_model("tb_model.json"),
   }
   ```

   Keep each model's lookup structures (`seasonal_table`, fallbacks, coefficients, clip bounds) in the same shape.

2. Generalize `calculate_dengue` (or add a sibling) so it takes the selected model's structures instead of using the module-level dengue ones.

3. Extend dispatch in `services/index.py`. Either:

   - keep the current pattern and add `elif medicine == "TB medicines": ...`, or
   - add a `disease` field to `CalculationRequest` defaulting to `"dengue"`, and update the frontend `CalculationInput` and calculator form to send it.

   The first option is the smaller change and matches the existing API. The frontend currently sends only `medicine`, `current_stock`, `yearly_sales`, and `days`.

4. If the disease has no weather term, skip the automatic rainfall lookup for it in `routers/calculate.py`. Note that the frontend does not currently send `state`, so the automatic lookup is only exercised by direct API callers today.

5. Make an unknown disease/medicine return a clear error (or a documented `{"status": "received"}` response) instead of silently using dengue numbers.

There are **no** dengue-specific stock-conversion constants to replicate. `calculate_dengue` works like this:

```text
annual_mean     = mean of the 12 monthly seasonal values
seasonal_factor = requested_month_value / annual_mean   (clamped to 0.25–4.0)
daily_average   = yearly_sales / 365
target_stock    = ceil(daily_average * seasonal_factor * days)
shortfall       = max(0, target_stock - current_stock)
```

`yearly_sales` and `current_stock` come from the request, so the same conversion is valid for any disease; only the model's seasonal table and optional coefficients differ.

If you add a new state spelling, update `NAME_MAPPING` in **all three** places: both preparation notebooks and `backend/src/app/services/dengue_data.py`.

---

## 7. Validation checklist

Pipeline:

- [ ] Disease spelling filter returns a non-trivial number of rows
- [ ] Row counts after each cleaning step look reasonable
- [ ] Any "Only in..." name mismatch lists are empty or understood
- [ ] Train and test rows are both non-zero, and test has 30 or more rows
- [ ] Both MAE values print (baseline, and adjusted if weather applies)
- [ ] `python3 -m json.tool dataProcessing/data_used/<disease>_model.json > /dev/null` passes

Backend:

- [ ] Model JSON copied and backend restarted
- [ ] A dengue request still returns the same result as before the change
- [ ] A request for the new disease returns a sensible `seasonal_factor`, `target_stock`, and `baseline_source`
- [ ] A request with an unknown disease returns a clear error
- [ ] A state with no seasonal row falls back (`baseline_source` shows it) instead of crashing

---

## 8. Common pitfalls

| Symptom | Likely cause |
|---|---|
| Zero rows after filtering | `Disease` spelling or case does not match exactly |
| Far fewer rows than expected | Name mismatch between sources, or (with weather) missing previous-month rainfall |
| Test set under 30 rows | `TRAIN_END_YEAR` too high, or the disease has little recent data |
| New disease returns dengue numbers | Backend still reads the hardcoded dengue model |
| Predictions unchanged after retraining | JSON not copied, or backend not restarted |
| Weather has no effect | State-month not complete in `rain_latest.json`, or weather is intentionally off for this disease |

---

## 9. Out of scope

- A shared parameterized pipeline script
- A model registry or database
- Per-district models
- Any disease-specific feature beyond rainfall