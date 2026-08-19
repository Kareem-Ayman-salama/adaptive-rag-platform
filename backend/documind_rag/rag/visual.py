"""Visual processing and lazy VLM enrichment exports."""

from __future__ import annotations

from documind_rag.rag.notebook_core import (
    classify_and_describe_image,
    discover_visual_regions,
    enrich_visual_candidates,
    pil_to_base64,
    render_chunk_image,
    segment_page_regions,
)

__all__ = [
    "classify_and_describe_image",
    "discover_visual_regions",
    "enrich_visual_candidates",
    "pil_to_base64",
    "render_chunk_image",
    "segment_page_regions",
]
