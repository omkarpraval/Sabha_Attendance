import datetime
import jwt
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, UserRole, UserStatus
from app.schemas import SignupRequest, LoginRequest, TokenResponse, UserResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.utils.email import send_password_reset_email
from app.utils.rate_limiter import login_limiter

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/signup", response_model=UserResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing_phone = db.query(User).filter(User.phone == req.phone).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this phone number already exists."
        )

    if req.email:
        existing_email = db.query(User).filter(User.email == req.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )

    is_first_user = db.query(User).count() == 0
    role = UserRole.ADMIN if is_first_user else UserRole.YUVAK
    account_status = UserStatus.APPROVED if is_first_user else UserStatus.PENDING

    new_user = User(
        phone=req.phone,
        email=req.email,
        name=req.name,
        dob=req.dob,
        hashed_password=hash_password(req.password),
        role=role,
        status=account_status,
        current_streak=0,
        lifetime_count=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "127.0.0.1"
    login_limiter.check(client_ip)

    # Match user by either phone number OR email address
    user = db.query(User).filter(
        (User.phone == req.identifier) | (User.email == req.identifier)
    ).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number/email or password."
        )

    if user.status != UserStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is in '{user.status}' state. Please await Admin approval."
        )

    access_token = create_access_token(data={"sub": user.phone, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
