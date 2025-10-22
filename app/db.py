# app/db.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Use DATABASE_URL env var, default to SQLite file for dev
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")

# ✅ allow override for testing
if os.getenv("TESTING") == "1":
    DATABASE_URL = "sqlite:///:memory:"

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
