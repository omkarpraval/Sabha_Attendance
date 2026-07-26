from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserStatus, UserRole
from app.schemas import UserResponse
from app.auth import get_current_user, require_admin, require_karyakar_or_admin

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/pending", response_model=List[UserResponse])
def get_pending_users(
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """View pending user signups (Accessible by Karyakars & Admins)."""
    return db.query(User).filter(User.status == UserStatus.PENDING).order_by(User.created_at.desc()).all()

@router.post("/{user_id}/approve", response_model=UserResponse)
def approve_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Approve user account (Admin only)."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    target.status = UserStatus.APPROVED
    db.commit()
    db.refresh(target)
    return target

@router.post("/{user_id}/reject", response_model=UserResponse)
def reject_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Reject user account - soft state (Admin only)."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    target.status = UserStatus.REJECTED
    db.commit()
    db.refresh(target)
    return target

@router.get("", response_model=List[UserResponse])
def search_users(
    query: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(UserStatus.APPROVED),
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """Search and filter users by name or phone."""
    db_query = db.query(User)
    if status:
        db_query = db_query.filter(User.status == status)
    if role:
        db_query = db_query.filter(User.role == role)
    if query:
        search_pattern = f"%{query}%"
        db_query = db_query.filter(
            (User.name.ilike(search_pattern)) | (User.phone.ilike(search_pattern))
        )
    return db_query.order_by(User.name.asc()).all()

@router.post("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    new_role: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Promote/demote user role (Admin only)."""
    if new_role not in [UserRole.USER, UserRole.KARYAKAR, UserRole.ADMIN]:
        raise HTTPException(status_code=400, detail="Invalid role specified")
    
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    target.role = new_role
    db.commit()
    db.refresh(target)
    return target
