"""
Application configuration.
Centralizes all settings: model paths, confidence thresholds, DB URL, etc.
"""
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # ── Paths ───────────────────────────────────────────────────────────
    MODEL_PATH: str = str(Path(__file__).resolve().parent.parent / "models" / "model_v0.1.0.pt")
    MODEL_VERSION: str = "v0.1.0"

    # ── Database ────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://app_user:app_password@localhost:5432/brain_tumor_app"

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

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
