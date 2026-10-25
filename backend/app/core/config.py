import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "JalSakshya"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "jalsakshya-secure-satellite-water-key-2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database: defaults to SQLite for instant plug-and-play local development;
    # Can be overridden with postgresql://user:pass@localhost:5432/jalsakshya for PostGIS
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/jalsakshya.db")
    
    # Upload storage directory
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    STATIC_SNAPSHOTS_DIR: Path = BASE_DIR / "uploads" / "snapshots"
    FIELD_PHOTOS_DIR: Path = BASE_DIR / "uploads" / "photos"
    
    # Satellite Sentinel-2 resolution threshold
    # Sentinel-2 pixel size is 10m x 10m (100 sqm = 0.01 ha).
    # Reliable water detection requires at least 10-15 pure pixels without mixed edge effects,
    # meaning structures < 0.15 hectares (~1500 sqm) cannot be reliably assessed.
    MIN_ASSESSABLE_SIZE_HA: float = 0.15
    MIN_ASSESSABLE_SIZE_SQM: float = 1500.0

    # India Bounding Box for Coordinate Validation
    INDIA_LAT_MIN: float = 6.5
    INDIA_LAT_MAX: float = 37.5
    INDIA_LON_MIN: float = 68.0
    INDIA_LON_MAX: float = 97.5

    class Config:
        case_sensitive = True

settings = Settings()

# Ensure required upload directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.STATIC_SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)
settings.FIELD_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
