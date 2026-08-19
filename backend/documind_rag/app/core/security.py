"""Password hashing and JWT helpers."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from documind_rag.app.core.config import get_config

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain-text password."""

    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""

    return password_context.verify(password, password_hash)


def create_access_token(user_id: UUID | str) -> str:
    """Create a signed access token for a user."""

    config = get_config()
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=config.access_token_expire_minutes
    )
    payload = {"sub": str(user_id), "exp": expires_at}
    return jwt.encode(payload, config.jwt_secret_key, algorithm=config.jwt_algorithm)


def decode_access_token(token: str) -> UUID:
    """Decode a signed access token and return its user id."""

    config = get_config()
    try:
        payload = jwt.decode(
            token,
            config.jwt_secret_key,
            algorithms=[config.jwt_algorithm],
        )
        subject = payload.get("sub")
        if not subject:
            raise ValueError("Token subject is missing.")
        return UUID(subject)
    except (JWTError, ValueError) as exc:
        raise ValueError("Invalid authentication token.") from exc
