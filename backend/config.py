"""
Application configuration.
Centralizes all settings: model paths, confidence thresholds, DB URL, etc.
"""
from pydantic import model_validator
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # ── Paths ───────────────────────────────────────────────────────────
    MODEL_PATH: str = str(Path(__file__).resolve().parent.parent / "models" / "model_v0.1.0.pt")
    MODEL_VERSION: str = "v0.1.0"

    # ── Database ────────────────────────────────────────────────────────
    ENVIRONMENT: str = "dev"  # 'dev' or 'prod'
    
    # Placeholders for env-specific URLs
    DEV_DATABASE_URL: str = "postgresql+asyncpg://app_user:app_password@localhost:5432/brain_tumor_app"
    PROD_DATABASE_URL: str | None = None
    
    # Final URL used by the application
    DATABASE_URL: str | None = None
    
    # Production Pooling settings (Supabase recommendation)
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    @model_validator(mode="after")
    def resolve_database_url(self) -> "Settings":
        # 1. If DATABASE_URL is explicitly provided (e.g. injected by Cloud), use it.
        if self.DATABASE_URL:
            return self
            
        # 2. Otherwise, pick based on ENVIRONMENT
        if self.ENVIRONMENT == "prod":
            if not self.PROD_DATABASE_URL:
                import logging
                logging.getLogger(__name__).error("PROD_DATABASE_URL is missing in 'prod' environment!")
            self.DATABASE_URL = self.PROD_DATABASE_URL
        else:
            self.DATABASE_URL = self.DEV_DATABASE_URL
            
        return self

    # ── Confidence Policy ───────────────────────────────────────────────
    HIGH_CONFIDENCE_THRESHOLD: float = 0.85
    LOW_CONFIDENCE_THRESHOLD: float = 0.50
    TEMPERATURE: float = 1.5  # Calibration parameter for logits

    # ── Upload Validation ───────────────────────────────────────────────
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_MIME_TYPES: list[str] = ["image/jpeg", "image/png"]

    # ── Image Preprocessing ─────────────────────────────────────────────
    IMAGE_SIZE: int = 224
    IMAGENET_MEAN: list[float] = [0.485, 0.456, 0.406]
    IMAGENET_STD: list[float] = [0.229, 0.224, 0.225]

    # ── Class Labels ────────────────────────────────────────────────────
    CLASS_LABELS: list[str] = ["healthy", "tumor"]

    model_config = {
        "env_file": str(Path(__file__).resolve().parent / ".env"),
        "extra": "ignore"
    }


settings = Settings()
