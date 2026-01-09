"""
Database connection and session management.
This is a stub for EPIC 0. Will be fully implemented in EPIC 2.
"""
from api.app.config import get_settings

settings = get_settings()


async def init_db():
    """Initialize database connection. To be implemented in EPIC 2."""
    pass


async def close_db():
    """Close database connection. To be implemented in EPIC 2."""
    pass
