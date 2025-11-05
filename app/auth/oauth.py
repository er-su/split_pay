"""
Helpers for Google OAuth: build login url, exchange code for tokens, verify id_token.
Uses google-auth for secure id_token verification.
"""
import os
import requests
from typing import Dict, Any
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import dotenv
from pathlib import Path

dotenv.load(".env")


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")  # must match Google Console redirect URI

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

def build_google_auth_url(state: str | None = None, scope: str = "openid email profile") -> str:
    """Return URL to redirect the user to Google sign-in."""
    from urllib.parse import urlencode
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": scope,
        "access_type": "offline",  # we won't use refresh tokens, but this is common; no harm
        "prompt": "select_account",
    }
    if state:
        params["state"] = state
    return GOOGLE_AUTH_URL + "?" + urlencode(params)

def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    """Exchange authorization code for tokens at Google's token endpoint."""
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    resp = requests.post(GOOGLE_TOKEN_URL, data=data, timeout=10)
    resp.raise_for_status()
    return resp.json()

def verify_id_token(id_token_str: str) -> Dict[str, Any]:
    """
    Verify the id_token using google-auth.
    Returns the token claims dict if valid; raises ValueError on failure.
    """
    # google-auth will validate signature, exp, audience
    try:
        claims = id_token.verify_oauth2_token(id_token_str, google_requests.Request(), GOOGLE_CLIENT_ID, clock_skew_in_seconds=60)
    except ValueError as exc:
        # invalid token
        raise
    # optional: verify issuer
    if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError("Invalid issuer")
    return claims
