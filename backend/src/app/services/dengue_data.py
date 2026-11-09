import json
import math
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent.parent / "data" / "dengue_model.json"

with MODEL_PATH.open(encoding="utf-8") as model_file:
    _DENGUE_MODEL = json.load(model_file)

_SEASONAL = {
    (row["state"], int(row["month_num"])): float(row["mean_log_cases"])
    for row in _DENGUE_MODEL["seasonal_table"]
}
_MONTH_FALLBACK = {
    int(month_num): float(value)
    for month_num, value in _DENGUE_MODEL["month_fallback"].items()
}
_OVERALL_MEAN = float(_DENGUE_MODEL["overall_mean"])
_SLOPE = float(_DENGUE_MODEL["slope"])
_INTERCEPT = float(_DENGUE_MODEL["intercept"])
_CLIP_MIN, _CLIP_MAX = (float(bound) for bound in _DENGUE_MODEL["clip_bounds"])

NAME_MAPPING = {
    # District spellings
    "pudukkottai": "pudukottai",
    # The rainfall file combines these two former states
    "dadra and nagar haveli": "the dadra and nagar haveli and daman and diu",
    "daman and diu": "the dadra and nagar haveli and daman and diu",
    # 2026 rainfall file spelling
    "andaman and nicobar": "andaman and nicobar islands",
}


def normalize_state(state: str | None) -> str | None:
    if state is None:
        return None
    state_key = state.strip().lower().replace("&", "and")
    state_key = " ".join(state_key.split())
    return NAME_MAPPING.get(state_key, state_key)


def calculate_dengue(
    *,
    current_stock: int,
    yearly_sales: int,
    days: int,
    state: str | None,
    month: int,
    rain_prev_departure: float | None,
) -> dict:
    state_key = normalize_state(state)

    annual_total = 0.0
    for month_num in range(1, 13):
        if state_key is not None and (state_key, month_num) in _SEASONAL:
            log_value = _SEASONAL[(state_key, month_num)]
        elif month_num in _MONTH_FALLBACK:
            log_value = _MONTH_FALLBACK[month_num]
        else:
            log_value = _OVERALL_MEAN
        annual_total += math.expm1(log_value)
    annual_mean = annual_total / 12

    if state_key is not None and (state_key, month) in _SEASONAL:
        baseline_log = _SEASONAL[(state_key, month)]
        baseline_source = "state_month"
    elif month in _MONTH_FALLBACK:
        baseline_log = _MONTH_FALLBACK[month]
        baseline_source = "month_fallback"
    else:
        baseline_log = _OVERALL_MEAN
        baseline_source = "overall"

    baseline_value = math.expm1(baseline_log)
    requested_value = baseline_value
    adjustment_applied = rain_prev_departure is not None
    if adjustment_applied:
        clipped_departure = max(_CLIP_MIN, min(_CLIP_MAX, rain_prev_departure))
        requested_value = math.expm1(
            baseline_log + _INTERCEPT + _SLOPE * clipped_departure
        )

    raw_seasonal_factor = requested_value / annual_mean
    capped = raw_seasonal_factor < 0.25 or raw_seasonal_factor > 4.0
    seasonal_factor = max(0.25, min(4.0, raw_seasonal_factor))

    daily_average = yearly_sales / 365
    expected_daily_use = daily_average * seasonal_factor
    target_stock = math.ceil(expected_daily_use * days)
    shortfall = max(0, target_stock - current_stock)
    status = "Order needed" if shortfall > 0 else "Stock sufficient"

    return {
        "daily_average": daily_average,
        "seasonal_factor": seasonal_factor,
        "expected_daily_use": expected_daily_use,
        "target_stock": target_stock,
        "shortfall": shortfall,
        "status": status,
        "baseline_source": baseline_source,
        "adjustment_applied": adjustment_applied,
        "capped": capped,
    }
