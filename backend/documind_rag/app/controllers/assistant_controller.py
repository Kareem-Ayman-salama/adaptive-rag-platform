"""Question-answering endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from documind_rag.app.controllers.auth_controller import get_current_user
from documind_rag.app.core.dependencies import get_rag_manager
from documind_rag.app.models.user import User
from documind_rag.app.schemas import AskRequest, AskResponse, ChatHistoryResponse
from documind_rag.rag.service import ChatRagManager

router = APIRouter(tags=["assistant"])


@router.post("/ask", response_model=AskResponse)
def ask(
    request: AskRequest,
    current_user: User = Depends(get_current_user),
    rag_manager: ChatRagManager = Depends(get_rag_manager),
) -> AskResponse:
    """Answer a user question against the loaded document indexes."""

    try:
        return rag_manager.ask(
            request.query,
            chat_id=request.chat_id,
            document_ids=request.document_ids,
            verbose=request.verbose,
            use_memory=request.use_memory,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/chats/{chat_id}/memory", response_model=ChatHistoryResponse)
def chat_memory(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    rag_manager: ChatRagManager = Depends(get_rag_manager),
) -> ChatHistoryResponse:
    """Return bounded conversation memory for a chat."""

    return ChatHistoryResponse(
        chat_id=chat_id,
        messages=rag_manager.get_history(chat_id),
    )
