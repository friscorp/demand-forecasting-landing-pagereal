from __future__ import annotations

import io
import csv
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, UploadFile, HTTPException

router = APIRouter(prefix="/forecast", tags=["forecast"])


def _parse_date(value: str) -> date:

    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d", "%m-%d-%Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            pass

    try:
        return datetime.fromisoformat(value.strip()).date()
    except Exception:
        raise ValueError(f"Unrecognized date: {value}")


@router.post("")
async def forecast(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    horizon_days: int = Form(7),
) -> Dict[str, Any]:
    """
    MVP endpoint:
    - file: sales CSV (multipart)
    - mapping: JSON string, e.g. {"date":"Date","item":"Item","quantity":"Quantity"}
    - horizon_days: default 7
    Returns per-item forecast for next N days.
    """
    import json


    try:
        m = json.loads(mapping)
        date_col = m["date"]
        item_col = m["item"]
        qty_col = m["quantity"]
    except Exception:
        raise HTTPException(
            status_code=400,
            detail='Invalid mapping. Expected JSON like {"date":"...","item":"...","quantity":"..."}',
        )


    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except Exception:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV missing header row")


    cols = set(reader.fieldnames)
    missing = [c for c in (date_col, item_col, qty_col) if c not in cols]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing columns in CSV: {missing}")


    per_item: Dict[str, List[tuple[date, float]]] = {}
    for row in reader:
        try:
            ds = _parse_date(row[date_col])
            item = str(row[item_col]).strip()
            qty = float(str(row[qty_col]).strip() or 0)
        except Exception:
            # skip if
            continue
        if not item:
            continue
        per_item.setdefault(item, []).append((ds, qty))

    if not per_item:
        raise HTTPException(status_code=400, detail="No usable rows found after parsing")

    # avg of last 7 observations per item
    results: Dict[str, Any] = {}
    for item, rows in per_item.items():
        rows.sort(key=lambda x: x[0])
        last_date = rows[-1][0]
        last_vals = [v for _, v in rows[-7:]]  # last 7
        mean = sum(last_vals) / max(len(last_vals), 1)

        forecast_list = []
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
