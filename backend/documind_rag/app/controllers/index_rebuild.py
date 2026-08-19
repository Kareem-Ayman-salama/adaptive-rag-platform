"""Helpers for rebuilding chat indexes from persisted sources."""

from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from documind_rag.app.models.user import User
from documind_rag.app.repositories.document_repository import DocumentSourceRepository
from documind_rag.rag.service import ChatRagManager

rebuild_root = Path(__file__).resolve().parents[2] / "documind_rag_uploads" / "_rebuilds"


def is_missing_index_error(error: RuntimeError) -> bool:
    """Return whether a runtime error can be repaired by rebuilding indexes."""

    message = str(error)
    return "Source index is not available" in message or "Build indexes first" in message


def rebuild_chat_index(
    *,
    chat_id: str | None,
    user: User,
    db: Session,
    rag_manager: ChatRagManager,
) -> bool:
    """Rebuild a chat-scoped RAG index from PDFs persisted in the database."""

    if not chat_id:
        return False

    sources = DocumentSourceRepository(db).list_for_chat(
        user_id=user.id,
        chat_id=chat_id,
    )
    if not sources:
        return False

    chat_dir = rebuild_root / chat_id
    chat_dir.mkdir(parents=True, exist_ok=True)
    paths: list[str] = []
    for source in sources:
        safe_name = Path(source.filename).name
        path = chat_dir / f"{source.id}_{safe_name}"
        path.write_bytes(source.content)
        paths.append(str(path))

    rag_manager.build(paths, chat_id=chat_id)
    return True
