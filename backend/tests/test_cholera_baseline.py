"""Tests for the Cholera baseline service (approved implementation plan).

Runs without pytest: `python backend/tests/test_cholera_baseline.py`.
"""

import csv
import json
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_REPO_ROOT / "backend" / "src"))

from app.services import cholera as cholera_service  # noqa: E402
from app.services.cholera import calculate_cholera  # noqa: E402
from app.services.dengue_data import calculate_dengue  # noqa: E402
from app.services.index import calculate  # noqa: E402

ARTIFACT_PATH = _REPO_ROOT / "backend" / "src" / "app" / "data" / "cholera_model.json"
SOURCE_CSV = _REPO_ROOT / "dataProcessing" / "cholera" / "processed" / "cholera_state_month.csv"


def _load_artifact():
    with open(ARTIFACT_PATH, encoding="utf-8") as handle:
        return json.load(handle)


def _load_source():
    with open(SOURCE_CSV, newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def _available_target():
    """Return an eligible (state, month, mean) that is present in the artifact."""
    artifact = _load_artifact()
    for state_row in artifact["states"]:
        if state_row["total_observed_state_months"] < 5:
            continue
        for month in state_row["monthly_stats"]:
            if month["mean_cases"] is not None and int(month["observations"]) >= 2:
                return (
                    state_row["state"],
                    int(month["month"]),
                    float(month["mean_cases"]),
                )
    raise AssertionError("expected at least one available (state, month)")


def test_artifact_matches_source_means_and_counts():
    artifact = _load_artifact()
    rows = _load_source()
    sums = {}
    years = {}
    distinct = set()
    for row in rows:
        state, year, month = row["State"], int(row["Year"]), int(row["Month"])
        distinct.add((state, year, month))
        sums.setdefault((state, month), []).append(float(row["RawSumCases"]))
        years.setdefault((state, month), set()).add(year)
    states = {s["state"]: s for s in artifact["states"]}
    assert set(states) == {k[0] for k in distinct}
    for state_row in artifact["states"]:
        state = state_row["state"]
        monthly = {int(m["month"]): m for m in state_row["monthly_stats"]}
        for (s, m), vals in sums.items():
            if s != state:
                continue
            entry = monthly[m]
            assert int(entry["observations"]) == len(years[(s, m)])
            if len(vals) >= 2:
                assert entry["mean_cases"] is not None
                assert abs(float(entry["mean_cases"]) - sum(vals) / len(vals)) < 1e-6
        total = len({(y, m) for (s, y, m) in distinct if s == state})
        assert state_row["total_observed_state_months"] == total


def test_available_state_month():
    artifact = _load_artifact()
    found = False
    for state_row in artifact["states"]:
        if state_row["total_observed_state_months"] < 5:
            continue
        for month in state_row["monthly_stats"]:
            if month["mean_cases"] is not None and int(month["observations"]) >= 2:
                result = calculate_cholera(state=state_row["state"], month=int(month["month"]))
                assert result["status"] == "available"
                assert result["predicted_cases"] == float(month["mean_cases"])
                assert result["observations"] == int(month["observations"])
                found = True
    assert found, "expected at least one available (state, month)"


def test_missing_month_returns_null_with_no_observations_reason():
    artifact = _load_artifact()
    for state_row in artifact["states"]:
        if state_row["total_observed_state_months"] >= 5:
            present = {int(m["month"]) for m in state_row["monthly_stats"]}
            for month in range(1, 13):
                if month not in present:
                    result = calculate_cholera(state=state_row["state"], month=month)
                    assert result["status"] == "month_not_observed"
                    assert result["predicted_cases"] is None
                    assert "No observations available" in result["fallback_reason"]
                    return


def test_single_observation_month_returns_distinct_reason():
    artifact = _load_artifact()
    target = None
    for state_row in artifact["states"]:
        if state_row["total_observed_state_months"] >= 5:
            for month in state_row["monthly_stats"]:
                if int(month["observations"]) == 1:
                    target = (state_row["state"], int(month["month"]))
                    break
        if target:
            break
    assert target is not None, "expected an eligible state with a 1-observation month"
    result = calculate_cholera(state=target[0], month=target[1])
    assert result["status"] == "month_not_observed"
    assert result["predicted_cases"] is None
    assert "Only 1 yearly observation" in result["fallback_reason"]


def test_insufficient_history_state():
    artifact = _load_artifact()
    state_row = next(
        s for s in artifact["states"] if 0 < s["total_observed_state_months"] < 5
    )
    result = calculate_cholera(state=state_row["state"], month=6)
    assert result["status"] == "insufficient_history"
    assert result["predicted_cases"] is None


def test_unknown_state():
    result = calculate_cholera(state="StateWithNoData123", month=6)
    assert result["status"] == "unknown_state"
    assert result["predicted_cases"] is None


def test_no_zero_fill():
    artifact = _load_artifact()
    for state_row in artifact["states"]:
        for month in range(1, 13):
            result = calculate_cholera(state=state_row["state"], month=month)
            if result["status"] != "available":
                assert result["predicted_cases"] is None


def test_available_predicted_cases_not_null():
    artifact = _load_artifact()
    found = False
    for state_row in artifact["states"]:
        for month in state_row["monthly_stats"]:
            result = calculate_cholera(state=state_row["state"], month=int(month["month"]))
            if result["status"] == "available":
                assert result["predicted_cases"] is not None
                found = True
    assert found


def test_dengue_unchanged():
    out = calculate(
        medicine="Dengue medicines",
        current_stock=30,
        yearly_sales=1200,
        days=30,
        state="Kerala",
    )
    assert "daily_average" in out and "seasonal_factor" in out and "target_stock" in out
    out2 = calculate_dengue(
        current_stock=30,
        yearly_sales=1200,
        days=30,
        state="Kerala",
        month=6,
        rain_prev_departure=None,
    )
    assert out2["status"] in ("Order needed", "Stock sufficient")


def test_dispatcher_routes_cholera():
    out = calculate(
        medicine="Cholera medicines",
        current_stock=30,
        yearly_sales=1200,
        days=30,
        state="Karnataka",
        month=6,
    )
    assert out["status"] in (
        "available",
        "month_not_observed",
        "insufficient_history",
        "no_data",
        "unknown_state",
    )
    assert "predicted_cases" in out and "fallback_reason" in out


def test_state_normalization_accepts_case_and_whitespace_variants():
    state, month, expected = _available_target()
    variants = [
        state.lower(),
        state.upper(),
        state.swapcase(),
        f"  {state}  ",
        f"\t{state.lower()}\n",
    ]
    for variant in variants:
        result = calculate_cholera(state=variant, month=month)
        assert result["status"] == "available", variant
        assert result["predicted_cases"] == expected, variant
        assert result["state"] == state, variant


def test_state_normalization_collapses_repeated_whitespace():
    state, month, expected = _available_target()
    result = calculate_cholera(state=state.replace(" ", "   "), month=month)
    assert result["status"] == "available"
    assert result["predicted_cases"] == expected
    assert result["state"] == state


def test_state_normalization_maps_ampersand_to_and():
    artifact = _load_artifact()
    for state_row in artifact["states"]:
        if state_row["total_observed_state_months"] < 5:
            continue
        if " and " not in state_row["state"].lower():
            continue
        month_entry = next(
            (
                m
                for m in state_row["monthly_stats"]
                if m["mean_cases"] is not None and int(m["observations"]) >= 2
            ),
            None,
        )
        if month_entry is None:
            continue
        variant = state_row["state"].lower().replace(" and ", " & ")
        result = calculate_cholera(state=variant, month=int(month_entry["month"]))
        assert result["status"] == "available"
        assert result["state"] == state_row["state"]
        assert result["predicted_cases"] == float(month_entry["mean_cases"])
        return
    raise AssertionError("expected an eligible state name containing 'and'")


def test_empty_and_whitespace_state_are_unknown():
    for value in ("", "   ", "\t\n"):
        result = calculate_cholera(state=value, month=6)
        assert result["status"] == "unknown_state"
        assert result["predicted_cases"] is None
        assert result["fallback_reason"] == "state is required"


def test_sufficient_observations_without_mean_has_distinct_reason():
    synthetic = {
        "state": "Synthetic No Mean State",
        "status": "partial",
        "total_observed_state_months": 6,
        "coverage_pct": 50.0,
        "monthly_stats": [{"month": 4, "observations": 3, "mean_cases": None}],
    }
    key = cholera_service._normalize_state(synthetic["state"])
    cholera_service._STATES[key] = synthetic
    try:
        result = calculate_cholera(state="Synthetic No Mean State", month=4)
    finally:
        cholera_service._STATES.pop(key, None)

    assert result["status"] == "month_not_observed"
    assert result["predicted_cases"] is None
    assert "No reported case totals" in result["fallback_reason"]
    assert "3 yearly observations" in result["fallback_reason"]


def test_validate_model_accepts_real_artifact():
    cholera_service._validate_model(_load_artifact())


def test_validate_model_rejects_malformed_artifacts():
    valid = _load_artifact()

    def variant(mutate):
        case = json.loads(json.dumps(valid))
        mutate(case)
        return case

    def drop_thresholds(case):
        del case["thresholds"]

    def drop_states(case):
        del case["states"]

    def empty_states(case):
        case["states"] = []

    def bad_threshold(case):
        case["thresholds"]["min_monthly_observations"] = 0

    def unsupported_status(case):
        case["states"][0]["status"] = "made_up"

    def inconsistent_status_total(case):
        case["states"][0]["status"] = "partial"
        case["states"][0]["total_observed_state_months"] = 1

    def monthly_not_list(case):
        case["states"][0]["monthly_stats"] = "not-a-list"

    def invalid_month(case):
        case["states"][0]["monthly_stats"][0]["month"] = 13

    def invalid_observations(case):
        case["states"][0]["monthly_stats"][0]["observations"] = 0

    def invalid_mean(case):
        case["states"][0]["monthly_stats"][0]["mean_cases"] = "many"

    def duplicate_state(case):
        case["states"].append(dict(case["states"][0]))

    def duplicate_month(case):
        case["states"][0]["monthly_stats"].append(
            dict(case["states"][0]["monthly_stats"][0])
        )

    payloads = {
        "not an object": [],
        "missing thresholds": variant(drop_thresholds),
        "missing states": variant(drop_states),
        "empty states": variant(empty_states),
        "invalid threshold": variant(bad_threshold),
        "unsupported status": variant(unsupported_status),
        "status inconsistent with totals": variant(inconsistent_status_total),
        "monthly_stats not a list": variant(monthly_not_list),
        "invalid month": variant(invalid_month),
        "invalid observations": variant(invalid_observations),
        "invalid mean_cases": variant(invalid_mean),
        "duplicate state": variant(duplicate_state),
        "duplicate month": variant(duplicate_month),
    }
    for label, payload in payloads.items():
        try:
            cholera_service._validate_model(payload)
        except ValueError:
            continue
        raise AssertionError(f"expected ValueError for malformed artifact: {label}")


def test_load_model_rejects_invalid_json_file():
    import tempfile

    with tempfile.TemporaryDirectory() as tmp_dir:
        path = Path(tmp_dir) / "cholera_model.json"

        path.write_text('{"states": [}', encoding="utf-8")
        try:
            cholera_service._load_model(path)
        except ValueError:
            pass
        else:
            raise AssertionError("expected ValueError for invalid JSON")

        path.write_text(json.dumps({"states": []}), encoding="utf-8")
        try:
            cholera_service._load_model(path)
        except ValueError:
            pass
        else:
            raise AssertionError("expected ValueError for a structurally invalid model")


def test_non_available_statuses_never_predict():
    thresholds = _load_artifact()["thresholds"]
    synthetic_states = [
        {
            "state": "Synthetic No Data",
            "status": "no_data",
            "total_observed_state_months": 0,
            "coverage_pct": 0.0,
            "monthly_stats": [],
        },
        {
            "state": "Synthetic Short History",
            "status": "insufficient_history",
            "total_observed_state_months": 2,
            "coverage_pct": 16.67,
            "monthly_stats": [{"month": 3, "observations": 1, "mean_cases": None}],
        },
        {
            "state": "Synthetic Missing Month",
            "status": "partial",
            "total_observed_state_months": 6,
            "coverage_pct": 50.0,
            "monthly_stats": [{"month": 3, "observations": 2, "mean_cases": 4.0}],
        },
    ]
    keys = []
    try:
        for row in synthetic_states:
            # Synthetic rows must themselves be valid artifact content.
            cholera_service._validate_model(
                {"thresholds": thresholds, "states": [row]}
            )
            key = cholera_service._normalize_state(row["state"])
            keys.append(key)
            cholera_service._STATES[key] = row

        expectations = {
            "Synthetic No Data": ("no_data", 1),
            "Synthetic Short History": ("insufficient_history", 3),
            "Synthetic Missing Month": ("month_not_observed", 1),
        }
        for name, (expected_status, month) in expectations.items():
            result = calculate_cholera(state=name, month=month)
            assert result["status"] == expected_status, name
            assert result["predicted_cases"] is None, name
            assert result["fallback_reason"], name
    finally:
        for key in keys:
            cholera_service._STATES.pop(key, None)


def test_dispatcher_uses_current_month_when_month_is_none():
    from datetime import date

    out = calculate(
        medicine="Cholera medicines",
        current_stock=0,
        yearly_sales=0,
        days=0,
        state="Assam",
        month=None,
    )
    assert out["month"] == date.today().month
    assert out["status"] in (
        "available",
        "month_not_observed",
        "insufficient_history",
        "no_data",
        "unknown_state",
    )
    assert "predicted_cases" in out


def test_dispatcher_normalizes_state():
    out = calculate(
        medicine="Cholera medicines",
        current_stock=0,
        yearly_sales=0,
        days=0,
        state="  aSsAm ",
        month=6,
    )
    assert out["state"] == "Assam"
    assert out["status"] == "available"


def test_cholera_request_skips_rain_lookup():
    from app.routers import calculate as calculate_router
    from app.schemas import CalculationRequest

    calls = []
    original = calculate_router.get_rain_prev_departure

    def spy(state, year, month):
        calls.append((state, year, month))
        return 1.23

    calculate_router.get_rain_prev_departure = spy
    try:
        cholera = calculate_router.calculate_request(
            CalculationRequest(
                medicine="Cholera medicines",
                current_stock=0,
                yearly_sales=1,
                days=1,
                state="Assam",
            )
        )
        assert calls == [], "Cholera requests must not trigger the rainfall lookup"
        assert "predicted_cases" in cholera

        dengue = calculate_router.calculate_request(
            CalculationRequest(
                medicine="Dengue medicines",
                current_stock=30,
                yearly_sales=1200,
                days=30,
                state="Kerala",
            )
        )
        assert calls and calls[0][0] == "Kerala", (
            "Dengue requests must keep looking up rainfall"
        )
        assert "target_stock" in dengue
    finally:
        calculate_router.get_rain_prev_departure = original


if __name__ == "__main__":
    failures = []
    for name in sorted(n for n in dir() if n.startswith("test_")):
        try:
            globals()[name]()
            print(f"PASS {name}")
        except Exception as exc:  # noqa: BLE001
            failures.append((name, exc))
            print(f"FAIL {name}: {exc!r}")
    total = len([n for n in dir() if n.startswith("test_")])
    print(f"TOTAL: {total}; FAILED: {len(failures)}")
    if failures:
        raise SystemExit(1)
