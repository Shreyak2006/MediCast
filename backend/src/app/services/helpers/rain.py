import json
from pathlib import Path

from ..dengue_data import normalize_state

RAIN_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "rain_latest.json"

with RAIN_PATH.open(encoding="utf-8") as rain_file:
    _RAIN_ROWS = json.load(rain_file)

_RAIN_BY_STATE_MONTH = {
    (row["state"], row["month"]): row
    for row in _RAIN_ROWS
}


def get_rain_prev_departure(state: str, year: int, month: int) -> float | None:
    prev_month = month - 1
    prev_year = year
    if prev_month == 0:
        prev_month = 12
        prev_year -= 1

    month_key = f"{prev_year:04d}-{prev_month:02d}"
    state_key = normalize_state(state)
    entry = _RAIN_BY_STATE_MONTH.get((state_key, month_key))

    if entry is None:
        return None

    departure = entry.get("departure")
    if not entry.get("is_complete") or departure is None:
        return None

    return float(departure)
