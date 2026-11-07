from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class InventoryItem(BaseModel):
    medicine: str
    quantity: int


class InventoryUpdate(BaseModel):
    medicine: str
    quantity: int = Field(gt=0)


class MedicineCreate(BaseModel):
    medicine: str


# In-memory stock keyed by medicine name. Resets when the server restarts.
inventory_data: dict[str, int] = {
    "TB medicines": 90,
    "Dengue medicines": 30,
}


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/api/inventory", response_model=list[InventoryItem])
def read_inventory():
    return [
        InventoryItem(medicine=medicine, quantity=quantity)
        for medicine, quantity in inventory_data.items()
    ]


@app.post("/api/medicines", response_model=InventoryItem, status_code=201)
def add_medicine(payload: MedicineCreate):
    medicine = payload.medicine.strip()

    if not medicine:
        raise HTTPException(status_code=422, detail="Medicine is required")

    if medicine in inventory_data:
        raise HTTPException(status_code=409, detail="Medicine already exists")

    inventory_data[medicine] = 0
    return InventoryItem(medicine=medicine, quantity=0)


@app.post("/api/inventory", response_model=InventoryItem)
def add_inventory(update: InventoryUpdate):
    medicine = update.medicine.strip()

    if not medicine:
        raise HTTPException(status_code=422, detail="Medicine is required")

    inventory_data[medicine] = inventory_data.get(medicine, 0) + update.quantity
    return InventoryItem(medicine=medicine, quantity=inventory_data[medicine])
