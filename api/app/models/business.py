from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True, nullable=False)

    name: Mapped[str] = mapped_column(String(255), nullable=False, default="")

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
