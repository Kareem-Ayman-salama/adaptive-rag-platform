"""Text and visual index construction exports."""

from __future__ import annotations

from documind_rag.rag.notebook_core import (
    ClipQueryEmbeddings,
    build_indexes,
    build_visual_index,
    chunks_to_documents,
    document_to_chunk,
    embed_image_clip,
    embed_text_clip,
)

__all__ = [
    "ClipQueryEmbeddings",
    "build_indexes",
    "build_visual_index",
    "chunks_to_documents",
    "document_to_chunk",
    "embed_image_clip",
    "embed_text_clip",
]
