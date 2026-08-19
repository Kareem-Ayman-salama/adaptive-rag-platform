"""Application configuration loaded from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = PACKAGE_ROOT.parent
load_dotenv(BACKEND_ROOT / ".env")
load_dotenv(PACKAGE_ROOT / ".env")


@dataclass(frozen=True)
class AppConfig:
    """Runtime settings for the RAG API."""

    groq_api_key: str | None = os.environ.get("GROQ_API_KEY")
    database_url: str = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{(BACKEND_ROOT / 'documind.db').as_posix()}",
    )
    jwt_secret_key: str = os.environ.get(
        "JWT_SECRET_KEY",
        "change-this-secret-in-production",
    )
    jwt_algorithm: str = os.environ.get("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(
        os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")
    )
    pdf_paths: tuple[str, ...] = field(
        default_factory=lambda: tuple(
            path.strip()
            for path in os.environ.get("DOCUMIND_PDF_PATHS", "").split(";")
            if path.strip()
        )
    )
    api_title: str = os.environ.get("DOCUMIND_API_TITLE", "DocuMind RAG API")
    api_version: str = os.environ.get("DOCUMIND_API_VERSION", "0.1.0")
    frontend_origins: tuple[str, ...] = field(
        default_factory=lambda: tuple(
            origin.strip()
            for origin in os.environ.get(
                "FRONTEND_ORIGINS",
                os.environ.get(
                    "DOCUMIND_CORS_ORIGINS",
                    "http://localhost:5173,http://127.0.0.1:5173",
                ),
            ).split(",")
            if origin.strip()
        )
    )
    auto_build_on_startup: bool = (
        os.environ.get("DOCUMIND_AUTO_BUILD", "false").lower() == "true"
    )


def get_config() -> AppConfig:
    """Return application configuration."""

    return AppConfig()
