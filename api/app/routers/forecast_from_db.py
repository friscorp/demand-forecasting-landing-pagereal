from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db

# Adjust these imports if your project paths differ.
# These names match what you've described in the project so far.
from app.auth.deps import get_current_user
from app.models.business import Business
from app.models.sales_fact import SalesFact
from app.models.upload import Upload
from app.models.user import User

router = APIRouter(prefix="/forecast", tags=["forecast"])


def _to_date(x: Any) -> Optional[date]:
    """Convert datetime/date/iso-string to a date."""
    if x is None:
        return None
    if isinstance(x, date) and not isinstance(x, datetime):
        return x
    if isinstance(x, datetime):
        return x.date()
    if isinstance(x, str):
        # try ISO formats: "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM:SS"
        try:
            return datetime.fromisoformat(x.replace("Z", "+00:00")).date()
        except Exception:
            return None
    return None


def _to_float(x: Any) -> Optional[float]:
    try:
        if x is None:
            return None
        return float(x)
    except Exception:
        return None


@router.post("/from-db")
async def forecast_from_db(
    horizon_days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Forecast using previously ingested DB data.

    Returns the SAME shape as /forecast:
    {
      "mode": "per_product",
      "results": {
        "<item>": {
          "meta": {"model": "baseline_mean_last_7", "regressors": []},
          "forecast": [{"ds": "...", "yhat": ..., "yhat_lower": ..., "yhat_upper": ...}, ...]
        }
      }
    }
    """
    # 1) find the user's business (you said: one business per user)
    biz_res = await db.execute(select(Business).where(Business.user_id == current_user.id))
    business = biz_res.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=400, detail="No business found for user. Complete onboarding first.")

    # 2) ensure at least one upload exists (so mapping exists)
    up_res = await db.execute(
        select(Upload)
        .where(Upload.business_id == business.id)
        .order_by(Upload.created_at.desc())
        .limit(1)
    )
    upload = up_res.scalar_one_or_none()
    if not upload:
        raise HTTPException(status_code=400, detail="No uploaded CSV found. Ingest CSV first.")
    # Optional: mapping check
  
    # 3) load sales facts
    facts_res = await db.execute(select(SalesFact).where(SalesFact.business_id == business.id))
    facts = facts_res.scalars().all()
    if not facts:
        raise HTTPException(status_code=400, detail="No sales data found in DB for this business. Ingest CSV first.")

    # 4) Collect per-item time series
    # We don't assume exact field names; we try common ones.
    per_item: Dict[str, List[Tuple[date, float]]] = defaultdict(list)

    for f in facts:
        # Try common field names
        ds_raw = (
            getattr(f, "ds", None)
            or getattr(f, "date", None)
            or getattr(f, "timestamp", None)
        )
        item_raw = (
            getattr(f, "item", None)
            or getattr(f, "product", None)
            or getattr(f, "sku", None)
        )
        qty_raw = (
            getattr(f, "quantity", None)
            or getattr(f, "units_sold", None)
            or getattr(f, "qty", None)
            or getattr(f, "y", None)
        )

        ds = _to_date(ds_raw)
        qty = _to_float(qty_raw)

        if ds is None or item_raw is None or qty is None:
            continue

        item = str(item_raw).strip()
        if not item:
            continue

        per_item[item].append((ds, qty))

    if not per_item:
        raise HTTPException(
            status_code=400,
            detail="Sales facts exist but none were usable (missing ds/item/quantity fields). Check your SalesFact model fields.",
        )

    # 5) Forecast: baseline mean of last 7 observations
    results: Dict[str, Any] = {}

    for item, rows in per_item.items():
        rows.sort(key=lambda t: t[0])  # sort by date ascending
        last_date = rows[-1][0]

        last_vals = [v for _, v in rows[-7:]]
        mean = sum(last_vals) / max(len(last_vals), 1)

        forecast_list: List[Dict[str, Any]] = []
        for i in range(1, horizon_days + 1):
            d = last_date + timedelta(days=i)
            yhat = mean
            forecast_list.append(
                {
                    "ds": d.isoformat(),
                    "yhat": round(yhat, 4),
                    "yhat_lower": round(yhat * 0.8, 4),
                    "yhat_upper": round(yhat * 1.2, 4),
                }
            )

        results[item] = {
            "meta": {"model": "baseline_mean_last_7", "regressors": []},
            "forecast": forecast_list,
        }

    return {"mode": "per_product", "results": results}