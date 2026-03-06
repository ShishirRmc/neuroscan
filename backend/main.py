"""
FastAPI application entrypoint.
Endpoints: POST /predict, GET /history, GET /health
"""
import hashlib
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import InferenceLog, get_session, init_db
from .model_service import model_service
from .schemas import (
    ErrorResponse,
    HealthResponse,
    HistoryItem,
    HistoryResponse,
    PredictionJobSubmission,
    PredictionResponse,
)

logger = logging.getLogger(__name__)


# ── Lifespan ────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load model and init DB. Shutdown: cleanup."""
    logger.info("Initializing database tables...")
    await init_db()
    
    # Safe Auto-Migration for Stage 2 (Zero-Breakage)
    from sqlalchemy import text
    try:
        from .database import engine as db_engine
        async with db_engine.begin() as conn:
            await conn.execute(text("ALTER TABLE inference_log ADD COLUMN IF NOT EXISTS reviewed_label VARCHAR(20)"))
            await conn.execute(text("ALTER TABLE inference_log ADD COLUMN IF NOT EXISTS reviewed_timestamp TIMESTAMPTZ"))
            await conn.execute(text("ALTER TABLE inference_log ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed'"))
            await conn.execute(text("ALTER TABLE inference_log ALTER COLUMN inference_time_ms DROP NOT NULL"))
    except Exception as e:
        logger.warning(f"Migration check failed (likely already applied): {e}")

    logger.info("Loading model from %s ...", settings.MODEL_PATH)
    try:
        model_service.load_model()
        logger.info("Model %s loaded successfully.", settings.MODEL_VERSION)
    except FileNotFoundError:
        logger.warning("Model file not found — /predict will return 503 until model is available.")

    yield  # App is running

    logger.info("Shutting down.")


# ── App ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Brain Tumor Classification API",
    description="AI-powered brain tumor detection from MRI scans. Research prototype — not for clinical use.",
    version=settings.MODEL_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow the Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from fastapi import BackgroundTasks

async def process_inference(log_id: int, image_bytes: bytes):
    """Background task to run inference and update the database."""
    from .database import async_session
    async with async_session() as session:
        try:
            result = model_service.predict(image_bytes)
            
            log_result = await session.execute(select(InferenceLog).where(InferenceLog.id == log_id))
            log_entry = log_result.scalar_one()
            
            log_entry.predicted_label = result["predicted_label"]
            log_entry.tumor_probability = result["tumor_probability"]
            log_entry.confidence = result["confidence"]
            log_entry.requires_human_review = result["requires_human_review"]
            log_entry.inference_time_ms = result["inference_time_ms"]
            log_entry.status = "completed"
            # Heatmap support would require storing the base64 or a file path in the DB
            # For this prototype, we'll assume the client gets the heatmap in the final GET
            
            await session.commit()
        except Exception as e:
            logger.exception(f"Background inference failed for log {log_id}")
            log_result = await session.execute(select(InferenceLog).where(InferenceLog.id == log_id))
            log_entry = log_result.scalar_one()
            log_entry.status = "failed"
            await session.commit()

# ── POST /predict ───────────────────────────────────────────────────────
@app.post(
    "/predict",
    response_model=PredictionJobSubmission,
    responses={400: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
    summary="Upload an MRI scan and start an async inference job.",
)
async def predict(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    # ── 1. Validate model is loaded ─────────────────────────────────
    if not model_service.is_loaded:
        raise HTTPException(status_code=503, detail="Model is not loaded. Please try again later.")

    # ── 2. Validate MIME type ───────────────────────────────────────
    if file.content_type not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Allowed: {settings.ALLOWED_MIME_TYPES}",
        )

    # ── 3. Read and validate file size ──────────────────────────────
    image_bytes = await file.read()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(image_bytes) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({len(image_bytes)} bytes). Max allowed: {max_bytes} bytes ({settings.MAX_FILE_SIZE_MB} MB).",
        )

    # ── 4. Validate image is decodable ──────────────────────────────
    try:
        from PIL import Image
        from io import BytesIO
        Image.open(BytesIO(image_bytes)).verify()
    except Exception:
        raise HTTPException(status_code=400, detail="File is not a valid image or is corrupted.")

    # ── 4.5 Validate Modality (OOD Check) ───────────────────────────
    if not model_service.is_valid_modality(image_bytes):
        raise HTTPException(
            status_code=400,
            detail="Out-of-Distribution Error: Please upload a valid brain MRI scan."
        )

    # ── 5. Create initial log entry ─────────────────────────────────
    image_hash = hashlib.sha256(image_bytes).hexdigest()
    now = datetime.now(timezone.utc)
    
    log_entry = InferenceLog(
        timestamp=now,
        image_hash=image_hash,
        original_filename=file.filename,
        predicted_label="pending",
        tumor_probability=0.0,
        confidence="pending",
        requires_human_review=False,
        model_version=settings.MODEL_VERSION,
        status="processing",
    )
    session.add(log_entry)
    await session.commit()
    await session.refresh(log_entry)

    # ── 6. Queue background task ────────────────────────────────────
    background_tasks.add_task(process_inference, log_entry.id, image_bytes)

    return PredictionJobSubmission(job_id=log_entry.id)


