"""
Pydantic schemas for API request/response validation.
"""
from datetime import datetime

from pydantic import BaseModel, Field


class PredictionJobSubmission(BaseModel):
    """Initial response from POST /predict when inference is async."""
    job_id: int
    status: str = "processing"


class PredictionResponse(BaseModel):
    """Structured JSON returned by GET /predict/{id}."""
    id: int
    status: str  # 'processing', 'completed', 'failed'
    predicted_label: str | None = None
    tumor_probability: float | None = Field(default=None, ge=0.0, le=1.0)
    confidence: str | None = None
    requires_human_review: bool | None = None
    model_version: str | None = None
    inference_time_ms: float | None = Field(default=None, ge=0.0)
    timestamp: datetime
    heatmap_base64: str | None = None
    disclaimer: str = Field(
        default="This is an AI-generated assessment for research purposes only. "
                "It does NOT constitute a clinical diagnosis. "
                "Please consult a qualified medical professional.",
        description="Mandatory safety disclaimer"
    )


class HistoryItem(BaseModel):
    """Single row from the audit log."""
    id: int
    status: str
    timestamp: datetime
    original_filename: str | None
    predicted_label: str | None
    tumor_probability: float | None
    confidence: str | None
    requires_human_review: bool | None
    model_version: str | None
    inference_time_ms: float | None
    reviewed_label: str | None = None


class HistoryResponse(BaseModel):
    """Paginated audit log response."""
    items: list[HistoryItem]
    total: int
    page: int
    page_size: int


class HealthResponse(BaseModel):
    """Response for GET /health."""
    status: str = "ok"
    model_loaded: bool
    model_version: str
    database_connected: bool


class ErrorResponse(BaseModel):
    """Generic error response."""
    detail: str
