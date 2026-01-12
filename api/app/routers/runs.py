from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.auth.deps import get_current_user
from app.models.forecast_run import ForecastRun
from app.models.user import User
from app.schemas.runs import SaveRunRequest, RunResponse
from fastapi import HTTPException

router = APIRouter(prefix="/runs", tags=["runs"])

@router.post("", response_model=RunResponse)
async def save_run(
    payload: SaveRunRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    run = ForecastRun(
        user_id=current_user.id,
        business_name=payload.business_name,
        mapping_json=payload.mapping_json,
        forecast_json=payload.forecast_json,
        insights_json=payload.insights_json,
    )
    print("SAVE RUN -> user.id:", current_user.id, "firebase_uid:", current_user.firebase_uid)

    db.add(run)
    await db.commit()
    print("SAVE RUN -> created run.id:", run.id)

    await db.refresh(run)

    return RunResponse(
        id=run.id,
        business_name=run.business_name,
        mapping_json=run.mapping_json,
        forecast_json=run.forecast_json,
        insights_json=run.insights_json,
        created_at=run.created_at.isoformat(),
    )

@router.get("/latest", response_model=RunResponse)
async def latest_run(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    print("GET LATEST RUN -> user.id:", current_user.id, "firebase_uid:", current_user.firebase_uid)

    result = await db.execute(
        select(ForecastRun)
        .where(ForecastRun.user_id == current_user.id)
        .order_by(desc(ForecastRun.created_at))
        .limit(1)
    )
    run = result.scalar_one_or_none()
    print("GET LATEST RUN -> found run:", run.id if run else None)

    if not run:
        # Return something frontend can handle
        raise HTTPException(status_code=404, detail="No runs found")

    return RunResponse(
        id=run.id,
        business_name=run.business_name,
        mapping_json=run.mapping_json,
        forecast_json=run.forecast_json,
        insights_json=run.insights_json,
        created_at=run.created_at.isoformat(),
    )
