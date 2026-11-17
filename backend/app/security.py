import secrets
import bcrypt
from slowapi import Limiter
from slowapi.util import get_remote_address

SESSION_COOKIE_NAME = "postera_session"
SESSION_EXPIRE_HOURS = 24
LOGIN_RATE_LIMIT = "5/minute"
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

limiter = Limiter(key_func=get_remote_address)

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def generate_session_id() -> str:
    return secrets.token_urlsafe(32)
