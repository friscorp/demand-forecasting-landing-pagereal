from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.business import Business

async def get_or_create_business(db: AsyncSession, user_id: int, name: str | None = None) -> Business:
    res = await db.execute(select(Business).where(Business.user_id == user_id))
    biz = res.scalar_one_or_none()
    if biz:
        # optionally update name if empty and we got one
        if name and (not biz.name):
            biz.name = name
            await db.commit()
            await db.refresh(biz)
        return biz

    biz = Business(user_id=user_id, name=name or "")
    db.add(biz)
    await db.commit()
    await db.refresh(biz)
    return biz