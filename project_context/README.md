# MediCast Project Context: dataProcessing, Backend, and Frontend

This document explains how the data-processing pipeline works, how the backend works, how the frontend consumes the backend, and exactly which data-processing output the backend uses.

## 1. Repository overview

```text
MediCast/
├── dataProcessing/     # Offline data cleaning, modelling, and model export
├── backend/            # FastAPI application
├── frontend/           # React web UI (section 4)
└── project_context/    # This documentation
```

The important boundary is:

- `dataProcessing/` produces the trained dengue model and the latest rainfall table.
- Both JSON files are copied into `backend/`.
- The backend loads the copied files at startup and never runs pandas or scikit-learn.

---

## 2. dataProcessing

`dataProcessing/` contains the raw source data, notebooks for cleaning and training, and generated data/model files.

For a deeper, task-oriented guide — how to run each notebook, add new dengue or rainfall data, retrain, and publish artifacts to the backend — see [`dataProcessing_README.md`](dataProcessing_README.md). This section remains the concise reference for what the pipeline produces.

To add a second disease (for example TB) to the pipeline and backend, see [`add_disease_README.md`](add_disease_README.md).

### 2.1 Folder contents

```text
dataProcessing/
├── original/
│   ├── Final_data.csv
│   ├── daily-rainfall-data-district-level.csv
│   └── 2026_district_wise_rain_data.csv
├── processed/
│   └── Final_data_filtered.csv        # legacy notebook output
├── data_used/
│   ├── dengue_monthly.csv             # cleaned monthly training table
│   ├── dengue_model.json              # trained model export
│   └── rain_latest.json               # latest state-month rainfall
├── one.ipynb                          # existing exploratory/legacy notebook
├── prepare_dengue_data.ipynb          # dengue/rain training-data preparation
├── train_dengue_model.ipynb           # model training notebook
└── prepare_rain_latest.ipynb          # latest 2026 rainfall preparation
```

The current pipeline writes its outputs to `data_used/`. The `processed/` folder contains the older `Final_data_filtered.csv` and is not used by the backend.

### 2.2 Raw data

1. `original/Final_data.csv`
   - Dengue and other disease case records.
   - Columns include `state_ut`, `district`, `Disease`, `Cases`, `Deaths`, `day`, `mon`, `year`, latitude/longitude, and environmental fields.
   - The pipeline keeps only rows where `Disease == "Dengue"`.

2. `original/daily-rainfall-data-district-level.csv`
   - Daily district-level rainfall.
   - Columns include `date`, `state_name`, `district_name`, `actual`, `normal`, and `deviation`.
   - The pipeline keeps only `date`, `state_name`, `actual`, and `normal`.

3. `original/2026_district_wise_rain_data.csv`
   - Daily district-level rainfall for 2026.
   - Columns include `State`, `District`, `Date`, `Daily Actual`, and `Daily Normal`, plus weekly, cumulative, and monthly summaries that are ignored.
   - The latest-rainfall notebook keeps only the state, district, date, daily actual, and daily normal columns.

### 2.3 `prepare_dengue_data.ipynb`

This notebook builds `data_used/dengue_monthly.csv`.

Processing steps:

1. Load the dengue file, drop the unnamed index column, and keep only `Disease == "Dengue"`.
2. Convert `Cases` to numeric and drop invalid values such as `3/1`.
3. Normalize state and district names:
   - trim whitespace
   - lowercase
   - replace `&` with `and`
   - apply the shared name mapping
4. Drop exact duplicate rows.
5. Collapse repeated outbreak reports:
   - rows with the same state, district, day, month, and year are treated as one outbreak
   - keep the row with the highest `Cases`
6. Aggregate dengue cases by state and month (`YYYY-MM`).
7. Load rainfall data and drop rows missing `actual` or `normal`.
8. Aggregate rainfall by state and month.
9. Attach the previous month's rainfall (`M - 1`) to each state-month row.
10. Inner-join dengue and rainfall on state and month.
11. Save the final monthly table.

Output:

```text
dataProcessing/data_used/dengue_monthly.csv
```

Current output shape and coverage:

- 700 rows
- 32 state names
- 152 distinct months
- Month range: `2009-07` through `2022-06`

Columns:

| Column | Meaning |
|---|---|
| `state` | Normalized state name |
| `month` | Month in `YYYY-MM` format |
| `cases` | Total reported dengue cases for that state-month |
| `rain_prev_actual` | Previous month's total actual rainfall |
| `rain_prev_normal` | Previous month's total normal rainfall |
| `rain_prev_departure` | Previous month's rainfall departure from normal |

The notebook does not fill missing state-month combinations with zero. Months without a dengue report are absent.

### 2.4 `train_dengue_model.ipynb`

This notebook reads `data_used/dengue_monthly.csv` and produces `data_used/dengue_model.json`.

Model design:

