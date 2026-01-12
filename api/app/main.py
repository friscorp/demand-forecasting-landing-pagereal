from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from fastapi import Request
from app.routers.auth import router as auth_router
from app.config import get_settings
from app.db import init_db, close_db, get_db
from app.routers.forecast import router as forecast_router
from app.routers.runs import router as runs_router
from app.routers.ingest import router as ingest_router
from app.routers.forecast_from_db import router as forecast_db_router


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"🚀 Starting {settings.app_name} v{settings.app_version}")
    if settings.enable_db:
        await init_db()
    yield
    print("👋 Shutting down...")
    if settings.enable_db:
        await close_db()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print("CORS ORIGINS:", settings.cors_origins)


app.include_router(ingest_router)
app.include_router(auth_router)
app.include_router(runs_router)
app.include_router(forecast_router)
app.include_router(forecast_db_router)

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "ok": True,
        "service": settings.app_name,
        "version": settings.app_version
    }


@app.get("/health/db")
async def health_db(db: AsyncSession = Depends(get_db)):
    """Database health check endpoint."""
    try:
        result = await db.execute(text("SELECT 1 as health"))
        row = result.first()
        return {
            "ok": True,
            "database": "connected",
            "test_query": row[0] if row else None
        }
    except Exception as e:
        return {
            "ok": False,
            "database": "error",
            "error": str(e)
        }



@app.middleware("http")
async def log_requests(request: Request, call_next):
    rid = uuid.uuid4().hex[:8]
    print(f"[{rid}] -> {request.method} {request.url.path}")
    response = await call_next(request)
    print(f"[{rid}] <- {response.status_code} {request.url.path}")
    return response


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.app_name}",
        "docs": "/api/docs",
        "health": "/health"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Catch-all exception handler."""
    print(f"❌ Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
