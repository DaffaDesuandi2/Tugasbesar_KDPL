from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_session_id_from_request
from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import generate_session_id, hash_password, verify_password
from app.db.session import get_db
from app.models.session import SessionModel
from app.models.user import User, UserRole
from app.schemas.user import (
    AuthResponse,
    MessageResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email sudah terdaftar.",
        )

    user = User(
        name=payload.name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=UserRole.MAHASISWA,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=AuthResponse)
@limiter.limit(settings.LOGIN_RATE_LIMIT)
def login(
    request: Request,
    response: Response,
    payload: UserLoginRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        if user:
            user.failed_login_attempts += 1
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau kata sandi tidak valid.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun Anda telah dinonaktifkan.",
        )

    user.failed_login_attempts = 0

    # Invalidate previous session if present
    prev_session_id = get_session_id_from_request(request)
    if prev_session_id:
        db.query(SessionModel).filter(SessionModel.session_id == prev_session_id).delete()

    # Generate new session ID
    session_id = generate_session_id()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=settings.SESSION_EXPIRE_HOURS)

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:255]

    session_record = SessionModel(
        session_id=session_id,
        user_id=user.id,
        ip_address=client_ip,
        user_agent=user_agent,
        expires_at=expires_at,
    )
    db.add(session_record)
    db.commit()

    # Set session cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_id,
        max_age=settings.SESSION_EXPIRE_HOURS * 3600,
        httponly=True,
        samesite="lax",
        secure=False,
    )

    return AuthResponse(
        message="Login berhasil.",
        user=UserResponse.model_validate(user),
        session_id=session_id,
    )


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session_id = get_session_id_from_request(request)
    if session_id:
        db.query(SessionModel).filter(SessionModel.session_id == session_id).delete()
        db.commit()

    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        httponly=True,
        samesite="lax",
    )
    return MessageResponse(message="Logout berhasil.")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
