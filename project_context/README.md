# MediCast Project Context: dataProcessing and Backend

This document explains how the data-processing pipeline works, how the backend works, and exactly which data-processing output the backend uses.

## 1. Repository overview

```text
MediCast/
├── dataProcessing/     # Offline data cleaning, modelling, and model export
├── backend/            # FastAPI application
├── frontend/           # Web UI (not covered here)
└── project_context/    # This documentation
```

The important boundary is:

- `dataProcessing/` produces the trained dengue model and the latest rainfall table.
- Both JSON files are copied into `backend/`.
- The backend loads the copied files at startup and never runs pandas or scikit-learn.

---

## 2. dataProcessing

`dataProcessing/` contains the raw source data, notebooks for cleaning and training, and generated data/model files.

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

The backend is a FastAPI application under `backend/src/app/`.

### 3.1 Structure

```text
backend/src/app/
├── main.py                    # FastAPI app setup and router registration
├── schemas.py                 # Pydantic request/response models
├── store.py                   # In-memory inventory
├── data/
│   ├── dengue_model.json      # Copy of the trained model
│   └── rain_latest.json       # Copy of the latest rainfall table
├── routers/
│   ├── inventory.py           # Inventory endpoints
│   └── calculate.py           # /api/calculate endpoint
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

The inventory resets when the backend restarts. Dengue calculations read `current_stock` from the request body; they do not read inventory storage directly.

---

## 4. End-to-end data flow

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
                                     |
                                     v
                       JSON calculation result


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
```

In short:

- `dataProcessing/` is the offline data and training pipeline.
- The interfaces between data processing and the backend are the dengue model JSON and the latest rainfall JSON.
- The backend performs lightweight lookups and arithmetic, with no data science libraries or runtime access to the raw data.
- The rainfall lookup fills `rain_prev_departure` automatically when a state is provided and the request does not supply it.