@app.get(
    "/predict/{id}",
    response_model=PredictionResponse,
    summary="Get the status and result of a prediction job.",
)
async def get_prediction(id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(InferenceLog).where(InferenceLog.id == id))
    log_entry = result.scalar_one_or_none()
    
    if not log_entry:
        raise HTTPException(status_code=404, detail="Prediction job not found.")
        
    return PredictionResponse(
        id=log_entry.id,
        status=log_entry.status,
        predicted_label=log_entry.predicted_label if log_entry.status == "completed" else None,
        tumor_probability=log_entry.tumor_probability if log_entry.status == "completed" else None,
        confidence=log_entry.confidence if log_entry.status == "completed" else None,
        requires_human_review=log_entry.requires_human_review if log_entry.status == "completed" else None,
        model_version=log_entry.model_version,
        inference_time_ms=log_entry.inference_time_ms,
        timestamp=log_entry.timestamp,
    )



# ── GET /history ────────────────────────────────────────────────────────
@app.get(
    "/history",
    response_model=HistoryResponse,
    summary="Retrieve paginated audit log of past inference requests.",
)
async def get_history(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    requires_review_only: bool = Query(False, description="Filter for items needing review"),
    session: AsyncSession = Depends(get_session),
):
    # Build query
    query = select(InferenceLog)
    count_query = select(func.count(InferenceLog.id))
    
    if requires_review_only:
        query = query.where(InferenceLog.requires_human_review == True).where(InferenceLog.reviewed_label.is_(None))
        count_query = count_query.where(InferenceLog.requires_human_review == True).where(InferenceLog.reviewed_label.is_(None))

    # Count total rows
    total_result = await session.execute(count_query)
    total = total_result.scalar_one()

    # Fetch paginated results
    offset = (page - 1) * page_size
    result = await session.execute(
        query.order_by(InferenceLog.timestamp.desc()).offset(offset).limit(page_size)
    )
    rows = result.scalars().all()

    items = [
        HistoryItem(
            id=row.id,
            status=row.status,
            timestamp=row.timestamp,
            original_filename=row.original_filename,
            predicted_label=row.predicted_label,
            tumor_probability=row.tumor_probability,
            confidence=row.confidence,
            requires_human_review=row.requires_human_review,
            model_version=row.model_version,
            inference_time_ms=row.inference_time_ms,
            reviewed_label=getattr(row, "reviewed_label", None),
        )
        for row in rows
    ]

    return HistoryResponse(items=items, total=total, page=page, page_size=page_size)


# ── POST /history/{id}/review ───────────────────────────────────────────
from pydantic import BaseModel
class ReviewRequest(BaseModel):
    reviewed_label: str  # 'healthy' or 'tumor'

@app.post(
    "/history/{id}/review",
    summary="Submit a human review for a past inference.",
)
async def submit_review(
    id: int,
    request: ReviewRequest,
    session: AsyncSession = Depends(get_session)
):
    from fastapi import HTTPException
    if request.reviewed_label not in settings.CLASS_LABELS:
         raise HTTPException(status_code=400, detail="Invalid label.")
         
    result = await session.execute(select(InferenceLog).where(InferenceLog.id == id))
    log_entry = result.scalar_one_or_none()
    
    if not log_entry:
        raise HTTPException(status_code=404, detail="Inference log not found.")
        
    log_entry.reviewed_label = request.reviewed_label
    log_entry.reviewed_timestamp = datetime.now(timezone.utc)
    
    await session.commit()
    return {"status": "success", "id": id, "reviewed_label": log_entry.reviewed_label}


# ── GET /health ─────────────────────────────────────────────────────────
@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check: model loaded + database accessible.",
)
async def health(session: AsyncSession = Depends(get_session)):
    db_ok = False
    try:
        await session.execute(select(1))
        db_ok = True
    except Exception:
        pass

    return HealthResponse(
        status="ok" if (model_service.is_loaded and db_ok) else "degraded",
        model_loaded=model_service.is_loaded,
        model_version=settings.MODEL_VERSION,
        database_connected=db_ok,
    )
