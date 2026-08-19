"""Repository for persisted uploaded document sources."""

from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from documind_rag.app.models.document_source import DocumentSource


class DocumentSourceRepository:
    """Persistence operations for uploaded PDF sources."""

    def __init__(self, db: Session) -> None:
        """Initialize the repository."""

        self.db = db

    def list_for_chat(self, *, user_id: str, chat_id: str) -> list[DocumentSource]:
        """Return persisted sources for a user's chat."""

        statement = (
            select(DocumentSource)
            .where(DocumentSource.user_id == user_id)
            .where(DocumentSource.chat_id == chat_id)
            .order_by(DocumentSource.created_at.asc())
        )
        return list(self.db.execute(statement).scalars().all())

    def replace_chat_sources(
        self,
        *,
        user_id: str,
        chat_id: str,
        files: list[tuple[str, bytes]],
    ) -> None:
        """Replace all persisted PDF sources for a user's chat."""

        self.db.execute(
            delete(DocumentSource)
            .where(DocumentSource.user_id == user_id)
            .where(DocumentSource.chat_id == chat_id)
        )
        for filename, content in files:
            self.db.add(
                DocumentSource(
                    user_id=user_id,
                    chat_id=chat_id,
                    filename=filename,
                    content=content,
                )
            )
        self.db.commit()
