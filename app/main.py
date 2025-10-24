from fastapi import Depends, FastAPI

from .deps import get_db, get_current_user
from .routers import groups, transactions, auth
from .db import engine, SessionLocal
from backend.schema import Base

app = FastAPI()

app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(transactions.router)

Base.metadata.create_all(bind=engine)

@app.get("/")
async def root():
    return {"message": "Hello Bigger Applications!"}