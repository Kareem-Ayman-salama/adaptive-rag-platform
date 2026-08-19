"""Document upload and indexing endpoints."""

from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from documind_rag.app.controllers.auth_controller import get_current_user
from documind_rag.app.core.database import get_db
from documind_rag.app.core.dependencies import get_rag_manager
from documind_rag.app.models.user import User
from documind_rag.app.repositories.document_repository import DocumentSourceRepository
from documind_rag.app.schemas import BuildRequest, BuildResponse
from documind_rag.rag.service import ChatRagManager

router = APIRouter(tags=["documents"])
upload_root = Path(__file__).resolve().parents[2] / "documind_rag_uploads"


@router.post("/build", response_model=BuildResponse)
def build_index(
    request: BuildRequest,
    current_user: User = Depends(get_current_user),
    rag_manager: ChatRagManager = Depends(get_rag_manager),
) -> BuildResponse:
    """Build document indexes from PDF paths visible to the backend."""

    try:
        return rag_manager.build(request.pdf_paths, chat_id=request.chat_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/chats/{chat_id}/sources", response_model=BuildResponse)
async def upload_chat_source(
    chat_id: str,
    files: list[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    rag_manager: ChatRagManager = Depends(get_rag_manager),
) -> BuildResponse:
    """Upload one or more PDFs and build indexes for a chat."""

    saved_paths: list[str] = []
    persisted_files: list[tuple[str, bytes]] = []
    chat_dir = upload_root / chat_id
    chat_dir.mkdir(parents=True, exist_ok=True)

    for file in files:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")

        safe_name = Path(file.filename).name
        content = await file.read()
        path = chat_dir / f"{uuid4().hex}_{safe_name}"
        path.write_bytes(content)
        saved_paths.append(str(path))
        persisted_files.append((safe_name, content))

    try:
        response = rag_manager.build(saved_paths, chat_id=chat_id)
        DocumentSourceRepository(db).replace_chat_sources(
            user_id=current_user.id,
            chat_id=chat_id,
            files=persisted_files,
        )
        return response
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
