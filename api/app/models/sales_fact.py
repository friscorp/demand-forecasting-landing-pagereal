from sqlalchemy import Date, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class SalesFact(Base):
    __tablename__ = "sales_facts"

    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True, nullable=False)
    upload_id: Mapped[int] = mapped_column(ForeignKey("uploads.id"), index=True, nullable=False)

    ds: Mapped[Date] = mapped_column(Date, index=True, nullable=False)
    item: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    quantity: Mapped[float] = mapped_column(nullable=False)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())