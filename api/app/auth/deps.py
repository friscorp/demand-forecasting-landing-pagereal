from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.user import User
from app.auth.firebase import verify_firebase_token

bearer = HTTPBearer(auto_error=False)

async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
):
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = creds.credentials

    try:
        decoded = verify_firebase_token(token)
        firebase_uid = decoded["uid"]
        email = decoded.get("email")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Try find existing user
    res = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = res.scalar_one_or_none()
    if user:
        return user

    # If not found, create user row 
    user = User(firebase_uid=firebase_uid, email=email)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user