1. Drop rows missing `cases` or `rain_prev_departure`.
2. Add `year`, `month_num`, and `log_cases = log1p(cases)`.
3. Split by time:
   - training: year `<= 2019`
   - testing: year `> 2019`
   - current split: 618 training rows and 82 test rows
4. Build a seasonal baseline using training data only:
   - mean `log_cases` for each `(state, month_num)`
   - fallback to the mean for that month across all states
   - final fallback to the overall training mean
5. Fit a weather adjustment on training residuals:
   - target: `log_cases` minus the baseline prediction
   - feature: `rain_prev_departure` clipped to `[-1, 2]`
   - model: scikit-learn `LinearRegression`
6. Compare the baseline and weather-adjusted predictions on the test set.

Current test errors:

| Method | MAE on log cases | MAE on cases |
|---|---:|---:|
| Seasonal baseline | 1.2598 | 146.43 |
| Baseline + weather adjustment | 1.2573 | 146.25 |

The saved model is plain JSON. It contains:

- `seasonal_table`: list of `{state, month_num, mean_log_cases}` entries
- `month_fallback`: month-level fallback means
- `overall_mean`: overall training mean of `log_cases`
- `slope`: weather regression slope
- `intercept`: weather regression intercept
- `clip_bounds`: `[-1.0, 2.0]`
- `train_end_year`: `2019`
- `test_errors`: MAE values for both methods

No backend code is imported or executed by these notebooks.

### 2.5 `prepare_rain_latest.ipynb`

This notebook builds `data_used/rain_latest.json` from the 2026 district-level rainfall file.

Processing steps:

1. Load the raw 2026 CSV and print all column names.
2. Match the needed columns case-insensitively: state, district, date, daily actual, and daily normal.
3. Ignore weekly, cumulative, and month-to-date columns.
4. Normalize state names with the same helper and mapping used by the dengue preparation notebook.
5. Convert rainfall values to numeric and remove duplicates.
6. Aggregate by state and month:
   - `actual_sum`
   - `normal_sum`
   - `days_present`
   - `districts`
   - `departure`
   - `is_complete`
7. Save the state-month records as JSON.

Current output:

- 152 state-month records
- Month range: `2026-08` through `2026-11`
- Latest month present: `2026-11`
- Completeness is based on `days_present == days_in_month`

Only complete state-months are used for the backend's automatic rainfall lookup.

---

## 3. Backend

The backend is a FastAPI application under `backend/src/app/`. It has two storage paths: the calculation/inventory features use JSON files and an in-memory dict (sections 3.2–3.7), while authentication, organizations, and join requests use the PostgreSQL `Medicast` database (sections 3.8–3.9). Hand-run SQL migrations live under `backend/src/app/migrations/`.

### 3.1 Structure

```text
backend/src/app/
├── main.py                    # FastAPI app setup and router registration
├── config.py                  # DATABASE_URL settings (pydantic-settings, reads .env)
├── db.py                      # psycopg connection helper (dict rows, commit/rollback)
├── security.py                # PBKDF2 password hashing, bearer tokens, join codes
├── dependencies.py            # get_token / get_current_user / get_admin_user guards
├── auth_state.py              # Builds the shared user/org/role/members response
├── schemas.py                 # Pydantic request/response models
├── store.py                   # In-memory inventory (unchanged)
├── data/
│   ├── dengue_model.json      # Copy of the trained model
│   └── rain_latest.json       # Copy of the latest rainfall table
├── migrations/
│   ├── 001_init.sql / .down.sql
│   ├── 002_hospital_details.sql / .down.sql
│   └── 003_auth_join_requests.sql / .down.sql
├── routers/
│   ├── inventory.py           # Inventory endpoints (unchanged)
│   ├── calculate.py           # /api/calculate endpoint (unchanged)
│   ├── auth.py                # Signup, login, logout, /me
│   ├── organizations.py       # Create, join, read, leave
│   └── admin.py               # Join requests and member management
└── services/
    ├── index.py               # Calculation dispatcher
    ├── dengue_data.py         # Dengue model loading and prediction logic
    └── helpers/
        └── rain.py            # Latest rainfall lookup
```

### 3.2 Which dataProcessing outputs are used?

The backend uses two data-processing artifacts:

```text
dataProcessing/data_used/dengue_model.json
        |
        | copied to
        v
backend/src/app/data/dengue_model.json

dataProcessing/data_used/rain_latest.json
        |
        | copied to
        v
backend/src/app/data/rain_latest.json
```

The backend does **not** read the raw CSV files or `dengue_monthly.csv` at runtime. It only reads the copied JSON files.

The copies exist so the backend is self-contained and does not need access to `dataProcessing/` when deployed.

Dengue model fields actively used by the backend:

