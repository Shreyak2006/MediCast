from datetime import date

from .dengue_data import calculate_dengue


def calculate(
    *,
    medicine: str,
    current_stock: int,
    yearly_sales: int,
    days: int,
    state: str | None = None,
    month: int | None = None,
    rain_prev_departure: float | None = None,
) -> dict:
    if medicine == "Dengue medicines":
        return calculate_dengue(
            current_stock=current_stock,
            yearly_sales=yearly_sales,
            days=days,
            state=state, 
            month=month if month is not None else date.today().month,
            rain_prev_departure=rain_prev_departure,
        )
    return {"status": "received"}
