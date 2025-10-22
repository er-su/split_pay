"""
Simple JWT helper using HS256 for side-project simplicity.
TTL: 1 hour (3600 seconds) as requested.
"""
import os
import datetime
from jose import jwt, JWTError

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "dev-change-me")  # set secure value in production
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_TTL_SECONDS = int(os.getenv("JWT_TTL_SECONDS", str(3600)))  # 1 hour default

def create_access_token(subject: str | int) -> str:
    now = datetime.datetime.utcnow()
    exp = now + datetime.timedelta(seconds=JWT_TTL_SECONDS)
    payload = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError as exc:
        raise