| Field | Use |
|---|---|
| `seasonal_table` | Look up the state-month baseline |
| `month_fallback` | Fallback when a state-month pair is missing |
| `overall_mean` | Final fallback when the month is also missing |
| `slope` | Weather adjustment |
| `intercept` | Weather adjustment |
| `clip_bounds` | Clamp rainfall departure before adjustment |

The fields `train_end_year` and `test_errors` are stored in the model JSON but are not needed for backend predictions.

Rainfall fields used by the backend:

| Field | Use |
|---|---|
| `state` | State lookup key after name normalization |
| `month` | Month lookup key (`YYYY-MM`) |
| `departure` | Previous-month rainfall departure |
| `is_complete` | Only complete months are allowed as lookup results |

The other rainfall fields (`actual_sum`, `normal_sum`, `days_present`, `districts`) are available in the JSON but are not needed by the current calculation.

### 3.3 Model and rainfall loading

`backend/src/app/services/dengue_data.py` loads the model once at module import time:

```python
MODEL_PATH = Path(__file__).resolve().parent.parent / "data" / "dengue_model.json"

with MODEL_PATH.open(encoding="utf-8") as model_file:
    _DENGUE_MODEL = json.load(model_file)
```

The model is then converted into in-memory lookup structures:

- `_SEASONAL`: `(state, month_num) -> mean_log_cases`
- `_MONTH_FALLBACK`: `month_num -> mean_log_cases`
- `_OVERALL_MEAN`
- `_SLOPE`
- `_INTERCEPT`
- `_CLIP_MIN`, `_CLIP_MAX`

The backend uses only Python's standard library for this: `json`, `math`, and `pathlib`. It does not use pandas or scikit-learn.

Rainfall is loaded the same way in `backend/src/app/services/helpers/rain.py`:

```python
RAIN_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "rain_latest.json"

with RAIN_PATH.open(encoding="utf-8") as rain_file:
    _RAIN_ROWS = json.load(rain_file)
```

The rows are indexed once as `(state, month) -> row`. The helper `get_rain_prev_departure(state, year, month)`:

1. Normalizes the state with `normalize_state` imported from `dengue_data.py`.
2. Computes the previous month, wrapping January to December of the previous year.
3. Looks up the `(state, previous_month)` row.
4. Returns `departure` only when the row exists, `is_complete` is true, and `departure` is not null; otherwise it returns `None`.

### 3.4 `calculate_dengue` logic

`calculate_dengue` is a pure keyword-only function in `services/dengue_data.py`.

Inputs:

```python
calculate_dengue(
    *,
    current_stock,
    yearly_sales,
    days,
    state,
    month,
    rain_prev_departure,
)
```

Calculation steps:

1. Normalize `state`:
   - trim and lowercase
   - replace `&` with `and`
   - collapse whitespace
   - apply the same name mapping used by the preparation notebook
2. Find the baseline `log_cases` for the requested state and month:
   - `state_month` if present
   - otherwise the month-level fallback
   - otherwise the overall mean
3. Convert the baseline to the case scale with `expm1`.
4. Compute the annual mean from the twelve monthly baseline values.
5. If `rain_prev_departure` is provided:
   - clip it to the stored bounds
   - add `intercept + slope * clipped_departure` to the baseline log value
   - convert back with `expm1`
6. Compute:

```text
seasonal_factor = requested_month_value / annual_mean
seasonal_factor = clamp(seasonal_factor, 0.25, 4.0)

daily_average = yearly_sales / 365
expected_daily_use = daily_average * seasonal_factor
target_stock = ceil(expected_daily_use * days)
shortfall = max(0, target_stock - current_stock)
```

7. Set status:
   - `"Order needed"` when `shortfall > 0`
   - `"Stock sufficient"` otherwise

The function returns:

```json
{
  "daily_average": 10.0,
  "seasonal_factor": 1.0115,
  "expected_daily_use": 10.115,
  "target_stock": 304,
  "shortfall": 274,
  "status": "Order needed",
  "baseline_source": "state_month",
  "adjustment_applied": true,
  "capped": false
}
```

### 3.5 Request and response schemas

`schemas.py` defines:

- `CalculationRequest`
  - `medicine`
  - `current_stock`
  - `yearly_sales`
  - `days`
  - optional `state`
  - optional `month` (`1`-`12`)
  - optional `rain_prev_departure`

- `CalculationResult`
  - `status`
  - optional numeric fields returned by the dengue calculation
  - optional `baseline_source`, `adjustment_applied`, and `capped`

For the database-backed features, `schemas.py` also defines:

- `SignupRequest` (`name`, `email`, `password`), `LoginRequest` (`email`, `password`)
- `UserResponse`, `OrganizationResponse`, `MemberResponse`, `PendingRequestResponse`
- `AuthState` (`user`, `organization`, `role`, `members`, `pending_join_code`) and `AuthResponse` (adds `token`)
- `OrganizationCreate` (`name`, `state`, `district`, `pincode`, `hospital_type`) and `JoinRequestCreate` (`code`)

