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

    @field_validator("medicine")
    @classmethod
    def medicine_must_not_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Medicine must not be empty")
        return value
