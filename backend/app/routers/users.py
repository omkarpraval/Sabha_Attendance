from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserStatus, UserRole, MemberCategory, Attendance, AttendanceAudit, Event, PushSubscription
from app.schemas import UserResponse, UserCreateByAdmin, UserUpdateByAdmin, BulkUserImportRequest, BulkUserImportResponse
from app.auth import get_current_user, require_admin, require_karyakar_or_admin, hash_password

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def search_users(
    query: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    member_category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: Optional[int] = Query(None),
    offset: Optional[int] = Query(0),
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """Search and filter users by name, phone, email, category, or role (Accessible by Karyakars & Admins)."""
    db_query = db.query(User)
    if status:
        db_query = db_query.filter(User.status == status)
    if role:
        db_query = db_query.filter(User.role == role)
    if member_category:
        db_query = db_query.filter(User.member_category == member_category)
    if query:
        search_pattern = f"%{query}%"
        db_query = db_query.filter(
            (User.name.ilike(search_pattern)) | 
            (User.phone.ilike(search_pattern)) |
            (User.email.ilike(search_pattern))
        )
    db_query = db_query.order_by(User.name.asc())
    if limit is not None and limit > 0:
        db_query = db_query.offset(offset or 0).limit(limit)
    return db_query.all()

@router.get("/leadership", response_model=List[UserResponse])
def get_leadership_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return all Admins and Karyakars contact directory (Accessible by all logged-in members)."""
    return db.query(User).filter(
        User.role.in_([UserRole.ADMIN, UserRole.KARYAKAR]),
        User.status == UserStatus.APPROVED
    ).order_by(User.role.asc(), User.name.asc()).all()

@router.post("", response_model=UserResponse)
def create_user_by_admin(
    req: UserCreateByAdmin,
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """Create a new member account directly by Admin or Karyakar."""
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

    pwd = req.password.strip() if (req.password and req.password.strip()) else req.phone
    new_user = User(
        phone=req.phone,
        email=req.email,
        name=req.name,
        dob=req.dob,
        hashed_password=hash_password(pwd),
        role=req.role if req.role in [UserRole.YUVAK, UserRole.KARYAKAR, UserRole.ADMIN, "user", "yuvak"] else UserRole.YUVAK,
        status=UserStatus.APPROVED,
        member_category="gunbhavi" if req.member_category in [MemberCategory.GUNBHAVI, "goon_bhavi", "gunbhavi"] else MemberCategory.SATSANGI,
        area=req.area,
        is_working=req.is_working,
        is_studying=req.is_studying,
        occupation=req.occupation,
        company_name=req.company_name,
        education_stream=req.education_stream,
        study_details=req.study_details,
        current_streak=0,
        lifetime_count=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/bulk-import", response_model=BulkUserImportResponse)
def bulk_import_users(
    req: BulkUserImportRequest,
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """
    Bulk import members from CSV/Excel batch.
    If password is blank/omitted, automatically hashes the member's PHONE NUMBER as their initial password!
    """
    created_count = 0
    skipped_count = 0
    skipped_phones = []

    existing_phones = set(u[0] for u in db.query(User.phone).all() if u[0])

    for u_item in req.users:
        clean_phone = u_item.phone.strip() if u_item.phone else ""
        if not clean_phone or clean_phone in existing_phones:
            skipped_count += 1
            if clean_phone:
                skipped_phones.append(clean_phone)
            continue

        raw_pwd = u_item.password.strip() if (u_item.password and u_item.password.strip()) else clean_phone
        raw_cat = (u_item.member_category or "").strip().lower()
        category = "gunbhavi" if raw_cat in ["gunbhavi", "goon_bhavi", "bhavi"] else MemberCategory.SATSANGI
        raw_role = (u_item.role or "").strip().lower()
        role = "yuvak" if raw_role in ["yuvak", "user"] else (raw_role if raw_role in ["karyakar", "admin"] else UserRole.YUVAK)

        new_user = User(
            phone=clean_phone,
            email=u_item.email.strip() if u_item.email else None,
            name=u_item.name.strip(),
            dob=u_item.dob.strip() if u_item.dob else None,
            hashed_password=hash_password(raw_pwd),
            role=role,
            status=UserStatus.APPROVED,
            member_category=category,
            area=u_item.area.strip() if u_item.area else None,
            is_working=u_item.is_working.strip() if u_item.is_working else None,
            is_studying=u_item.is_studying.strip() if u_item.is_studying else None,
            occupation=u_item.occupation.strip() if u_item.occupation else None,
            company_name=u_item.company_name.strip() if u_item.company_name else None,
            education_stream=u_item.education_stream.strip() if u_item.education_stream else None,
            study_details=u_item.study_details.strip() if u_item.study_details else None,
            current_streak=0,
            lifetime_count=0
        )
        db.add(new_user)
        existing_phones.add(clean_phone)
        created_count += 1

    db.commit()
    return BulkUserImportResponse(
        created_count=created_count,
        skipped_count=skipped_count,
        skipped_phones=skipped_phones
    )

@router.put("/{user_id}", response_model=UserResponse)
def update_user_by_admin(
    user_id: int,
    req: UserUpdateByAdmin,
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """Update member details, category, role, or password by Admin or Karyakar."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if req.phone and req.phone != target.phone:
        dup = db.query(User).filter(User.phone == req.phone).first()
        if dup:
            raise HTTPException(status_code=400, detail="Phone number is already used by another user.")
        target.phone = req.phone

    if req.email and req.email != target.email:
        dup = db.query(User).filter(User.email == req.email).first()
        if dup:
            raise HTTPException(status_code=400, detail="Email is already used by another user.")
        target.email = req.email

    if req.name is not None:
        target.name = req.name
    if req.dob is not None:
        target.dob = req.dob
    if req.password and req.password.strip():
        target.hashed_password = hash_password(req.password)
    if req.member_category:
        m_cat = req.member_category.strip().lower()
        target.member_category = "gunbhavi" if m_cat in ["gunbhavi", "goon_bhavi", "bhavi"] else MemberCategory.SATSANGI
    if req.role:
        r_role = req.role.strip().lower()
        target.role = "yuvak" if r_role in ["yuvak", "user"] else r_role
    if req.status and req.status in [UserStatus.APPROVED, UserStatus.PENDING, UserStatus.REJECTED]:
        target.status = req.status

    if req.area is not None:
        target.area = req.area
    if req.is_working is not None:
        target.is_working = req.is_working
    if req.is_studying is not None:
        target.is_studying = req.is_studying
    if req.occupation is not None:
        target.occupation = req.occupation
    if req.company_name is not None:
        target.company_name = req.company_name
    if req.education_stream is not None:
        target.education_stream = req.education_stream
    if req.study_details is not None:
        target.study_details = req.study_details

    db.commit()
    db.refresh(target)
    return target

@router.get("/pending", response_model=List[UserResponse])
def get_pending_users(
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """View pending user signups (kept for backwards compatibility)."""
    return db.query(User).filter(User.status == UserStatus.PENDING).order_by(User.created_at.desc()).all()

@router.post("/{user_id}/approve", response_model=UserResponse)
def approve_user(
    user_id: int,
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """Approve user account."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.status = UserStatus.APPROVED
    db.commit()
    db.refresh(target)
    return target

@router.post("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    new_role: str,
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """Promote/demote user role."""
    if new_role not in [UserRole.USER, UserRole.KARYAKAR, UserRole.ADMIN]:
        raise HTTPException(status_code=400, detail="Invalid role specified")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.role = new_role
    db.commit()
    db.refresh(target)
    return target

@router.delete("/{user_id}")
def delete_user_by_admin(
    user_id: int,
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """Delete a user account cleanly (Accessible by Karyakars & Admins)."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own active session account.")

    # 1. Nullify marked_by_id references in attendances marked by this user
    db.query(Attendance).filter(Attendance.marked_by_id == target.id).update({"marked_by_id": None}, synchronize_session=False)

    # 2. Nullify created_by_id in events
    db.query(Event).filter(Event.created_by_id == target.id).update({"created_by_id": None}, synchronize_session=False)

    # 3. Clean up PushSubscriptions
    db.query(PushSubscription).filter(PushSubscription.user_id == target.id).delete(synchronize_session=False)

    # 4. Clean up AttendanceAudit records for this user's attendances
    user_attendance_ids = [a[0] for a in db.query(Attendance.id).filter(Attendance.user_id == target.id).all()]
    if user_attendance_ids:
        db.query(AttendanceAudit).filter(AttendanceAudit.attendance_id.in_(user_attendance_ids)).delete(synchronize_session=False)

    db.query(AttendanceAudit).filter(AttendanceAudit.modified_by_id == target.id).delete(synchronize_session=False)

    # 5. Delete all attendances for this user
    db.query(Attendance).filter(Attendance.user_id == target.id).delete(synchronize_session=False)

    # 6. Delete target user
    db.delete(target)
    db.commit()
    return {"status": "success", "message": f"User '{target.name}' deleted successfully."}
