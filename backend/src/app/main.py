from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import calculate, inventory

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inventory.router)
app.include_router(calculate.router)


@app.get("/")
def read_root():
    return {"Hello": "World"}
