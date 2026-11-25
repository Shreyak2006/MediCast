"""Cholera baseline forecasting service (approved plan).

Prediction target: monthly reported Cholera burden per state.
Baseline: per-state mean of observed monthly reported cases
(generated artifact: ``backend/src/app/data/cholera_model.json``).

Rules (approved plan):
- Only observed state-month records are used. Missing observations are
  never imputed and never filled with zero.
- A monthly mean is available only when the state has >= 2 yearly
  observations for that calendar month (see artifact thresholds).
- States with insufficient history (< 5 observed state-months) and states
  with no data return a status with ``predicted_cases = None``; states
  absent from the artifact are ``unknown_state``.
- State names are matched case-insensitively, ignoring surrounding and
  repeated whitespace, with ``&`` treated as ``and`` (same convention as
  the Dengue service).
- The generated artifact is validated on load; a malformed artifact fails
  loudly instead of silently degrading the forecast.
"""

import json
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent.parent / "data" / "cholera_model.json"

_SUPPORTED_STATUSES = frozenset(
    {"no_data", "insufficient_history", "complete", "partial"}
)
_BASELINE_SOURCE = "cholera_state_month_mean"


def _normalize_state(state):
    """Match state names case-insensitively, ignoring whitespace variations."""
    if state is None:
        return None
    state_key = str(state).strip().lower().replace("&", " and ")
    return " ".join(state_key.split())


def _validate_model(model):
    """Fail loudly when the generated artifact is malformed."""
    if not isinstance(model, dict):
        raise ValueError("cholera model artifact must be a JSON object")

    thresholds = model.get("thresholds")
    if not isinstance(thresholds, dict):
        raise ValueError("cholera model artifact is missing 'thresholds'")
    for key in ("min_total_observed_state_months", "min_monthly_observations"):
        value = thresholds.get(key)
        if not isinstance(value, int) or isinstance(value, bool) or value < 1:
            raise ValueError(
                f"cholera model threshold '{key}' must be a positive integer"
            )

    states = model.get("states")
    if not isinstance(states, list) or not states:
        raise ValueError(
            "cholera model artifact must contain a non-empty 'states' list"
        )

    min_total = thresholds["min_total_observed_state_months"]
    seen_states = set()

    for index, row in enumerate(states):
        if not isinstance(row, dict):
            raise ValueError(f"cholera model states[{index}] must be an object")

        name = row.get("state")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(
                f"cholera model states[{index}] is missing a state name"
            )
        state_key = _normalize_state(name)
        if state_key in seen_states:
            raise ValueError(f"cholera model has duplicate state '{name}'")
        seen_states.add(state_key)

        status = row.get("status")
        if status not in _SUPPORTED_STATUSES:
            raise ValueError(
                f"cholera model state '{name}' has unsupported status '{status}'"
            )

        total = row.get("total_observed_state_months")
        if not isinstance(total, int) or isinstance(total, bool) or total < 0:
            raise ValueError(
                f"cholera model state '{name}' has invalid "
                "'total_observed_state_months'"
            )
        if status == "no_data" and total != 0:
            raise ValueError(
                f"cholera model state '{name}' is 'no_data' but has {total} "
                "observed state-months"
            )
        if status == "insufficient_history" and not 0 < total < min_total:
            raise ValueError(
                f"cholera model state '{name}' is 'insufficient_history' but has "
                f"{total} observed state-months"
            )
        if status in ("complete", "partial") and total < min_total:
            raise ValueError(
                f"cholera model state '{name}' is '{status}' but has only "
                f"{total} observed state-months"
            )

        coverage = row.get("coverage_pct")
        if not isinstance(coverage, (int, float)) or isinstance(coverage, bool):
            raise ValueError(
                f"cholera model state '{name}' has invalid 'coverage_pct'"
            )

        monthly_stats = row.get("monthly_stats")
        if not isinstance(monthly_stats, list):
            raise ValueError(
                f"cholera model state '{name}' is missing 'monthly_stats'"
            )

        seen_months = set()
        for entry in monthly_stats:
            if not isinstance(entry, dict):
                raise ValueError(
                    f"cholera model state '{name}' has a non-object monthly entry"
                )

            month = entry.get("month")
            if (
                not isinstance(month, int)
                or isinstance(month, bool)
                or not 1 <= month <= 12
            ):
                raise ValueError(
                    f"cholera model state '{name}' has invalid month '{month}'"
                )
            if month in seen_months:
                raise ValueError(
                    f"cholera model state '{name}' repeats month {month}"
                )
            seen_months.add(month)

            observations = entry.get("observations")
            if (
                not isinstance(observations, int)
                or isinstance(observations, bool)
                or observations < 1
            ):
                raise ValueError(
                    f"cholera model state '{name}' month {month} has invalid "
                    "'observations'"
                )

            mean_cases = entry.get("mean_cases")
            if mean_cases is not None and (
                not isinstance(mean_cases, (int, float))
                or isinstance(mean_cases, bool)
            ):
                raise ValueError(
                    f"cholera model state '{name}' month {month} has invalid "
                    "'mean_cases'"
                )


def _load_model(path=MODEL_PATH):
    with Path(path).open(encoding="utf-8") as model_file:
        model = json.load(model_file)
    _validate_model(model)
    return model


_MODEL = _load_model()
_STATES = {_normalize_state(row["state"]): row for row in _MODEL["states"]}
_MIN_TOTAL_OBSERVED = int(_MODEL["thresholds"]["min_total_observed_state_months"])


def calculate_cholera(*, state: str | None, month: int) -> dict:
    state_key = _normalize_state(state)
    info = _STATES.get(state_key) if state_key else None

    if info is None:
        return {
            "status": "unknown_state",
            "predicted_cases": None,
            "baseline_source": _BASELINE_SOURCE,
            "state": state_key,
            "month": month,
            "observations": 0,
            "coverage_pct": 0.0,
            "fallback_reason": (
                "state not found in Cholera baseline"
                if state_key
                else "state is required"
            ),
        }

    display_state = info["state"]
    total = int(info["total_observed_state_months"])
    coverage_pct = float(info["coverage_pct"])
    observations = 0
    predicted = None
    reason = None

    if total == 0:
        status = "no_data"
        reason = f"state {display_state} has no observed months"
    elif total < _MIN_TOTAL_OBSERVED:
        status = "insufficient_history"
        observations = total
        reason = (
            f"state {display_state} has insufficient history "
            f"({total} observed state-months)"
        )
    else:
        entry = next(
            (row for row in info["monthly_stats"] if int(row["month"]) == month),
            None,
        )
        observations = int(entry["observations"]) if entry is not None else 0
        if (
            entry is not None
            and observations >= 2
            and entry.get("mean_cases") is not None
        ):
            status = "available"
            predicted = float(entry["mean_cases"])
        else:
            status = "month_not_observed"
            if entry is not None and observations >= 2:
                reason = (
                    f"No reported case totals for month {month} of state "
                    f"{display_state} despite {observations} yearly observations"
                )
            elif entry is not None and observations == 1:
                reason = (
                    f"Only 1 yearly observation available for month {month} of "
                    f"state {display_state}"
                )
            else:
                reason = (
                    f"No observations available for month {month} of state "
                    f"{display_state}"
                )

    return {
        "status": status,
        "predicted_cases": predicted,
        "baseline_source": _BASELINE_SOURCE,
        "state": display_state,
        "month": month,
        "observations": observations,
        "coverage_pct": coverage_pct,
        "fallback_reason": reason,
    }
