"""Exam generation endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from documind_rag.app.controllers.auth_controller import get_current_user
from documind_rag.app.core.dependencies import get_rag_manager
from documind_rag.app.models.user import User
from documind_rag.app.schemas import AskResponse, ExamRequest
from documind_rag.rag.service import ChatRagManager

router = APIRouter(tags=["exams"])


@router.post("/exam", response_model=AskResponse)
def generate_exam(
    request: ExamRequest,
    current_user: User = Depends(get_current_user),
    rag_manager: ChatRagManager = Depends(get_rag_manager),
) -> AskResponse:
    """Generate a source-grounded exam for teachers or doctors."""

    try:
        return rag_manager.generate_exam(
            chat_id=request.chat_id,
            topic=request.topic,
            difficulty=request.difficulty,
            question_count=request.question_count,
            total_marks=request.total_marks,
            question_types=request.question_types,
            language=request.language,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
