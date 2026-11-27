"""Generate a comparison copy of the Cholera baseline artifact.

Purpose
-------
Reproduce ``backend/src/app/data/cholera_model.json`` from the processed
state-month dataset and write the result to a *separate* comparison path:

    dataProcessing/cholera/processed/cholera_state_month.csv   (input)
    dataProcessing/cholera/generated_cholera_model.json        (output)

The existing backend artifact is never written to, and no other file is
modified.

Generation rules
----------------
- ``RawSumCases`` is the prediction target (monthly reported burden).
- Each CSV row is one observed state-month; missing months are never imputed
  or zero-filled.
- Status: ``no_data`` (0 rows), ``insufficient_history`` (< 5 rows),
  ``complete`` (>= 5 rows and all 12 calendar months) and ``partial``
  (>= 5 rows and fewer than 12 calendar months).
- Monthly ``mean_cases`` is the arithmetic mean only when that calendar month
  has at least two observations; otherwise it is ``null``.
- Integral means and coverage values are written without a trailing ``.0``,
  matching the existing artifact's numeric representation.
- States are emitted alphabetically (the existing artifact's ordering);
  monthly entries are emitted in ascending calendar-month order.

``generated_at``
----------------
By default the script writes the current UTC timestamp in ISO-8601 form
(``YYYY-MM-DDTHH:MM:SSZ``).  Pass ``--generated-at`` to write a fixed value
for fully deterministic output.  The existing artifact's timestamp is never
copied.

Validation
----------
After writing, the script validates the generated JSON with the backend
validator (``app.services.cholera._validate_model``) when it is importable and
compares every state total, monthly observation count and monthly mean with
the existing artifact.  A PASS/FAIL summary is printed and the process exits
non-zero when any check fails.

Usage
-----
    python dataProcessing/cholera/generate_cholera_model.py
    python dataProcessing/cholera/generate_cholera_model.py --generated-at 2026-11-25T00:13:43
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import pandas as pd
except ModuleNotFoundError as exc:  # pragma: no cover - environment guard
    raise SystemExit(
        "pandas is required to run this generator but is not available in "
        "this Python interpreter."
    ) from exc


SCRIPT_PATH = Path(__file__).resolve()
CHOLERA_DIR = SCRIPT_PATH.parent
REPO_ROOT = SCRIPT_PATH.parents[2]

SOURCE_RELATIVE = "dataProcessing/cholera/processed/cholera_state_month.csv"
SOURCE_CSV = REPO_ROOT / SOURCE_RELATIVE
OUTPUT_PATH = CHOLERA_DIR / "generated_cholera_model.json"
ARTIFACT_PATH = REPO_ROOT / "backend" / "src" / "app" / "data" / "cholera_model.json"
BACKEND_SRC = REPO_ROOT / "backend" / "src"

MIN_TOTAL_OBSERVED_STATE_MONTHS = 5
MIN_MONTHLY_OBSERVATIONS = 2
EXPECTED_STATE_COUNT = 25

BASELINE_KIND = "per_state_mean_monthly"
# The existing artifact stores schema_version as the JSON string "1";
# the type is preserved so the generated file matches it exactly.
SCHEMA_VERSION = "1"
TARGET = "monthly_reported_cholera_burden_per_state"
METADATA_KEYS = ("source", "baseline_kind", "schema_version", "thresholds", "target")

# Stored means are JSON floats produced by another toolchain; compare within a
# tight tolerance rather than relying on bit-for-bit float equality.
MEAN_ABS_TOLERANCE = 1e-9
MEAN_REL_TOLERANCE = 1e-9


def load_source() -> pd.DataFrame:
    """Read, validate and normalise the four required CSV columns."""
    frame = pd.read_csv(SOURCE_CSV)

    required = {"State", "Year", "Month", "RawSumCases"}
    missing = sorted(required - set(frame.columns))
    if missing:
        raise ValueError(f"source CSV is missing required columns: {missing}")

    frame = frame.loc[:, ["State", "Year", "Month", "RawSumCases"]].copy()

    blank_state = frame["State"].isna() | (
        frame["State"].astype(str).str.strip() == ""
    )
    if blank_state.any():
        lines = sorted(int(index) + 2 for index in frame.index[blank_state])
        raise ValueError(
            "source CSV has blank or missing State values on lines: "
            + ", ".join(str(line) for line in lines)
        )

    present_values = frame[["Year", "Month", "RawSumCases"]].isna()
    for column in ("Year", "Month", "RawSumCases"):
        present_values[column] = present_values[column] | (
            frame[column].astype(str).str.strip() == ""
        )
    missing_rows = present_values.any(axis=1)
    if missing_rows.any():
        columns = [
            column
            for column in ("Year", "Month", "RawSumCases")
            if present_values[column].any()
        ]
        lines = sorted(int(index) + 2 for index in frame.index[missing_rows])
        raise ValueError(
            f"source CSV has missing values in {columns} on lines: "
            + ", ".join(str(line) for line in lines)
        )

    frame["State"] = frame["State"].astype(str).str.strip()
    frame["Year"] = pd.to_numeric(frame["Year"], errors="raise")
    frame["Month"] = pd.to_numeric(frame["Month"], errors="raise")

    non_finite_year = ~frame["Year"].map(math.isfinite)
    non_finite_month = ~frame["Month"].map(math.isfinite)
    non_finite = non_finite_year | non_finite_month
    if non_finite.any():
        details = []
        if non_finite_year.any():
            values = sorted(
                {float(value) for value in frame.loc[non_finite_year, "Year"]}
            )
            details.append(f"Year values {values}")
        if non_finite_month.any():
            values = sorted(
                {float(value) for value in frame.loc[non_finite_month, "Month"]}
            )
            details.append(f"Month values {values}")
        lines = sorted(int(index) + 2 for index in frame.index[non_finite])
        raise ValueError(
            "source CSV has non-finite " + " and ".join(details) + " on lines: "
            + ", ".join(str(line) for line in lines)
        )

    fractional_year = frame["Year"] % 1 != 0
    fractional_month = frame["Month"] % 1 != 0
    fractional = fractional_year | fractional_month
    if fractional.any():
        details = []
        if fractional_year.any():
            values = sorted(
                {float(value) for value in frame.loc[fractional_year, "Year"]}
            )
            details.append(f"Year values {values}")
        if fractional_month.any():
            values = sorted(
                {float(value) for value in frame.loc[fractional_month, "Month"]}
            )
            details.append(f"Month values {values}")
        lines = sorted(int(index) + 2 for index in frame.index[fractional])
        raise ValueError(
            "source CSV has fractional " + " and ".join(details) + " on lines: "
            + ", ".join(str(line) for line in lines)
        )

    outside_month_range = ~frame["Month"].between(1, 12)
    if outside_month_range.any():
        values = sorted(
            {float(value) for value in frame.loc[outside_month_range, "Month"]}
        )
        raise ValueError(f"source CSV has months outside 1..12: {values}")

    frame["Year"] = frame["Year"].astype(int)
    frame["Month"] = frame["Month"].astype(int)

    frame["RawSumCases"] = pd.to_numeric(frame["RawSumCases"], errors="raise")

    duplicated = frame[frame.duplicated(subset=["State", "Year", "Month"], keep=False)]
    if not duplicated.empty:
        combinations = duplicated[["State", "Year", "Month"]].drop_duplicates()
        details = ", ".join(
            f"({row.State}, {int(row.Year)}, {int(row.Month)})"
            for row in combinations.itertuples(index=False)
        )
        raise ValueError(
            "source CSV has duplicate (State, Year, Month) rows: " + details
        )

    non_finite = ~frame["RawSumCases"].map(math.isfinite)
    if non_finite.any():
        values = sorted(
            {float(value) for value in frame.loc[non_finite, "RawSumCases"]}
        )
        lines = sorted(int(index) + 2 for index in frame.index[non_finite])
        raise ValueError(
            f"source CSV has non-finite RawSumCases values {values} on lines: "
            + ", ".join(str(line) for line in lines)
        )

    return frame


def _artifact_number(value: float) -> float | int:
    """Mirror the existing artifact's numbers (integral values have no ``.0``)."""
    return int(value) if float(value).is_integer() else value


