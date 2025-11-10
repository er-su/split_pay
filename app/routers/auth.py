# app/routers/auth.py
from fastapi import APIRouter, Depends, Response, HTTPException, status, Request
from fastapi.responses import JSONResponse ,RedirectResponse
from sqlalchemy.orm import Session
import datetime

from app.deps import get_db
from app.auth.oauth import build_google_auth_url, exchange_code_for_tokens, verify_id_token
from app.auth.jwt_util import create_access_token,decode_access_token
from backend.schema import User

#router = APIRouter(prefix="/auth", tags=["auth"])
router = APIRouter(prefix="/api/auth", tags=["auth"])
COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 3600  # 1 hour in seconds; should match JWT_TTL_SECONDS

@router.post("/logout")
def logout_user(response: Response):
    """
    Logs out the current user by removing the JWT cookie.
    """
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        secure=False,
        samesite="lax",     
    )
    return {"message": "Successfully logged out"}

@router.get("/google/login")
def google_login():
    """
    Returns the Google auth URL that the frontend should redirect the browser to.
    Alternatively, the frontend could construct the URL itself.
    """
    return {"auth_url": build_google_auth_url()}

@router.get("/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
 #def google_callback(code: str, response: Response, db: Session = Depends(get_db)):
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
    #picture = claims.get("picture")

    if not google_sub or not email:
        raise HTTPException(status_code=400, detail="Google token missing required claims")

    # Find or create user by google_sub. If you prefer to find by email you can, but google_sub is stable.
    user = db.query(User).filter_by(google_sub=google_sub).first()
    if not user:
        user = User(
            google_sub=google_sub,
            email=email,
            display_name=name or email,
           # profile_pic=picture
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Issue app JWT (subject = local user id)
    token = create_access_token(user.id)

    response= RedirectResponse(
        url="http://127.0.0.1:5173/",
        status_code=status.HTTP_303_SEE_OTHER
    )
    # response= JSONResponse(
    #     content={"user": {"id": user.id, "email": user.email, "display_name": user.display_name}},
    #     status_code=200,
    # )
    # Set HttpOnly cookie. Secure=True required in production (HTTPS).
    response.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        secure=False, # this is just for locahost stuff.
        #secure=True,          # ensure HTTPS in production
        samesite="lax",
        
        max_age=COOKIE_MAX_AGE,
        path="/",
    )
    
    # Return a minimal JSON with user info (frontend might not read cookie directly)
    # response.headers["Location"] = "http://localhost:5173"

    return response# this is for easy redirect 
    # from fastapi.responses import RedirectResponse
    # return RedirectResponse(
    #     url="http://localhost:5173/auth/callback",
    #  status_code=status.HTTP_303_SEE_OTHER
    # )
   #return {"user": {"id": user.id, "email": user.email, "display_name": user.display_name}}

""" @router.post("/logout")
def logout(response: Response):
    # Clear the cookie on logout. This does not revoke tokens since tokens are stateless.
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"msg": "logged out"} """



# @router.get("/me")
# def me(request: Request, db: Session = Depends(get_db)):
#     sid = request.cookies.get(COOKIE_NAME)
#     if not sid:
#         raise HTTPException(status_code=401, detail="No session")
#     user_id = ...  # decode from sid (your decode_access_token)
#     user = db.get(User, user_id)
#     return {"user": {"id": user.id, "email": user.email, "display_name": user.display_name}}
""" @router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No session cookie")

    # ✅ catch decode errors -> 401 (not 500)
    try:
        payload = decode_access_token(token)   # returns a dict
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")

    try:
        user_id = int(payload["sub"])
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token payload: {e}")

    from backend.schema import User
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return {"user": {"id": user.id, "email": user.email, "display_name": user.display_name}}

 """

@router.get("/dev/echo-cookies")
def echo_cookies(request: Request):
    return {"cookies": dict(request.cookies)}

@router.get("/dev/set-test-cookie")
def set_test_cookie():
    from fastapi import Response
    r = Response("ok")
    r.set_cookie("access_token", "test", httponly=True, secure=False, samesite="lax", path="/")
    return r


@router.get("/dev/decode")
def dev_decode_cookie(request: Request):
    tok = request.cookies.get(COOKIE_NAME)
    try:
       payload = decode_access_token(tok) if tok else None
       sub = payload.get("sub") if isinstance(payload, dict) else None
       return {"has_cookie": tok is not None, "payload": payload, "sub": sub}

    except Exception as e:
        return {"has_cookie": tok is not None, "decode_error": str(e)}
