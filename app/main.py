from fastapi import Depends, FastAPI

from .routers import groups, transactions, auth, users, invites
from .db import engine #, SessionLocal, connection
from backend.schema import Base
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker

app = FastAPI()

app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(transactions.router)
app.include_router(users.router)
app.include_router(invites.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173"],  # frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    
)
Base.metadata.create_all(bind=engine)
#Base.metadata.create_all(bind=connection)

print(Base.metadata.tables.keys())