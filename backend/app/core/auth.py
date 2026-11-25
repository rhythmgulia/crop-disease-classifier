"""Small stdlib-only auth helpers for the app's bearer-token API."""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
import uuid
from pathlib import Path
from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.entities import User

def _load_local_env() -> None:
    for path in (Path.cwd() / ".env", Path(__file__).resolve().parents[3] / ".env"):
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip("\"'").strip())
        break


_load_local_env()
_TOKEN_SECRET = os.getenv("AUTH_SECRET") or secrets.token_urlsafe(32)
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return "pbkdf2_sha256$310000$%s$%s" % (
        base64.urlsafe_b64encode(salt).decode(), base64.urlsafe_b64encode(digest).decode()
    )


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, rounds, salt, expected = encoded.split("$")
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), base64.urlsafe_b64decode(salt), int(rounds)
        )
        return algorithm == "pbkdf2_sha256" and hmac.compare_digest(
            actual, base64.urlsafe_b64decode(expected)
        )
    except (ValueError, TypeError):
        return False


def create_token(user: User) -> str:
    payload = {"sub": str(user.id), "exp": int(time.time()) + 60 * 60 * 24 * 14}
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).rstrip(b"=")
    signature = hmac.new(_TOKEN_SECRET.encode(), body, hashlib.sha256).digest()
    return body.decode() + "." + base64.urlsafe_b64encode(signature).rstrip(b"=").decode()


def decode_token(token: str) -> Optional[str]:
    try:
        body, signature = token.split(".", 1)
        expected = hmac.new(_TOKEN_SECRET.encode(), body.encode(), hashlib.sha256).digest()
        actual = base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4))
        if not hmac.compare_digest(expected, actual):
            return None
        payload = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        if int(payload["exp"]) < int(time.time()):
            return None
        return payload["sub"]
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None


def current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    user_id = decode_token(credentials.credentials) if credentials else None
    try:
        user_key = uuid.UUID(user_id) if user_id else None
    except ValueError:
        user_key = None
    user = db.query(User).filter(User.id == user_key).first() if user_key else None
    if not user:
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    return user


def require_role(role: str):
    def dependency(user: User = Depends(current_user)) -> User:
        if user.role != role:
            raise HTTPException(status_code=403, detail="This page is only available to " + role + "s.")
        return user
    return dependency
