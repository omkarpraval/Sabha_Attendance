import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole, UserStatus
from app.schemas import SignupRequest, LoginRequest, OTPRequest, TokenResponse, UserResponse
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# In-memory OTP storage for dev simulation
otp_store = {}

@router.post("/signup", response_model=UserResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.phone == req.phone).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this phone number already exists."
        )

    # First user can auto-become approved Admin if db empty, otherwise regular user pending
    is_first_user = db.query(User).count() == 0
    role = UserRole.ADMIN if is_first_user else UserRole.USER
    account_status = UserStatus.APPROVED if is_first_user else UserStatus.PENDING

    new_user = User(
        phone=req.phone,
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

@router.post("/send-otp")
def send_otp(req: OTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == req.phone).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered user found with this phone number."
        )
    
    # Generate 6-digit OTP (MSG91 integration interface point)
    otp = str(random.randint(100000, 999999))
    otp_store[req.phone] = otp
    print(f"[MSG91 OTP SERVICE] OTP for {req.phone} is {otp}")

    return {
        "message": f"OTP sent to {req.phone} via MSG91 (Dev mode code: {otp})",
        "dev_otp": otp
    }

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == req.phone).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number or credentials"
        )

    # OTP login path
    if req.otp:
        saved_otp = otp_store.get(req.phone)
        if not saved_otp or saved_otp != req.otp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired OTP"
            )
        # Clear OTP after successful use
        otp_store.pop(req.phone, None)
    elif req.password:
        if not verify_password(req.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid password"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide either password or OTP to log in."
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
