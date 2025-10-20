"""
Dependency injection utilities for DB session and user authentication.
"""
from sqlalchemy.orm import Session
from backend.db_driver import make_engine
from backend.schema import Base
from sqlalchemy.orm import sessionmaker
from fastapi import Depends, HTTPException, status

# --- Database ---
engine = make_engine("sqlite+pysqlite:///:memory:") # Change as necessary
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

def get_db():
    """FastAPI dependency for DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Authentication ---
def get_current_user():
    """
    Mock authentication dependency.
    Replace with real Google OAuth validation + JWT decoding.
    """
    # TODO: Replace this mock with an OAuth2 + JWT validation logic.
    pass