import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.models.business import Business
from app.models.sales_fact import SalesFact

router = APIRouter(prefix="/forecast", tags=["forecast"])

@router.post("/from-db")
async def forecast_from_db(
    horizon_days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # get business
    res = await db.execute(select(Business).where(Business.user_id == current_user.id))
    biz = res.scalar_one()

    # fetch facts
    res = await db.execute(
        select(SalesFact.ds, SalesFact.item, SalesFact.quantity)
        .where(SalesFact.business_id == biz.id)
    )
    rows = res.all()

    df = pd.DataFrame(rows, columns=["ds", "item", "quantity"])
    # If you want daily totals (recommended):
    df = df.groupby(["ds", "item"], as_index=False)["quantity"].sum()

    # TODO: call your existing forecasting core here:
    # result = run_forecast(df, horizon_days=horizon_days)
    # return result

    return {"ok": True, "rows": len(df), "horizon_days": horizon_days}
