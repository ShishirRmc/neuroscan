"""
Database setup: async SQLAlchemy engine, session, and ORM models.
"""
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

# ── Engine & Session ────────────────────────────────────────────────────
engine_kwargs = {
    "echo": False,
}

# Production-grade tuning for Supabase / Remote DBs
if settings.ENVIRONMENT == "prod":
    engine_kwargs.update({
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
    })

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ── Base ────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── ORM Model ──────────────────────────────────────────────────────────
class InferenceLog(Base):
    __tablename__ = "inference_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    image_hash = Column(String(64), nullable=False)          # SHA-256 hex digest
    original_filename = Column(String(255), nullable=True)
    predicted_label = Column(String(20), nullable=False)
    tumor_probability = Column(Float, nullable=False)
    confidence = Column(String(10), nullable=False)           # 'high', 'medium', 'low'
    requires_human_review = Column(Boolean, nullable=False)
    model_version = Column(String(20), nullable=False)
    inference_time_ms = Column(Float, nullable=True)  # Nullable until processing completes
    status = Column(String(20), nullable=False, default="completed")  # 'processing', 'completed', 'failed'
    
    # Stage 2: HITL Fields (Nullable for backwards compatibility)
    reviewed_label = Column(String(20), nullable=True)
    reviewed_timestamp = Column(DateTime(timezone=True), nullable=True)


# ── Helpers ─────────────────────────────────────────────────────────────
async def init_db():
    """Create all tables if they don't exist."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    """Dependency to yield an async DB session."""
    async with async_session() as session:
        yield session
