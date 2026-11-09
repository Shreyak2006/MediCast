from .dengue_data import calculate_dengue
def calculate(
    *,
    medicine: str,
    current_stock: int,
    yearly_sales: int,
    days: int,
) -> dict[str, str]:
    if medicine == "Dengue":
        return calculate_dengue(
            medicine=medicine,
            current_stock=current_stock,
            yearly_sales=yearly_sales,
            days=days,
        )
    return {"status": "received"}
