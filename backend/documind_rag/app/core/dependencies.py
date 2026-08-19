"""Application dependency providers."""

from __future__ import annotations

from documind_rag.rag.service import ChatRagManager

rag_manager = ChatRagManager()


def get_rag_manager() -> ChatRagManager:
    """Return the process-local RAG manager."""

    return rag_manager