def build_model(frame: pd.DataFrame, generated_at: str) -> dict:
    """Build the artifact dictionary from observed state-month rows."""
    states = []

    # The existing artifact lists states alphabetically; sorted grouping makes
    # the output deterministic and ordering parity is checked after writing.
    for state, state_rows in frame.groupby("State", sort=True):
        months = sorted(int(month) for month in state_rows["Month"].unique())
        total = int(len(state_rows))
        distinct_calendar_months = len(months)

        monthly_stats = []
        for month in months:
            month_rows = state_rows[state_rows["Month"] == month]
            observations = int(len(month_rows))

            mean_cases = None
            if observations >= MIN_MONTHLY_OBSERVATIONS:
                value = float(month_rows["RawSumCases"].mean())
                # Guard against NaN, which would not be valid JSON.  The
                # processed CSV currently has no blank RawSumCases values.
                mean_cases = None if math.isnan(value) else _artifact_number(value)

            monthly_stats.append(
                {
                    "year_max": int(month_rows["Year"].max()),
                    "observations": observations,
                    "year_min": int(month_rows["Year"].min()),
                    "mean_cases": mean_cases,
                    "month": month,
                }
            )

        # Grouping only yields observed states, so no_data is unreachable for
        # this CSV; the branch is kept so the documented status rules hold.
        if total == 0:
            status = "no_data"
        elif total < MIN_TOTAL_OBSERVED_STATE_MONTHS:
            status = "insufficient_history"
        elif distinct_calendar_months == 12:
            status = "complete"
        else:
            status = "partial"

        # Key order mirrors backend/src/app/data/cholera_model.json.
        states.append(
            {
                "last_observed_year": int(state_rows["Year"].max()),
                "state": state,
                "total_observed_state_months": total,
                "first_observed_year": int(state_rows["Year"].min()),
                "status": status,
                "distinct_calendar_months": distinct_calendar_months,
                "coverage_pct": _artifact_number(
                    round(distinct_calendar_months / 12 * 100, 2)
                ),
                "monthly_stats": monthly_stats,
            }
        )

    # Top-level key order mirrors the existing artifact.
    return {
        "source": SOURCE_RELATIVE,
        "baseline_kind": BASELINE_KIND,
        "schema_version": SCHEMA_VERSION,
        "generated_at": generated_at,
        "thresholds": {
            "min_total_observed_state_months": MIN_TOTAL_OBSERVED_STATE_MONTHS,
            "min_monthly_observations": MIN_MONTHLY_OBSERVATIONS,
        },
        "target": TARGET,
        "states": states,
    }


