# app/routers/auth.py
from fastapi import APIRouter, Depends, Response, HTTPException, status, Request
from sqlalchemy.orm import Session
import datetime

from app.deps import get_db
from app.auth.oauth import build_google_auth_url, exchange_code_for_tokens, verify_id_token
from app.auth.jwt_util import create_access_token
from backend.schema import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 3600  # 1 hour in seconds; should match JWT_TTL_SECONDS

@router.get("/google/login")
def google_login():
    """
    Returns the Google auth URL that the frontend should redirect the browser to.
    Alternatively, the frontend could construct the URL itself.
    """
    return {"auth_url": build_google_auth_url()}

@router.get("/google/callback")
def google_callback(code: str, response: Response, db: Session = Depends(get_db)):
    """
    Handles Google redirect with 'code'. Exchanges code for tokens, verifies id_token,
    ensures a User exists, issues app JWT and sets it as HttpOnly cookie.
    """
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    try:
        tokens = exchange_code_for_tokens(code)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Token exchange failed: {exc}")

    id_token_str = tokens.get("id_token")
    if not id_token_str:
        raise HTTPException(status_code=400, detail="No id_token returned by Google")

    try:
        claims = verify_id_token(id_token_str)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid id_token: {exc}")

    # Extract canonical fields
    google_sub = claims.get("sub")
    email = claims.get("email")
    name = claims.get("name")
    picture = claims.get("picture")

    if not google_sub or not email:
        raise HTTPException(status_code=400, detail="Google token missing required claims")

    # Find or create user by google_sub. If you prefer to find by email you can, but google_sub is stable.
    user = db.query(User).filter_by(google_sub=google_sub).first()
    if not user:
        user = User(
            google_sub=google_sub,
            email=email,
            display_name=name or email,
            profile_pic=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Issue app JWT (subject = local user id)
    token = create_access_token(user.id)

    # Set HttpOnly cookie. Secure=True required in production (HTTPS).
    response.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        secure=True,          # ensure HTTPS in production
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )

    # Return a minimal JSON with user info (frontend might not read cookie directly)
    return {"user": {"id": user.id, "email": user.email, "display_name": user.display_name}}

@router.get("/me")
def me(current_user = Depends(lambda: None)):
    """
    Placeholder: the real dependency will be injected by app.deps.get_current_user.
    This function is included so that you can inspect the endpoint behavior.
    In main.py the app will use get_current_user as the Depends on endpoints that need auth.
    """
    return {"msg": "implement me"}

@router.post("/logout")
def logout(response: Response):
    # Clear the cookie on logout. This does not revoke tokens since tokens are stateless.
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"msg": "logged out"}