### 3.6 `/api/calculate` route

The route in `routers/calculate.py`:

1. Determines the requested month, using the current calendar month when `month` is omitted.
2. If `rain_prev_departure` is not supplied and `state` is present, calls `get_rain_prev_departure(state, current_year, month)` to fill it automatically.
3. Calls the dispatcher in `services/index.py`.
4. For `medicine == "Dengue medicines"`, the dispatcher calls `calculate_dengue` and returns the dengue result.
5. For any other medicine, it returns exactly `{"status": "received"}` as before.

An explicit `rain_prev_departure` from the request always wins over the automatic lookup.

Example request with automatic rainfall lookup:

```json
{
  "medicine": "Dengue medicines",
  "current_stock": 30,
  "yearly_sales": 3650,
  "days": 30,
  "state": "Tamil Nadu",
  "month": 7
}
```

Example response:

```json
{
  "status": "Order needed",
  "daily_average": 10.0,
  "seasonal_factor": 1.0115193544711978,
  "expected_daily_use": 10.115193544711978,
  "target_stock": 304,
  "shortfall": 274,
  "baseline_source": "state_month",
  "adjustment_applied": true,
  "capped": false
}
```

### 3.7 Inventory endpoints

Inventory endpoints are unchanged and use in-memory storage in `store.py`:

- `GET /api/inventory`
- `POST /api/medicines`
- `POST /api/inventory`

The inventory resets when the backend restarts. Dengue calculations read `current_stock` from the request body; they do not read inventory storage directly. The auth, organization, and admin endpoints are documented separately in section 3.9.

### 3.8 Database migrations

The project's PostgreSQL database (`Medicast`) already exists and is managed in pgAdmin. `backend/src/app/migrations/` contains plain SQL migrations that are run by hand from pgAdmin's Query Tool. The backend connects to this database with `psycopg` and reads/writes these tables for authentication, organizations, and join requests (plus the `sessions` and `join_requests` tables added by migration `003`).

```text
backend/src/app/migrations/
├── 001_init.sql                     # Initial schema: tables, indexes, seeds, updated_at triggers
├── 001_init.down.sql                # Reverses 001_init.sql
├── 002_hospital_details.sql         # Adds pincode and hospital_type to hospitals
├── 002_hospital_details.down.sql    # Reverses 002_hospital_details.sql
├── 003_auth_join_requests.sql       # Nullable hospital_id, sessions, join_requests
└── 003_auth_join_requests.down.sql  # Reverses 003_auth_join_requests.sql
```

`001_init.sql` creates, in order:

| Table | Purpose |
|---|---|
| `hospitals` | Hospitals with `state`, optional `district`, and a unique `join_code` |
| `diseases` | Disease reference table, seeded with `dengue` and `tb` |
| `users` | Hospital staff with roles (`admin`/`staff`) and unique lowercased emails |
| `medicines` | Per-hospital medicine stock lines; names unique per hospital ignoring case and outer spaces |
| `stock_movements` | Append-only stock audit log (`old_quantity`, `new_quantity`, `change`, `reason`) |

Details:

- All foreign keys use `on delete restrict`.
- Case-insensitive uniqueness uses indexes on `lower(...)`; medicine names per hospital use `lower(btrim(name))`.
- All timestamps are `timestamptz` with `now()` defaults.
- `stock_movements` has no `updated_at` column because rows are append-only; its `change` column is constrained to equal `new_quantity - old_quantity`.
- A single `set_updated_at()` plpgsql function with `before update` triggers keeps `updated_at` current on `hospitals`, `users`, and `medicines`.
- Only `dengue` and `tb` are seeded; no hospitals, users, or medicines are inserted.

`001_init.down.sql` drops the three triggers, the function, and the five tables in reverse dependency order (`stock_movements`, `medicines`, `users`, `diseases`, `hospitals`). It drops nothing else.

`002_hospital_details.sql` adds two columns to `hospitals` for the details collected by the frontend's create-organization form:

| Column | Constraint |
|---|---|
| `pincode` | `not null`, checked against `^[1-9][0-9]{5}$` |
| `hospital_type` | `not null`, checked against `government`, `private`, `clinic` |

`002_hospital_details.down.sql` drops those two columns (and their check constraints) and nothing else.

`003_auth_join_requests.sql` supports the backend-backed auth and join-request flows:

| Change | Purpose |
|---|---|
| `users.hospital_id` becomes nullable | An account is created at signup, before the user creates or joins an organization |
| `sessions` table (`token`, `user_id`, `created_at`) | Stores the opaque bearer tokens issued at login/signup so logout can invalidate them |
| `join_requests` table (`hospital_id`, `user_id`, `status`, `created_at`, `resolved_at`) | Records join requests until an admin approves or rejects them |

