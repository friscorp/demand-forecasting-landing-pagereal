import hashlib
from io import BytesIO

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.db import get_db
from app.models.upload import Upload
from app.models.sales_fact import SalesFact
from app.models.user import User
from app.schemas.ingest import ColumnMapping, IngestResponse
from app.services.business_service import get_or_create_business

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("", response_model=IngestResponse)
async def ingest_csv(
    file: UploadFile = File(...),
    # mapping arrives as JSON string from form-data
    mapping: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1) Ensure business exists
    biz = await get_or_create_business(db, current_user.id)

    # 2) Read bytes + compute sha256
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    file_hash = hashlib.sha256(raw).hexdigest()

    # 3) Dedupe: same file already ingested for this business?
    res = await db.execute(
        select(Upload).where(Upload.business_id == biz.id, Upload.file_hash == file_hash)
    )
    existing = res.scalar_one_or_none()
    if existing:
        return IngestResponse(
            ok=True,
            business_id=biz.id,
            upload_id=None,
            file_hash=file_hash,
            rows_inserted=0,
            message="File already ingested (deduped by file hash).",
        )

    # 4) Parse mapping
    try:
        mapping_obj = ColumnMapping.model_validate_json(mapping)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid mapping JSON")

    # 5) Load CSV into DataFrame
    try:
        df = pd.read_csv(BytesIO(raw))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read CSV: {e}")

    for col in [mapping_obj.date, mapping_obj.item, mapping_obj.quantity]:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing column: {col}")

    # 6) Normalize + bucket to date
    df = df[[mapping_obj.date, mapping_obj.item, mapping_obj.quantity]].copy()
    df.rename(columns={
        mapping_obj.date: "timestamp",
        mapping_obj.item: "item",
        mapping_obj.quantity: "quantity",
    }, inplace=True)

    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
    df = df.dropna(subset=["timestamp", "item", "quantity"])

    # date bucket:
    df["ds"] = df["timestamp"].dt.date

    # quantity numeric:
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce")
    df = df.dropna(subset=["quantity"])

    # 7) Create upload record
    upload = Upload(business_id=biz.id, file_hash=file_hash)
    db.add(upload)
    await db.commit()
    await db.refresh(upload)

    # 8) Insert facts (bulk)
    rows = []
    for r in df.itertuples(index=False):
        rows.append({
            "business_id": biz.id,
            "upload_id": upload.id,
            "ds": r.ds,
            "item": str(r.item),
            "quantity": float(r.quantity),
        })

    # Optionally: if file huge, you’d batch inserts. For MVP, this is fine.
    await db.execute(SalesFact.__table__.insert(), rows)
    await db.commit()

    return IngestResponse(
        ok=True,
        business_id=biz.id,
        upload_id=upload.id,
        file_hash=file_hash,
        rows_inserted=len(rows),
        message="Ingested successfully.",
    )