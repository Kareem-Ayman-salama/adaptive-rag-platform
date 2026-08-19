"""Database setup for production and local development."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from documind_rag.app.core.config import get_config


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""


def _normalize_database_url(url: str) -> str:
    """Normalize Railway/Postgres URLs for SQLAlchemy."""

    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


config = get_config()
database_url = _normalize_database_url(config.database_url)
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_db() -> None:
    """Create database tables when the application starts."""

    from documind_rag.app.models import document_source  # noqa: F401
    from documind_rag.app.models import user  # noqa: F401

    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Yield a database session for FastAPI dependencies."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