def load_existing() -> dict:
    with ARTIFACT_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def _load_backend_validator():
    """Return the backend validator, or ``(None, reason)`` when unavailable."""
    if str(BACKEND_SRC) not in sys.path:
        sys.path.insert(0, str(BACKEND_SRC))
    try:
        from app.services.cholera import _validate_model
    except ImportError as exc:
        return None, f"not importable ({exc})"
    return _validate_model, None


def _check(problems: list[str], ok: bool, label: str, detail: str = "") -> None:
    if ok:
        print(f"PASS  {label}")
        return
    message = f"{label}: {detail}" if detail else label
    print(f"FAIL  {message}")
    problems.append(message)


def _summarize(messages: list[str], limit: int = 5) -> str:
    shown = "; ".join(messages[:limit])
    if len(messages) > limit:
        shown += f"; ... (+{len(messages) - limit} more)"
    return shown


def validate(generated: dict, existing: dict) -> list[str]:
    """Compare the generated artifact with the existing backend artifact."""
    problems: list[str] = []

    validator, import_error = _load_backend_validator()
    if validator is None:
        print(f"SKIP  backend _validate_model {import_error}")
    else:
        try:
            validator(generated)
        except Exception as exc:  # noqa: BLE001 - surface every validator error
            _check(problems, False, "backend _validate_model", str(exc))
        else:
            print("PASS  backend _validate_model accepted the generated artifact")

    generated_states = generated.get("states", [])
    existing_states = existing.get("states", [])

    _check(
        problems,
        len(generated_states) == EXPECTED_STATE_COUNT,
        f"expected exactly {EXPECTED_STATE_COUNT} states",
        f"generated {len(generated_states)}",
    )

    generated_names = [row["state"] for row in generated_states]
    existing_names = [row["state"] for row in existing_states]
    _check(
        problems,
        generated_names == existing_names,
        "state ordering matches the existing artifact",
        (
            f"generated {len(generated_names)} states, existing "
            f"{len(existing_names)} states"
            if generated_names != existing_names
            else ""
        ),
    )

    metadata_mismatches = [
        key for key in METADATA_KEYS if generated.get(key) != existing.get(key)
    ]
    _check(
        problems,
        not metadata_mismatches,
        "metadata matches the existing artifact (generated_at excluded)",
        _summarize(
            [
                f"{key}: generated={generated.get(key)!r} "
                f"existing={existing.get(key)!r}"
                for key in metadata_mismatches
            ]
        ),
    )

    generated_by_state = {row["state"]: row for row in generated_states}

    total_mismatches: list[str] = []
    observation_mismatches: list[str] = []
    mean_mismatches: list[str] = []
    other_mismatches: list[str] = []
    compared_observations = 0
    compared_means = 0

    for existing_state in existing_states:
        name = existing_state["state"]
        generated_state = generated_by_state.get(name)

        if generated_state is None:
            total_mismatches.append(f"{name}: missing state")
            continue

        if generated_state.get("total_observed_state_months") != existing_state.get(
            "total_observed_state_months"
        ):
            total_mismatches.append(
                f"{name}: generated "
                f"{generated_state.get('total_observed_state_months')!r} != "
                f"existing {existing_state.get('total_observed_state_months')!r}"
            )

        for field in (
            "status",
            "distinct_calendar_months",
            "coverage_pct",
            "first_observed_year",
            "last_observed_year",
        ):
            if generated_state.get(field) != existing_state.get(field):
                other_mismatches.append(
                    f"{name}.{field}: generated {generated_state.get(field)!r} "
                    f"!= existing {existing_state.get(field)!r}"
                )

        generated_months = {
            entry["month"]: entry for entry in generated_state.get("monthly_stats", [])
        }
        existing_months = {
            entry["month"]: entry for entry in existing_state.get("monthly_stats", [])
        }

        for month, existing_entry in existing_months.items():
            compared_observations += 1
            generated_entry = generated_months.get(month)
            if generated_entry is None:
                observation_mismatches.append(f"{name} month {month}: missing")
                continue

            if generated_entry.get("observations") != existing_entry.get(
                "observations"
            ):
                observation_mismatches.append(
                    f"{name} month {month}: generated "
                    f"{generated_entry.get('observations')!r} != existing "
                    f"{existing_entry.get('observations')!r}"
                )

            if (
                generated_entry.get("year_min") != existing_entry.get("year_min")
                or generated_entry.get("year_max") != existing_entry.get("year_max")
            ):
                other_mismatches.append(f"{name} month {month}: year bounds differ")

            expected_mean = existing_entry.get("mean_cases")
            actual_mean = generated_entry.get("mean_cases")
            if expected_mean is None and actual_mean is None:
                continue
            if expected_mean is None or actual_mean is None:
                mean_mismatches.append(
                    f"{name} month {month}: generated {actual_mean!r} != "
                    f"existing {expected_mean!r}"
                )
                continue
            compared_means += 1
            if not math.isclose(
                float(actual_mean),
                float(expected_mean),
                rel_tol=MEAN_REL_TOLERANCE,
                abs_tol=MEAN_ABS_TOLERANCE,
            ):
                mean_mismatches.append(
                    f"{name} month {month}: generated {actual_mean!r} != "
                    f"existing {expected_mean!r}"
                )

        for month in sorted(set(generated_months) - set(existing_months)):
            observation_mismatches.append(f"{name} month {month}: unexpected entry")

    _check(
        problems,
        not total_mismatches,
        f"state totals match the existing artifact ({len(existing_states)} compared)",
        _summarize(total_mismatches),
    )
    _check(
        problems,
        not observation_mismatches,
        "monthly observation counts match "
        f"({compared_observations} compared)",
        _summarize(observation_mismatches),
    )
    _check(
        problems,
        not mean_mismatches,
        f"monthly means match ({compared_means} compared, "
        f"tolerance {MEAN_ABS_TOLERANCE:g})",
        _summarize(mean_mismatches),
    )
    _check(
        problems,
        not other_mismatches,
        "status, coverage, distinct months and year bounds match",
        _summarize(other_mismatches),
    )

    return problems


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Generate a comparison Cholera baseline artifact without modifying "
            "the backend artifact."
        )
    )
    parser.add_argument(
        "--generated-at",
        default=None,
        help=(
            "Exact value for generated_at (deterministic output). Defaults to "
            "the current UTC time in ISO-8601 form."
        ),
    )
    args = parser.parse_args()

    if OUTPUT_PATH.resolve() == ARTIFACT_PATH.resolve():
        print("FAIL output path resolves to the backend artifact; refusing to write")
        return 1

    generated_at = args.generated_at or datetime.now(timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )

    print(f"source:       {SOURCE_CSV}")
    print(f"output:       {OUTPUT_PATH}")
    print(f"generated_at: {generated_at}")

    try:
        frame = load_source()
        generated = build_model(frame, generated_at)
    except Exception as exc:  # noqa: BLE001 - report a clean failure
        print(f"FAIL could not generate the model: {exc}")
        return 1

    try:
        with OUTPUT_PATH.open("w", encoding="utf-8") as handle:
            json.dump(generated, handle, indent=4, ensure_ascii=False, allow_nan=False)
            handle.write("\n")
    except Exception as exc:  # noqa: BLE001 - report a clean failure
        print(f"FAIL could not write {OUTPUT_PATH}: {exc}")
        return 1

    try:
        existing = load_existing()
    except Exception as exc:  # noqa: BLE001 - report a clean failure
        print(f"FAIL could not read the existing artifact: {exc}")
        return 1

    print()
    try:
        problems = validate(generated, existing)
    except Exception as exc:  # noqa: BLE001 - report a clean failure
        print(f"FAIL unexpected validation error: {exc}")
        return 1

    print()
    if problems:
        print(f"FAIL {len(problems)} check(s) failed")
        return 1

    print("PASS all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
