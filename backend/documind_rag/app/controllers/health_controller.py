"""Health endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from documind_rag.app.core.dependencies import get_rag_manager
from documind_rag.app.schemas import HealthResponse
from documind_rag.rag.service import ChatRagManager

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(
    rag_manager: ChatRagManager = Depends(get_rag_manager),
) -> HealthResponse:
    """Return API readiness and index counts."""

    return rag_manager.health()

