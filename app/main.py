from fastapi import Depends, FastAPI

from .deps import get_db, get_current_user
from .routers import groups, transactions, auth

app = FastAPI()

app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(transactions.router)

@app.get("/")
async def root():
    return {"message": "Hello Bigger Applications!"}