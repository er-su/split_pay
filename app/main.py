from fastapi import Depends, FastAPI

from .deps import get_db, get_current_user
from .routers import groups, transactions, auth, users
from .db import engine, SessionLocal
from backend.schema import Base
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(transactions.router)
app.include_router(users.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)