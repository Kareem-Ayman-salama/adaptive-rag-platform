"""Query rewriting utilities for retrieval-oriented search."""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from typing import Any, Literal

from pydantic import BaseModel, Field


class QueryRewriteResult(BaseModel):
    """Structured query rewrite output."""

    original_query: str
    rewritten_query: str
    language: Literal["ar", "en"]
    query_type: str
    filters: dict[str, Any] = Field(default_factory=dict)
    search_queries: list[str] = Field(default_factory=list)


def _fallback_rewrite(
    query: str,
    *,
    query_type: str,
    language: Literal["ar", "en"],
    filters: dict[str, Any],
) -> QueryRewriteResult:
    """Create a deterministic rewrite when the LLM rewrite is unavailable."""

    rewritten = " ".join(query.strip().split())
    page = filters.get("page")
    type_hint = filters.get("type_hint") or []

    hints: list[str] = []
    if page is not None:
        hints.append(f"page {page}")
    if type_hint:
        hints.extend(str(item) for item in type_hint)

    if language == "ar":
        bilingual_terms = {
            "جدول": "table",
            "صفحة": "page",
            "شكل": "figure chart image",
            "رسم": "diagram chart",
            "ملخص": "summary",
        }
        for arabic, english in bilingual_terms.items():
            if arabic in rewritten:
                hints.append(english)

    if hints:
        rewritten = f"{rewritten} {' '.join(hints)}"

    return QueryRewriteResult(
        original_query=query,
        rewritten_query=rewritten,
        language=language,
        query_type=query_type,
        filters=filters,
        search_queries=[rewritten],
    )


def _parse_json_object(raw_text: str) -> dict[str, Any]:
    """Parse a JSON object from a model response."""

    try:
        parsed = json.loads(raw_text)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if not match:
            return {}
        try:
            parsed = json.loads(match.group())
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}


def rewrite_query(
    query: str,
    *,
    query_type: str,
    language: Literal["ar", "en"],
    filters: dict[str, Any],
    llm_generate: Callable[[str], str] | None = None,
) -> QueryRewriteResult:
    """Rewrite a user query into a retrieval-friendly structured query.

    Args:
        query: The original user query.
        query_type: Preliminary query classification.
        language: Detected user language.
        filters: Existing extracted filters.
        llm_generate: Optional callable that accepts a prompt and returns text.

    Returns:
        A validated query rewrite result.
    """

    fallback = _fallback_rewrite(
        query,
        query_type=query_type,
        language=language,
        filters=filters,
    )
    if llm_generate is None:
        return fallback

    prompt = f"""
Rewrite this user question for a multimodal PDF RAG retriever.

Return ONLY valid JSON with:
- rewritten_query: one concise retrieval query
- search_queries: 1-3 alternative retrieval queries
- query_type: one of factual_text, exact_lookup, table_question,
  chart_question, image_question, summarization, cross_page
- filters: object containing page and type_hint when present

Keep the user's answer language as {language}.
Do not answer the question.

Original query: {query}
Preliminary query_type: {query_type}
Existing filters: {json.dumps(filters, ensure_ascii=False)}
"""
    try:
        parsed = _parse_json_object(llm_generate(prompt))
        if not parsed:
            return fallback

        rewritten_query = str(
            parsed.get("rewritten_query") or fallback.rewritten_query
        ).strip()
        search_queries_raw = parsed.get("search_queries") or [rewritten_query]
        search_queries = [
            str(item).strip()
            for item in search_queries_raw
            if str(item).strip()
        ][:3]
        parsed_filters = parsed.get("filters")
        merged_filters = dict(filters)
        if isinstance(parsed_filters, dict):
            merged_filters.update(
                {key: value for key, value in parsed_filters.items() if value is not None}
            )

        return QueryRewriteResult(
            original_query=query,
            rewritten_query=rewritten_query or fallback.rewritten_query,
            language=language,
            query_type=str(parsed.get("query_type") or query_type),
            filters=merged_filters,
            search_queries=search_queries or [rewritten_query],
        )
    except Exception:
        return fallback
