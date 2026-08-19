"""Authentication service."""

from __future__ import annotations

from documind_rag.app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from documind_rag.app.models.user import User
from documind_rag.app.repositories.user_repository import UserRepository


class AuthService:
    """Business logic for account registration and login."""

    def __init__(self, users: UserRepository) -> None:
        """Initialize the service."""

        self.users = users

    def register(self, *, name: str, email: str, password: str) -> tuple[User, str]:
        """Register a new user and return an access token."""

        if self.users.get_by_email(email):
            raise ValueError("An account with this email already exists.")
        user = self.users.create(
            name=name,
            email=email,
            password_hash=hash_password(password),
        )
        return user, create_access_token(user.id)

    def login(self, *, email: str, password: str) -> tuple[User, str]:
        """Authenticate a user and return an access token."""

        user = self.users.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password.")
        return user, create_access_token(user.id)

