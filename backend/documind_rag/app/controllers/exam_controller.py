"""Exam generation endpoints."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from documind_rag.app.controllers.auth_controller import get_current_user
from documind_rag.app.core.dependencies import get_rag_manager
from documind_rag.app.models.user import User
from documind_rag.app.schemas import AskResponse, ExamRequest, ExamResponse
from documind_rag.rag.service import ChatRagManager

router = APIRouter(tags=["exams"])


def _parse_exam_payload(response: AskResponse) -> dict[str, Any]:
    """Parse the model's strict exam JSON into a stable API payload."""

    try:
        payload = json.loads(response.answer)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail="Exam generation returned invalid JSON. Please try again.",
        ) from exc

    questions = payload.get("questions", [])
    if not isinstance(questions, list) or not questions:
        raise HTTPException(
            status_code=502,
            detail="Exam generation did not return any valid questions.",
        )

    return {
        "title": str(payload.get("title") or "Source-grounded exam"),
        "questions": questions,
        "confidence": response.confidence,
        "hallucination_risk": response.hallucination_risk,
        "groundedness_score": response.groundedness_score,
        "sources": response.sources,
        "evidence": response.evidence,
        "raw": {
            "query": response.query.model_dump(),
            "claims": [claim.model_dump() for claim in response.claims],
            "unsupported_claims": response.unsupported_claims,
        },
    }


@router.post("/exam", response_model=ExamResponse)
def generate_exam(
    request: ExamRequest,
    current_user: User = Depends(get_current_user),
    rag_manager: ChatRagManager = Depends(get_rag_manager),
) -> ExamResponse:
    """Generate a source-grounded exam for teachers or doctors."""

    try:
        response = rag_manager.generate_exam(
            chat_id=request.chat_id,
            topic=request.topic,
            difficulty=request.difficulty,
            question_count=request.question_count,
            total_marks=request.total_marks,
            question_types=request.question_types,
            language=request.language,
        )
        return ExamResponse(**_parse_exam_payload(response))
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(exc)) from exc
