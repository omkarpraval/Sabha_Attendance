import datetime
import hashlib
from typing import Optional
from fastapi import Depends, HTTPException, status, Query, Request
from fastapi.security import OAuth2PasswordBearer
import jwt
import bcrypt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, UserRole, UserStatus

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def hash_password(password: str) -> str:
    """Hashes a password using bcrypt salted hashing."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against stored bcrypt hash with backwards compatibility for legacy sha256."""
    if not hashed_password:
        return False
    # Check for legacy sha256 hash (64 hex characters)
    if len(hashed_password) == 64 and not hashed_password.startswith("$2"):
        legacy_hash = hashlib.sha256(f"{settings.SECRET_KEY}:{plain_password}".encode('utf-8')).hexdigest()
        return legacy_hash == hashed_password
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(
    request: Request,
    header_token: Optional[str] = Depends(oauth2_scheme),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    raw_token = header_token or token
    if not raw_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            raw_token = auth_header.split(" ")[1]

    if not raw_token:
        raise credentials_exception

    try:
        payload = jwt.decode(raw_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        phone: str = payload.get("sub")
        if phone is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.phone == phone).first()
    if user is None:
        raise credentials_exception
    if user.status != UserStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your account status is currently '{user.status}'. Please wait for Admin approval."
        )
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

def require_karyakar_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in [UserRole.ADMIN, UserRole.KARYAKAR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Karyakar or Admin privileges required"
        )
    return current_user