`join_requests.status` is constrained to `pending`, `approved`, or `rejected`, and a partial unique index allows only one pending request per `(hospital_id, user_id)` pair. Foreign keys from the new tables cascade on delete.

`003_auth_join_requests.down.sql` drops the two new tables and their indexes, then restores `NOT NULL` on `users.hospital_id`. That last step fails if any user still has no hospital, so those users must be assigned or removed first.

Each file wraps everything in a single transaction (`begin`/`commit`) and uses plain statements without `if not exists`/`if exists`, so running a file twice fails loudly instead of silently skipping.

How to run:

1. In pgAdmin, connect to the server and click the `Medicast` database in the tree to select it.
2. Right-click the database and open **Query Tool**.
3. Open `backend/src/app/migrations/001_init.sql` with the Query Tool's file-open button (or paste its contents) and execute (F5).
4. Verify with `select * from diseases;` — it should return the two seeded rows.
5. Open and execute `002_hospital_details.sql` to add the new hospital columns.
6. Open and execute `003_auth_join_requests.sql` to add the auth and join-request schema.
7. To undo, run the `.down.sql` files in reverse order: `003`, then `002`, then `001`.

The same files can also be applied from the command line, for example `psql -d Medicast -f backend/src/app/migrations/003_auth_join_requests.sql`. The local `Medicast` database already has migrations 001–003 applied.

The backend reads the connection string from the `DATABASE_URL` environment variable (or `backend/.env`; see `backend/.env.example`). It defaults to `postgresql://postgres:postgres@localhost:5432/Medicast` for local development. dbmate is not used: these files do not follow dbmate's `<version>_<name>.up.sql` naming and dbmate would add its own `schema_migrations` tracking table. pgAdmin/psql remain the intended workflow.

### 3.9 Authentication, organizations, and join requests

**Configuration and helpers**

- `config.py` reads `DATABASE_URL` with pydantic-settings (environment variable or `backend/.env`).
- `db.py` opens one `psycopg` connection per request using dict rows, committing on success and rolling back on error.
- `security.py` hashes passwords with PBKDF2-HMAC-SHA256 (200,000 iterations, random salt), generates opaque tokens with `secrets.token_urlsafe(32)`, and generates `ORG-XXXXX` join codes.
- `dependencies.py` reads the `Authorization: Bearer <token>` header, resolves the session against the `sessions` table, and exposes `get_current_user` and `get_admin_user` guards.
- `auth_state.py` builds the shared response: current user, organization, role, members, and any pending join code. The database stores roles as `admin`/`staff`; the API maps `staff` to `member` for the frontend.

**Endpoints**

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Create a user with a hashed password and a session; returns token + auth state |
| `POST` | `/api/auth/login` | Public | Verify password and issue a session |
| `POST` | `/api/auth/logout` | Token | Delete the session row |
| `GET` | `/api/auth/me` | Token | Restore the current auth state |
| `POST` | `/api/organizations` | Token, no org | Create a hospital from the form, make the creator admin, return the join code |
| `POST` | `/api/organizations/join` | Token, no org | Verify a code and create a pending join request |
| `GET` | `/api/organizations/me` | Token | Current organization or `null` |
| `GET` | `/api/organizations/me/members` | Token | Members of the current hospital |
| `POST` | `/api/organizations/me/leave` | Token, member | Clear hospital membership (admins cannot leave) |
| `GET` | `/api/admin/join-requests` | Admin | Pending requests for the admin's hospital |
| `POST` | `/api/admin/join-requests/{id}/accept` | Admin | Add the requester as a staff member and mark the request approved |
| `POST` | `/api/admin/join-requests/{id}/reject` | Admin | Mark the request rejected |
| `DELETE` | `/api/admin/members/{id}` | Admin | Remove a member (cannot remove self) |

**Status codes and rules**

- `401` for a missing/invalid token or bad credentials; `403` for non-admin access to admin routes.
- `404` for an unknown organization code or join request; `409` for a duplicate email, already belonging to an organization, a duplicate pending request, or an already-resolved request.
- Signup creates a user with a `null` `hospital_id`; creating an organization sets it and the `admin` role; accepting a join request sets it and the `staff` role; leaving or being removed clears it and resets the role to `staff`.
- Password hashes are never returned by the API. The only credential returned is the opaque session token on signup/login, which the frontend sends on every subsequent request.

---

## 4. Frontend

The frontend is a React + Vite + TypeScript application under `frontend/src/`. It reads inventory data, posts calculation requests, and renders the returned metrics. It contains no model or rainfall logic of its own; the demand charts and India map use static demo fixtures under `src/data/demoAnalytics.ts`. Authentication and organization management are backed by the API and PostgreSQL (section 4.6).

### 4.1 Structure

