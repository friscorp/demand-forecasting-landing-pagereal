from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class Upload(Base):
    __tablename__ = "uploads"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True, nullable=False)

    file_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # sha256 hex

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())