from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""
    
    app_name: str = "Demand Navigator API"
    app_version: str = "0.1.0"
    debug: bool = False
    enable_db: bool = False
    
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    cors_origins: list[str] = ["http://localhost:8080", "http://localhost:5173", "https://v0-demand-forecasting-landing-page.vercel.app"]
    
    database_url: str = "postgresql://postgres:postgres@localhost:5432/demand_navigator"
    firebase_service_account_path: str

    jwt_secret: str
    jwt_expires_minutes: int = 60 * 24 * 7  # default 7 days
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore" 
    )
    


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    
    return Settings()
    
