from fastapi import APIRouter

from ..schemas import CalculationRequest
from ..services.calculation import calculate

router = APIRouter(prefix="/api", tags=["calculation"])


@router.post("/calculate")
def calculate_request(payload: CalculationRequest):
    return calculate(
        medicine=payload.medicine,
        current_stock=payload.current_stock,
        yearly_sales=payload.yearly_sales,
        days=payload.days,
    )
