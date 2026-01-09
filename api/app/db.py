"""Database connection and session management."""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from api.app.config import get_settings

settings = get_settings()

DATABASE_URL = settings.database_url.replace(
    "postgresql://", 
    "postgresql+asyncpg://"
)

engine = None
async_session_maker = None


async def init_db():
    """Initialize database connection."""
    global engine, async_session_maker
    
    try:
        engine = create_async_engine(
            DATABASE_URL,
            echo=settings.debug,
            future=True,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
        
        async_session_maker = sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        
        async with engine.begin() as conn:
            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))
        
        print("✅ Database connection established")
        
    except Exception as e:
        print(f"⚠️  Database connection failed: {e}")
        print("   API will start without database connection. Check /health/db endpoint.")


async def close_db():
    """Close database connection."""
    global engine
    if engine:
        await engine.dispose()
        print("🔌 Database connection closed")


async def get_db() -> AsyncSession:
    """
    Dependency to get database session.
    To be used with FastAPI Depends() in route handlers.
    """
    if not async_session_maker:
        raise RuntimeError("Database not initialized")
    
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
