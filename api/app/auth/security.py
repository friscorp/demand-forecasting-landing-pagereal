from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt
import hashlib

ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _normalize_password(password: str) -> str:
    """
    bcrypt has a 72-byte input limit. Pre-hash with SHA-256 so any length works.
    Return a stable ascii string for bcrypt to hash/verify.
    """
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return digest  # 64 chars, safe for bcrypt

def hash_password(password: str) -> str:
    print("DEBUG: hashing password length:", len(password.encode("utf-8")))
    normalized = _normalize_password(password)
    print("DEBUG: normalized length:", len(normalized.encode("utf-8")))
    return pwd_context.hash(normalized)
    

def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(_normalize_password(password), password_hash)

def create_access_token(*, subject: str, secret: str, expires_minutes: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm=ALGORITHM)
