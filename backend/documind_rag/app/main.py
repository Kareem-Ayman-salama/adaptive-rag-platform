"""FastAPI application factory for the DocuMind RAG service."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from documind_rag.app.controllers import (
    assistant_controller,
    auth_controller,
    document_controller,
    exam_controller,
    health_controller,
)
from documind_rag.app.core.config import get_config
from documind_rag.app.core.database import init_db
from documind_rag.app.core.dependencies import get_rag_manager

FRONTEND_DIST_DIR = Path(
    os.environ.get(
        "FRONTEND_DIST_DIR",
        Path(__file__).resolve().parents[3] / "frontend_dist",
    )
)


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
    app.include_router(auth_controller.router)
    app.include_router(health_controller.router)
    app.include_router(document_controller.router)
    app.include_router(assistant_controller.router)
    app.include_router(exam_controller.router)

    assets_dir = FRONTEND_DIST_DIR / "assets"
    index_file = FRONTEND_DIST_DIR / "index.html"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.on_event("startup")
    def startup() -> None:
        """Optionally build indexes on API startup."""

        init_db()
        if config.auto_build_on_startup and config.pdf_paths:
            get_rag_manager().build(list(config.pdf_paths))

    if index_file.exists():

        @app.get("/", include_in_schema=False)
        def frontend_index() -> FileResponse:
            """Serve the production frontend shell."""

            return FileResponse(index_file)

        @app.get("/{full_path:path}", include_in_schema=False)
        def frontend_spa(full_path: str) -> FileResponse:
            """Serve client-side routes from the frontend shell."""

            requested_file = FRONTEND_DIST_DIR / full_path
            if requested_file.is_file():
                return FileResponse(requested_file)
            return FileResponse(index_file)

    return app


app = create_app()
