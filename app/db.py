# app/db.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from backend.schema import Base

# Use DATABASE_URL env var, default to SQLite file for dev
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True, pool_pre_ping=True)
connection = engine.connect()
SessionLocal = sessionmaker(bind=connection, autoflush=False, autocommit=False, expire_on_commit=False)