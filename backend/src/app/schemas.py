from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

Role = Literal["admin", "member"]
HospitalType = Literal["government", "private", "clinic"]


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
    predicted_cases: float | None = None
    observations: int | None = None
    coverage_pct: float | None = None
    fallback_reason: str | None = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str


class OrganizationResponse(BaseModel):
    id: str
    name: str
    code: str
    state: str | None = None
    district: str | None = None
    pincode: str | None = None
    hospital_type: HospitalType | None = None


class MemberResponse(BaseModel):
    id: str
    name: str
    email: str
    role: Role


class PendingRequestResponse(BaseModel):
    id: str
    name: str
    email: str
    requested_at: str


class AuthState(BaseModel):
    user: UserResponse
    organization: OrganizationResponse | None = None
    role: Role | None = None
    members: list[MemberResponse] = Field(default_factory=list)
    pending_join_code: str | None = None


class AuthResponse(AuthState):
    token: str


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name must not be empty")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class OrganizationCreate(BaseModel):
    name: str
    state: str
    district: str
    pincode: str = Field(pattern=r"^[1-9][0-9]{5}$")
    hospital_type: HospitalType

    @field_validator("name", "state", "district")
    @classmethod
    def text_must_not_be_empty(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Field must not be empty")
        return value


class JoinRequestCreate(BaseModel):
    code: str

    @field_validator("code")
    @classmethod
    def code_must_not_be_empty(cls, value: str) -> str:
        value = value.strip().upper()
        if not value:
            raise ValueError("Organization code is required")
        return value