```text
frontend/src/
├── api/
│   ├── http.ts              # Shared fetch client with bearer token and error mapping
│   ├── types.ts             # Backend shapes -> frontend auth types
│   ├── auth.ts              # Signup, login, session restore, logout
│   ├── organizations.ts     # Create, join request, leave, remove member
│   ├── admin.ts             # Pending join requests, accept/reject
│   └── inventory.ts         # Typed client for the inventory/calculation endpoints
├── lib/
│   ├── cover.ts             # Days of cover + units needed for a 30-day target
│   ├── format.ts            # Shared number and percent formatting
│   └── localStock.ts        # Browser-local adjustment layer for admin removals
├── components/
│   ├── NavBar.tsx           # Shared nav bar and profile dropdown
│   ├── StockLedger.tsx      # Stock table with share bars and admin actions
│   ├── CoverStatus.tsx      # Cover badge with units needed/surplus
│   ├── CoverageMeter.tsx    # Current vs target stock bar (calculator)
│   ├── MonthlyUseChart.tsx  # Bar chart of demo medicine use
│   ├── IndiaDengueMap.tsx   # India choropleth of demo dengue state data
│   └── SeasonalityChart.tsx # 12-month line chart on the calculator
├── context/
│   ├── auth.ts              # Auth context, user/organization/member types
│   ├── AuthProvider.tsx     # Server-backed auth state; token in localStorage
│   └── useAuth.ts           # Context hook
├── data/
│   ├── districts.ts         # Static state -> districts map (sample data)
│   └── demoAnalytics.ts     # Frontend-only demo usage, state baselines, seasonality
├── types/svg-maps-india.d.ts # Local type shim for @svg-maps/india
├── pages/
│   ├── LandingPage.tsx      # Public hero page
│   ├── LoginPage.tsx        # Login form
│   ├── SignupPage.tsx       # Signup form
│   ├── OrganizationPage.tsx # Create or join an organization
│   ├── OrganizationInfoPage.tsx # Read-only organization and member view
│   ├── DashboardPage.tsx    # Stock ledger + demo demand charts (GET /api/inventory)
│   ├── InventoryPage.tsx    # Read-only ledger for members; admin add/remove
│   ├── CalculatorPage.tsx   # Forecast result + demo seasonality chart
│   ├── ProfilePage.tsx      # Profile details from the API
│   └── AdminPage.tsx        # Admin member management
├── medicines.ts             # Static medicine list ("TB medicines", "Dengue medicines")
├── App.tsx                  # Routes, guards, and authenticated layout
└── main.tsx                 # Entry point and AuthProvider wrapper
```

### 4.2 API client

HTTP calls are grouped by feature under `frontend/src/api/`. `inventory.ts` keeps the unchanged inventory/calculation calls; `auth.ts`, `organizations.ts`, and `admin.ts` cover the newly connected pages:

| Function | Endpoint | Use |
|---|---|---|
| `getInventory()` | `GET /api/inventory` | Medicine list and stock levels |
| `addMedicine()` | `POST /api/medicines` | Register a new medicine |
| `addInventory()` | `POST /api/inventory` | Add stock for a medicine |
| `sendCalculation()` | `POST /api/calculate` | Submit a calculation |
| `signup()` / `login()` | `POST /api/auth/signup` / `/login` | Create a session |
| `getMe()` | `GET /api/auth/me` | Restore the current session |
| `logout()` | `POST /api/auth/logout` | End the session |
| `createOrganization()` | `POST /api/organizations` | Create a hospital |
| `joinOrganization()` | `POST /api/organizations/join` | Request to join |
| `leaveOrganization()` | `POST /api/organizations/me/leave` | Leave a hospital |
| `removeMember()` | `DELETE /api/admin/members/{id}` | Remove a member |
| `fetchPendingRequests()` | `GET /api/admin/join-requests` | Admin pending list |
| `acceptRequest()` / `rejectRequest()` | `POST /api/admin/join-requests/{id}/accept` / `/reject` | Resolve a request |

All calls share `api/http.ts`, which attaches the bearer token and surfaces backend error messages. The backend base URL comes from the `VITE_API_BASE_URL` environment variable and defaults to `http://localhost:8000` (see `frontend/.env.example`).

The `CalculationResponse` type mirrors the backend's `CalculationResult`. Every field except `status` is optional because non-dengue medicines return only a status.

### 4.3 Calculator flow

`CalculatorPage` works as follows:

1. On mount, it loads the medicine list with `getInventory()` and fills the medicine dropdown.
2. The form collects:
   - medicine (dropdown)
   - current stock (whole number, 0 or greater)
   - average sold per year (positive whole number)
   - days of stock to cover (positive whole number, defaults to 30)
3. Inputs are validated client-side before submitting.
4. On submit, it posts only `medicine`, `current_stock`, `yearly_sales`, and `days` to `POST /api/calculate`.
5. The result panel shows:
   - a status badge (teal for `Stock sufficient`, amber otherwise)
   - target stock as the lead figure
   - a `CoverageMeter` comparing current stock with the target, labeling either the shortfall or the surplus
   - the derivation: daily average, seasonal factor as a multiplier, expected daily use, and cover period
   - the baseline source as plain text (`state and month pattern`, `month pattern`, `overall pattern`, or `annual average`)
   - a quiet provenance line for rainfall adjustment and seasonal-factor capping
