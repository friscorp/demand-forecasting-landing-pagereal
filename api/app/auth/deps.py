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
    print("AUTH HEADER PRESENT:", bool(creds and creds.credentials))
    print("TOKEN PREFIX:", (creds.credentials[:20] if creds and creds.credentials else None))

    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = creds.credentials

    try:
        decoded = verify_firebase_token(token)
    except Exception as e:
        print("FIREBASE VERIFY ERROR:", repr(e))
        raise HTTPException(status_code=401, detail="Invalid token")

    firebase_uid = decoded.get("uid")
    email = decoded.get("email")

    print("DECODED UID:", firebase_uid)
    print("DECODED SUB:", decoded.get("sub"))
    print("DECODED EMAIL:", email)

    if not firebase_uid:
        raise HTTPException(status_code=401, detail="Token missing uid")

    # 1) Primary lookup by firebase_uid (stable)
    res = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = res.scalar_one_or_none()
    if user:
        # Optional: keep email updated
        if email and user.email != email:
            user.email = email
            await db.commit()
            await db.refresh(user)
        return user

    # 2) Optional repair: if a user exists with this email but firebase_uid is NULL, upgrade it
    if email:
        res2 = await db.execute(select(User).where(User.email == email))
        user2 = res2.scalar_one_or_none()
        if user2 and not user2.firebase_uid:
            user2.firebase_uid = firebase_uid
            await db.commit()
            await db.refresh(user2)
            return user2

    # 3) Create new user
    user = User(firebase_uid=firebase_uid, email=email)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
