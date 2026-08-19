"""User repository."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from documind_rag.app.models.user import User


class UserRepository:
    """Persistence operations for user accounts."""

    def __init__(self, db: Session) -> None:
        """Initialize the repository."""

        self.db = db

    def get_by_email(self, email: str) -> User | None:
        """Return a user by normalized email."""

        statement = select(User).where(User.email == email.strip().lower())
        return self.db.execute(statement).scalar_one_or_none()

    def get_by_id(self, user_id: str) -> User | None:
        """Return a user by id."""

        return self.db.get(User, user_id)

    def create(self, *, name: str, email: str, password_hash: str) -> User:
        """Create and persist a user."""

        user = User(
            name=name.strip(),
            email=email.strip().lower(),
            password_hash=password_hash,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

