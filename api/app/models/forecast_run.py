from sqlalchemy import ForeignKey, DateTime, func, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class ForecastRun(Base):
    __tablename__ = "forecast_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)

    business_name: Mapped[str] = mapped_column(String(255), nullable=True)
    mapping_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    forecast_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    insights_json: Mapped[dict] = mapped_column(JSON, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
