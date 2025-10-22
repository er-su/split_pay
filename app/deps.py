# app/deps.py
from typing import Generator, Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.db import SessionLocal
from backend.schema import User
from app.auth.jwt_util import decode_access_token

COOKIE_NAME = "access_token"

def get_db() -> Generator[Session, None, None]:
    """
    Provide a Session-local DB connection for the request and close it afterwards.
    Use as: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Dependency to retrieve the currently authenticated user.

    Behavior:
    - Read the cookie named 'access_token'
    - Decode & validate JWT (signature + exp)
    - Load the User by id (the 'sub' claim is local user id)
    - On any failure raise HTTPException 401
    """
    token = None

    # Prefer cookie; fallback to Authorization header
    if COOKIE_NAME in request.cookies:
        token = request.cookies.get(COOKIE_NAME)
    else:
        # fallback to Authorization header if used by clients: "Authorization: Bearer <token>"
        auth: Optional[str] = request.headers.get("Authorization")
        if auth and auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    try:
        payload = decode_access_token(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    # sub is the local user id (string)
    try:
        user_id = int(sub)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid subject in token")

    user = db.get(User, user_id)
    if not user or user.is_deleted():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or deleted")

    return user
