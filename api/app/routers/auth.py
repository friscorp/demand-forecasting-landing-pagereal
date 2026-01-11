from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.models.user import User  # adjust if your path differs
from app.auth.security import hash_password, verify_password, create_access_token
from app.auth.deps import get_current_user
from app.schemas.auth import SignupRequest, LoginRequest, AuthResponse, MeResponse
from app.services.business_service import get_or_create_business

# after user is committed/refreshed:



router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=AuthResponse)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already in use")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await get_or_create_business(db, user.id, payload.business_name)

    settings = get_settings()
    token = create_access_token(
        subject=str(user.id),
        secret=settings.jwt_secret,
        expires_minutes=settings.jwt_expires_minutes,
    )
    return AuthResponse(access_token=token)

@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    settings = get_settings()
    token = create_access_token(
        subject=str(user.id),
        secret=settings.jwt_secret,
        expires_minutes=settings.jwt_expires_minutes,
    )
    return AuthResponse(access_token=token)

@router.get("/me", response_model=MeResponse)
async def me(current_user: User = Depends(get_current_user)):
    return MeResponse(id=current_user.id, email=current_user.email)
