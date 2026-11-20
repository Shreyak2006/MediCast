from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import admin, auth, calculate, inventory, organizations

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inventory.router)
app.include_router(calculate.router)
app.include_router(auth.router)
app.include_router(organizations.router)
app.include_router(admin.router)


@app.get("/")
def read_root():
    return {"Hello": "World"}
