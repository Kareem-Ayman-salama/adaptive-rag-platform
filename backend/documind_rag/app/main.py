"""FastAPI application factory for the DocuMind RAG service."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from documind_rag.app.controllers import (
    assistant_controller,
    document_controller,
    exam_controller,
    health_controller,
)
from documind_rag.app.core.config import get_config
from documind_rag.app.core.dependencies import get_rag_manager


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    config = get_config()
    app = FastAPI(title=config.api_title, version=config.api_version)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(config.frontend_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_controller.router)
    app.include_router(document_controller.router)
    app.include_router(assistant_controller.router)
    app.include_router(exam_controller.router)

    @app.on_event("startup")
    def startup() -> None:
        """Optionally build indexes on API startup."""

        if config.auto_build_on_startup and config.pdf_paths:
            get_rag_manager().build(list(config.pdf_paths))

    return app


app = create_app()
