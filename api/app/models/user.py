from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)

    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)

    firebase_uid: Mapped[str | None] = mapped_column(String(128), unique=True, index=True, nullable=True)

    # unused
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)