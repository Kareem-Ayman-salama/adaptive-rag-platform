"""Authentication endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from documind_rag.app.core.database import get_db
from documind_rag.app.core.security import decode_access_token
from documind_rag.app.models.user import User
from documind_rag.app.repositories.user_repository import UserRepository
from documind_rag.app.schemas import (
    AuthLoginRequest,
    AuthResponse,
    AuthSignupRequest,
    UserResponse,
)
from documind_rag.app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_response(user: User) -> UserResponse:
    """Convert a user model into an API response."""

    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        created_at=user.created_at.isoformat(),
    )


def _auth_response(user: User, access_token: str) -> AuthResponse:
    """Build an authentication response."""

    return AuthResponse(access_token=access_token, user=_to_user_response(user))


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the current user from a bearer token."""

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )
    token = authorization.split(" ", 1)[1].strip()
    try:
        user_id = decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        ) from exc

    user = UserRepository(db).get_by_id(str(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )
    return user


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(
    request: AuthSignupRequest,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """Create a new account."""

    try:
        user, access_token = AuthService(UserRepository(db)).register(
            name=request.name,
            email=request.email,
            password=request.password,
        )
        return _auth_response(user, access_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/login", response_model=AuthResponse)
def login(
    request: AuthLoginRequest,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """Authenticate an existing account."""

    try:
        user, access_token = AuthService(UserRepository(db)).login(
            email=request.email,
            password=request.password,
        )
        return _auth_response(user, access_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return the current authenticated user."""

    return _to_user_response(current_user)
