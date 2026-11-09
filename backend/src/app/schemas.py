from pydantic import BaseModel, Field, field_validator


class InventoryItem(BaseModel):
    medicine: str
    quantity: int


class InventoryUpdate(BaseModel):
    medicine: str
    quantity: int = Field(gt=0)


class MedicineCreate(BaseModel):
    medicine: str


class CalculationRequest(BaseModel):
    medicine: str
    current_stock: int = Field(ge=0)
    yearly_sales: int = Field(gt=0)
    days: int = Field(gt=0)
    state: str | None = None
    month: int | None = Field(default=None, ge=1, le=12)
    rain_prev_departure: float | None = None

    @field_validator("medicine")
    @classmethod
    def medicine_must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Medicine must not be empty")
        return value


class CalculationResult(BaseModel):
    status: str
    daily_average: float | None = None
    seasonal_factor: float | None = None
    expected_daily_use: float | None = None
    target_stock: int | None = None
    shortfall: int | None = None
    baseline_source: str | None = None
    adjustment_applied: bool | None = None
    capped: bool | None = None
