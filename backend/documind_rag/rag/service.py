"""Service facade around the notebook-derived RAG pipeline."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from documind_rag.app.schemas import (
    AskResponse,
    BuildResponse,
    ClaimItem,
    EvidenceItem,
    HealthResponse,
    QueryFilters,
    QueryMetadata,
    ChatMessage,
)


def _looks_arabic(text: str) -> bool:
    """Return whether the text contains Arabic characters."""

    return any("\u0600" <= char <= "\u06ff" for char in text)


def _source_only_refusal(query: str, language: str) -> str:
    """Return a domain-aware refusal when evidence is not in the PDF."""

    is_arabic = language == "ar" or _looks_arabic(query)
    if is_arabic:
        return (
            "المصدر المرفوع لا يحتوي على معلومات كافية لدعم إجابة موثوقة. "
            "لو السؤال طبي فالأفضل استشارة طبيب، ولو في مجال آخر فاستشر متخصصًا "
            "مؤهلًا في نفس المجال أو ارفع مصدرًا أوضح."
        )
    return (
        "The uploaded PDF does not contain enough evidence for a reliable answer. "
        "If this is a medical question, please consult a doctor; otherwise consult "
        "a qualified specialist in the relevant field or upload a clearer source."
    )


@dataclass
class RagService:
    """Stateful RAG service used by the API layer."""

    knowledge_base: list[dict[str, Any]] = field(default_factory=list)
    documents_meta: dict[str, Any] = field(default_factory=dict)
    faiss_store: Any | None = None
    bm25_retriever: Any | None = None
    table_store: Any | None = None
    kb_by_id: dict[Any, dict[str, Any]] = field(default_factory=dict)
    visual_store: Any | None = None
    _pipeline: Any | None = None

    @property
    def pipeline(self) -> Any:
        """Lazily import the heavy notebook-derived RAG pipeline."""

        if self._pipeline is None:
            from documind_rag.rag import pipeline

            self._pipeline = pipeline
        return self._pipeline

    @property
    def ready(self) -> bool:
        """Return whether the service has built searchable indexes."""

        return bool(self.knowledge_base and self.faiss_store and self.bm25_retriever)

    def build(self, pdf_paths: list[str]) -> BuildResponse:
        """Build the knowledge base and indexes for the provided PDF files."""

        pipeline = self.pipeline
        self.knowledge_base, self.documents_meta = pipeline.build_knowledge_base(
            pdf_paths
        )
        (
            self.faiss_store,
            self.bm25_retriever,
            self.table_store,
            self.kb_by_id,
        ) = pipeline.build_indexes(self.knowledge_base)
        self.visual_store = pipeline.build_visual_index(self.knowledge_base)

        return BuildResponse(
            documents=self.documents_meta,
            chunk_count=len(self.knowledge_base),
            ready=self.ready,
        )

    def ask(
        self,
        query: str,
        *,
        document_ids: list[str] | None = None,
        verbose: bool = False,
    ) -> AskResponse:
        """Answer a question using the built RAG indexes."""

        if not self.ready:
            raise RuntimeError(
                "Source index is not available on this server instance. "
                "Please re-upload the PDF after the latest deployment."
            )

        pipeline = self.pipeline
        raw = pipeline.ask(
            query,
            self.knowledge_base,
            self.faiss_store,
            self.bm25_retriever,
            self.visual_store,
            self.table_store,
            self.kb_by_id,
            document_ids=document_ids,
            verbose=verbose,
        )

        query_info = raw.get("query") or {}
        filters = query_info.get("filters") or {}
        metadata = QueryMetadata(
            original=query_info.get("original", query),
            rewritten=query_info.get("rewritten", query),
            language=query_info.get("language", "en"),
            query_type=raw.get("query_type", query_info.get("query_type", "factual_text")),
            filters=QueryFilters(**filters),
            search_queries=query_info.get("search_queries", []),
        )
        answer = raw.get("answer", "")
        evidence_rows = raw.get("evidence", [])
        raw_confidence = float(raw.get("confidence", 0.0))
        sources = raw.get("sources", [])
        insufficient = not evidence_rows or not sources
        if insufficient:
            answer = _source_only_refusal(query, metadata.language)
            raw["answer"] = answer
            raw["confidence"] = min(raw_confidence, 0.1)
            raw["sources"] = []
            raw["evidence"] = []
            raw["claims"] = [
                {
                    "claim": answer,
                    "page": 0,
                    "supported": False,
                    "score": 0.0,
                    "note": "Answer refused because the uploaded source did not provide sufficient evidence.",
                }
            ]

        claims = raw.get("claims", [])
        checked_claims = [
            claim
            for claim in claims
            if isinstance(claim, dict) and claim.get("supported") is not None
        ]
        unsupported_claims = sum(
            1 for claim in checked_claims if not claim.get("supported")
        )
        hallucination_risk = (
            unsupported_claims / len(checked_claims)
            if checked_claims
            else (1.0 if raw.get("answer") and not raw.get("evidence") else 0.0)
        )
        groundedness_score = max(0.0, 1.0 - hallucination_risk)
        if checked_claims and hallucination_risk >= 0.5:
            answer = _source_only_refusal(query, metadata.language)
            raw["answer"] = answer
            raw["confidence"] = min(raw_confidence, 0.1)
            raw["sources"] = []
            raw["evidence"] = []
            claims = [
                {
                    "claim": answer,
                    "page": 0,
                    "supported": False,
                    "score": 0.0,
                    "note": "Answer refused because generated claims were not sufficiently supported by the uploaded source.",
                }
            ]
            raw["claims"] = claims
            unsupported_claims = 1
            hallucination_risk = 1.0
            groundedness_score = 0.0

        return AskResponse(
            answer=answer,
            query=metadata,
            confidence=float(raw.get("confidence", 0.0)),
            hallucination_risk=float(hallucination_risk),
            groundedness_score=float(groundedness_score),
            unsupported_claims=unsupported_claims,
            sources=raw.get("sources", []),
            evidence=[EvidenceItem(**item) for item in raw.get("evidence", [])],
            claims=[ClaimItem(**claim) for claim in claims if isinstance(claim, dict)],
            sub_questions=raw.get("sub_questions", []),
            raw=raw,
        )

    def health(self) -> HealthResponse:
        """Return current service status."""

        return HealthResponse(
            ready=self.ready,
            document_count=len(self.documents_meta),
            chunk_count=len(self.knowledge_base),
        )


@dataclass
class ChatRagManager:
    """Manage isolated RAG services and short memory per chat."""

    default_chat_id: str = "default"
    services: dict[str, RagService] = field(default_factory=dict)
    memory: dict[str, list[ChatMessage]] = field(default_factory=dict)
    max_memory_messages: int = 12

    def get_service(self, chat_id: str | None = None) -> RagService:
        """Return the RAG service for a chat."""

        key = chat_id or self.default_chat_id
        if key not in self.services:
            self.services[key] = RagService()
        return self.services[key]

    def build(self, pdf_paths: list[str], chat_id: str | None = None) -> BuildResponse:
        """Build indexes for a specific chat source."""

        return self.get_service(chat_id).build(pdf_paths)

    def ask(
        self,
        query: str,
        *,
        chat_id: str | None = None,
        document_ids: list[str] | None = None,
        verbose: bool = False,
        use_memory: bool = True,
    ) -> AskResponse:
        """Ask within a chat-scoped source and optional memory context."""

        key = chat_id or self.default_chat_id
        effective_query = query
        if use_memory:
            history = self.memory.get(key, [])[-4:]
            if history:
                memory_text = "\n".join(
                    f"{message.role}: {message.content}" for message in history
                )
                effective_query = (
                    "Conversation memory for resolving references only. "
                    "Do not use it as factual source evidence:\n"
                    f"{memory_text}\n\nCurrent question:\n{query}"
                )

        response = self.get_service(key).ask(
            effective_query,
            document_ids=document_ids,
            verbose=verbose,
        )
        response.query.original = query
        self._append_message(key, "user", query)
        self._append_message(key, "assistant", response.answer)
        return response

    def generate_exam(
        self,
        *,
        chat_id: str | None,
        topic: str | None,
        difficulty: str,
        question_count: int,
        total_marks: int,
        question_types: list[str],
        language: str,
    ) -> AskResponse:
        """Generate an exam grounded in the chat source."""

        lang_instruction = (
            "اكتب الامتحان باللغة العربية."
            if language == "ar"
            else "Write the exam in English."
        )
        topic_text = topic or "the uploaded source"
        query = f"""
