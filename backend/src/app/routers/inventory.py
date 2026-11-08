from fastapi import APIRouter, HTTPException

from ..schemas import InventoryItem, InventoryUpdate, MedicineCreate
from ..store import inventory_data

router = APIRouter(prefix="/api", tags=["inventory"])


@router.get("/inventory", response_model=list[InventoryItem])
def read_inventory():
    return [
        InventoryItem(medicine=medicine, quantity=quantity)
        for medicine, quantity in inventory_data.items()
    ]


@router.post("/medicines", response_model=InventoryItem, status_code=201)
def add_medicine(payload: MedicineCreate):
    medicine = payload.medicine.strip()

    if not medicine:
        raise HTTPException(status_code=422, detail="Medicine is required")

    if medicine in inventory_data:
        raise HTTPException(status_code=409, detail="Medicine already exists")

    inventory_data[medicine] = 0
    return InventoryItem(medicine=medicine, quantity=0)


@router.post("/inventory", response_model=InventoryItem)
def add_inventory(update: InventoryUpdate):
    medicine = update.medicine.strip()

    if not medicine:
        raise HTTPException(status_code=422, detail="Medicine is required")

    inventory_data[medicine] = inventory_data.get(medicine, 0) + update.quantity
    return InventoryItem(medicine=medicine, quantity=inventory_data[medicine])
