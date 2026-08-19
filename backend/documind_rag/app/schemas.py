"""Pydantic schemas for API requests and responses."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class QueryFilters(BaseModel):
    """Filters inferred from or supplied with a user query."""

    page: int | None = None
    type_hint: list[str] | None = None


class QueryMetadata(BaseModel):
    """Normalized query metadata returned to clients."""

    original: str
    rewritten: str
    language: Literal["ar", "en"]
    query_type: str
    filters: QueryFilters
    search_queries: list[str] = Field(default_factory=list)


class EvidenceItem(BaseModel):
    """Evidence block used to support an answer."""

    element_id: str | None = None
    document_id: str | None = None
    page: int
    type: str
    bbox: tuple[float, float, float, float] | None = None
    section: str | None = None
    retrieval_score: float | None = None
    visual_score: float | None = None


class ClaimItem(BaseModel):
    """Claim extracted from an answer and citation verification metadata."""

    claim: str
    page: int
    supported: bool | None = None
    score: float | None = None
    note: str | None = None


class AskRequest(BaseModel):
    """Question-answering request."""

    query: str = Field(..., min_length=1)
    chat_id: str | None = None
    document_ids: list[str] | None = None
    verbose: bool = False
    use_memory: bool = True


class AskResponse(BaseModel):
    """Stable API response shape for frontend and backend consumers."""

    answer: str
    query: QueryMetadata
    confidence: float
    hallucination_risk: float = 0.0
    groundedness_score: float = 1.0
    unsupported_claims: int = 0
    sources: list[int] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    claims: list[ClaimItem] = Field(default_factory=list)
    sub_questions: list[str] = Field(default_factory=list)
    raw: dict[str, Any] = Field(default_factory=dict)


class BuildRequest(BaseModel):
    """Document indexing request."""

    pdf_paths: list[str] = Field(..., min_length=1)
    chat_id: str | None = None


class BuildResponse(BaseModel):
    """Index build status returned by the API."""

    documents: dict[str, Any]
    chunk_count: int
    ready: bool


class HealthResponse(BaseModel):
    """Service health response."""

    ready: bool
    document_count: int
    chunk_count: int


class ExamRequest(BaseModel):
    """Request to generate an exam from the uploaded source."""

    chat_id: str | None = None
    topic: str | None = None
    difficulty: Literal["easy", "medium", "hard", "mixed"] = "medium"
    question_count: int = Field(default=10, ge=1, le=100)
    total_marks: int = Field(default=100, ge=1, le=1000)
    question_types: list[str] = Field(
        default_factory=lambda: ["mcq", "short_answer", "essay"]
    )
    language: Literal["ar", "en"] = "ar"


class ChatMessage(BaseModel):
    """Stored chat message."""

    role: Literal["user", "assistant"]
    content: str


class ChatHistoryResponse(BaseModel):
    """Conversation memory for a chat."""

    chat_id: str
    messages: list[ChatMessage]