Create an exam from the uploaded source only.

Topic/scope: {topic_text}
Difficulty: {difficulty}
Number of questions: {question_count}
Total marks: {total_marks}
Question types: {", ".join(question_types)}

Output format:
Return ONLY valid JSON with this exact shape:
{{
  "title": "string",
  "questions": [
    {{
      "type": "mcq | true_false | short_answer",
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer": "string",
      "explanation": "string",
      "page": 1,
      "section": "string"
    }}
  ]
}}

Rules:
- Use only the uploaded source.
- Do not add facts from outside the source.
- Cite source pages where relevant.
- Generate real assessment questions, not exam instructions.
- Do not include preamble, markdown fences, or commentary outside JSON.
- {lang_instruction}
"""
        response = self.ask(query, chat_id=chat_id, use_memory=False, verbose=False)
        self._adjust_exam_grounding(response)
        return response

    def _adjust_exam_grounding(self, response: AskResponse) -> None:
        """Score structured exam JSON against the retrieved evidence pages."""

        try:
            payload = json.loads(response.answer)
        except json.JSONDecodeError:
            return
        questions = payload.get("questions", [])
        if not isinstance(questions, list) or not questions:
            return
        evidence_pages = {item.page for item in response.evidence}
        question_pages = {
            int(question["page"])
            for question in questions
            if isinstance(question, dict)
            and isinstance(question.get("page"), int)
        }
        if question_pages and question_pages.issubset(evidence_pages | set(response.sources)):
            response.groundedness_score = 1.0
            response.hallucination_risk = 0.0
            response.unsupported_claims = 0

    def health(self, chat_id: str | None = None) -> HealthResponse:
        """Return health for one chat service."""

        return self.get_service(chat_id).health()

    def get_history(self, chat_id: str | None = None) -> list[ChatMessage]:
        """Return stored memory for a chat."""

        return self.memory.get(chat_id or self.default_chat_id, [])

    def _append_message(self, chat_id: str, role: str, content: str) -> None:
        """Append a message and keep memory bounded."""

        messages = self.memory.setdefault(chat_id, [])
        messages.append(ChatMessage(role=role, content=content))
        del messages[:-self.max_memory_messages]