6. Changing any input clears the previous result so the coverage bar always uses the submitted figures.
7. For non-dengue medicines, the backend returns only `{"status": "received"}`; the panel then shows a plain "Request received" message with no calculation details.
8. A `SeasonalityChart` below the result shows a 12-month demo dengue pattern for the organization's state, falling back to the national demo average. It is static frontend data and does not change the calculation request.

### 4.4 Current limitation

The UI does not send `state`, `month`, or `rain_prev_departure`. Dengue calculations made from the web UI therefore:

- use the current calendar month (the backend defaults `month` to today's month),
- run without a state, so the baseline comes from the month-level fallback rather than a state-month entry,
- never apply the rainfall adjustment (`adjustment_applied` is always `false`).

State-aware baselines and the automatic rainfall lookup only take effect on direct API calls that include a `state`.

### 4.5 CORS

The backend enables `CORSMiddleware` in `main.py` with `allow_origins=["*"]`, so the Vite dev server (default `http://localhost:5173`) can call the API directly without a proxy.

### 4.6 Authentication and organization flow

Authentication and organization management are backed by the API and PostgreSQL. An opaque bearer token is stored in `localStorage` under `medicast.token`; `AuthProvider` restores the session with `GET /api/auth/me` on startup. Passwords are hashed with PBKDF2, sessions live in the `sessions` table, and join requests live in `join_requests` until an admin approves or rejects them.

Routes and access rules:

| Route | Access | Purpose |
|---|---|---|
| `/` | Public | Landing page with Login and Sign Up buttons |
| `/login` | Public | Email and password form |
| `/signup` | Public | Name, email, and password form |
| `/organization` | Logged in | Choose Create Organization or Join Organization; NavBar is visible |
| `/dashboard` | Logged in + organization | Stock ledger + demo demand charts |
| `/inventory` | Logged in + organization | Read-only for members; admin add/remove stock |
| `/calculator` | Logged in + organization | Forecast result + demo seasonality chart |
| `/profile` | Logged in + organization | Name, email, organization, and role from the API |
| `/organization-info` | Logged in + organization | Read-only organization details and member list |
| `/admin` | Logged in + organization + admin role | Admin member management |

Guards live in `App.tsx`:

- `RequireAuth` redirects unauthenticated users to `/login`.
- `AuthLayout` renders the shared NavBar and page container for every authenticated route, including `/organization`.
- `RequireOrganization` redirects logged-in users without an organization to `/organization` for all organization-dependent pages.
- `AdminOnly` redirects non-admins from `/admin` to `/dashboard`.

Dashboard, Inventory, and Calculator keep their original endpoints and data logic, but their presentation has been expanded with frontend-only charts, cover estimates, and demo datasets (section 4.7). `AuthLayout` wraps all of them with the shared NavBar and page container.

Client-side validation:

- Login requires a non-empty email and password.
- Signup requires a non-empty name, a non-empty email, and a password.
- Email must match a basic `name@domain.tld` pattern.
- Password must be at least 8 characters.
- The backend re-validates every field and returns readable errors for invalid credentials, duplicate emails, unknown codes, and duplicate requests.

Auth state shape (returned by `GET /api/auth/me` and the signup/login responses):

```ts
{
  user: { id: string; name: string; email: string } | null
  organization: {
    id: string
    name: string
    code: string
    state?: string
    district?: string
    pincode?: string
    hospital_type?: 'government' | 'private' | 'clinic'
  } | null
  role: 'admin' | 'member' | null
  members: Array<{ id: string; name: string; email: string; role: 'admin' | 'member' }>
  pendingJoinCode: string | null
}
```

Only the token is persisted in `localStorage`; everything else is fetched from the server on startup and after changes. The database stores roles as `admin`/`staff`; the API maps `staff` to `member` for the UI.

Flow details:

1. Login and signup call `POST /api/auth/login` or `POST /api/auth/signup`, store the returned token, and navigate to `/organization`.
2. Create Organization posts the name, state, district, pincode, and hospital type to `POST /api/organizations`. The server generates a unique code such as `ORG-4X7K2`, creates the hospital row, makes the creator an admin, and returns the code before the user continues to `/dashboard`.
3. Join Organization posts the code to `POST /api/organizations/join`. The server verifies the code and creates a pending `join_requests` row. The "Request sent" screen offers a **Check approval status** action that re-fetches the session; access is granted only after an admin accepts.
4. The admin panel lists pending requests from `GET /api/admin/join-requests`. Accepting updates the user's hospital and role; rejecting marks the request resolved. Members are removed with `DELETE /api/admin/members/{id}`, with a browser confirm and the current admin's own button disabled.
5. Logout calls `POST /api/auth/logout` to delete the server-side session, clears the token, and navigates to `/`.
6. The NavBar shows links to Dashboard, Inventory, and Calculate, highlights the active link, and opens a profile dropdown with Profile, Organization, Admin Panel (admins only), and Logout. The dropdown closes on an outside click or Escape.
7. `/organization-info` is read-only for all roles. Members see a Leave Organization button that posts to `/api/organizations/me/leave` and redirects to `/organization`; admins do not see this button.

### 4.7 Demo analytics and inventory permissions

The visual additions are entirely frontend-side and use `frontend/src/data/demoAnalytics.ts`:

- **Dashboard** shows a month selector, a bar chart of demo medicine use, and an India choropleth of synthetic dengue state baselines with a top-five list and the organization's state outlined in amber. Map outlines come from `@svg-maps/india` and carry CC BY 4.0 attribution in the UI.
- **Inventory** shows a `CoverStatus` badge per medicine: green for 30+ days, amber for 14–29 days, red for under 14 days. The estimate divides current displayed stock by daily use derived from the demo last-month usage. Each badge states the units needed to reach a 30-day target (or the surplus above it), a **How much medicine is needed** panel totals those shortfalls, and the add modal can prefill the suggested amount. The Dashboard summary also shows the combined 30-day gap. These are planning aids, not orders or dispensing logs.
- **Calculator** shows a 12-month demo seasonality line for the organization's state, or the national demo average when no state is set. The selected month is marked with an amber reference line.
- Charts use `recharts`. No new backend endpoint, migration, or data artifact was introduced for these visuals.

Inventory mutation is role-gated:

- **Admins** see **Add stock** and **Remove stock** buttons plus both actions in every ledger row. Additions call `POST /api/inventory`. Because the API has no remove operation, removals are stored as negative per-medicine deltas in `localStorage` under `medicast.inventoryAdjustments` and applied on top of fetched stock.
- **Members** see a read-only ledger with no mutation controls and a notice directing them to an admin.

The browser-local adjustment layer is a deliberate demo compromise: removals persist across refreshes in that browser only and are not shared with other users or the server.

---

## 5. End-to-end data flow

```text
Raw dengue CSV ----------------------+
                                     |
                                     v
                          prepare_dengue_data.ipynb
                                     |
                                     v
                       data_used/dengue_monthly.csv
                                     |
Raw daily rainfall CSV -------------+
                                     |
                                     v
                          train_dengue_model.ipynb
                                     |
                                     v
                         data_used/dengue_model.json
                                     |
                                     | manual copy
                                     v
                    backend/src/app/data/dengue_model.json
                                     |
                                     | loaded once at import
                                     v
                  backend/src/app/services/dengue_data.py
                                     |
                                     v
                        POST /api/calculate
                (request from CalculatorPage)
                                     |
                                     v
                       JSON calculation result
                                     |
                                     v
                   CalculatorPage result panel


Raw 2026 rainfall CSV
        |
        v
prepare_rain_latest.ipynb
        |
        v
data_used/rain_latest.json
        |
        | manual copy
        v
backend/src/app/data/rain_latest.json
        |
        | loaded once at import
        v
backend/src/app/services/helpers/rain.py
        |
        v
POST /api/calculate
        |
        v
JSON result rendered in CalculatorPage
```

The auth/organization flow uses PostgreSQL instead of the JSON artifacts:

```text
LoginPage / SignupPage
        |
        v
POST /api/auth/login or /signup
        |
        v
sessions + users tables (PBKDF2 password hash, opaque bearer token)
        |
        v
AuthProvider stores token, fetches GET /api/auth/me
        |
        +--> POST /api/organizations ---------> hospitals + users (creator = admin)
        |
        +--> POST /api/organizations/join ---> join_requests (pending)
        |                                          |
        |                                          v
        |                              GET /api/admin/join-requests
        |                                          |
        |                                          v
        |                         POST .../accept or .../reject
        |                                          |
        v                                          v
ProfilePage / OrganizationInfoPage / AdminPage  (server-backed state)
```

In short:

- `dataProcessing/` is the offline data and training pipeline.
- The interfaces between data processing and the backend are the dengue model JSON and the latest rainfall JSON.
- The backend performs lightweight lookups and arithmetic, with no data science libraries or runtime access to the raw data.
- The rainfall lookup fills `rain_prev_departure` automatically when a state is provided and the request does not supply it.
- The frontend is a thin client: it reads inventory, posts calculation requests, and renders the returned metrics, with no model or rainfall logic of its own.
- `backend/src/app/migrations/` contains hand-run SQL migrations that prepare the PostgreSQL `Medicast` database (pgAdmin); the backend connects to it for auth, organization, and join-request data, while inventory still lives in the in-memory store.
