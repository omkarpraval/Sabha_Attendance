import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import User, Event, Venue, Attendance, AttendanceAudit, EventStatus, AttendanceStatus, MarkingMethod, UserRole
from app.schemas import (
    ScanAttendanceRequest, ManualAttendanceRequest, ExcuseAttendanceRequest,
    EditAttendanceRequest, AttendanceResponse, AttendanceAuditResponse
)
from app.auth import get_current_user, require_karyakar_or_admin, require_admin
from app.utils.haversine import calculate_haversine_distance

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

def get_current_ist_time():
    """Returns current server time in IST (UTC+5:30)."""
    utc_now = datetime.datetime.utcnow()
    ist_now = utc_now + datetime.timedelta(hours=5, minutes=30)
    return ist_now

def extract_clean_qr_ref(ref_input: str) -> str:
    """Extracts clean QR reference string if input is a full web URL or raw text."""
    if not ref_input:
        return ""
    ref_input = ref_input.strip()
    if "qr_ref=" in ref_input:
        try:
            from urllib.parse import parse_qs, urlparse
            parsed = urlparse(ref_input)
            params = parse_qs(parsed.query)
            if "qr_ref" in params and params["qr_ref"]:
                return params["qr_ref"][0]
        except Exception:
            pass
    return ref_input

@router.post("/scan", response_model=AttendanceResponse)
def scan_and_mark_attendance(
    req: ScanAttendanceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Core self-attendance marking via QR scan + Geofence radius check + Time window check.
    """
    clean_ref = extract_clean_qr_ref(req.qr_code_reference)

    # 1. Resolve QR code reference to an active event
    event = db.query(Event).filter(
        Event.qr_code_reference == clean_ref,
        Event.status == EventStatus.OPEN
    ).first()

    # If reusable QR, look up active event linked to venue
    if not event:
        venue = db.query(Venue).filter(Venue.qr_code_reference == clean_ref).first()
        if venue:
            event = db.query(Event).filter(
                Event.venue_id == venue.id,
                Event.status == EventStatus.OPEN
            ).order_by(Event.event_date.desc()).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired QR code. No active sabha event found for this code."
        )

    venue = event.venue
    if not venue:
        raise HTTPException(status_code=400, detail="Event venue parameters missing.")

    # 2. Server-side time window validation in IST
    ist_now = get_current_ist_time()
    today_str = ist_now.strftime("%Y-%m-%d")

    # Verify event date match (or open event window)
    if event.event_date != today_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attendance scanning for this sabha is scheduled for {event.event_date} (Today is {today_str})."
        )

    current_time_str = ist_now.strftime("%H:%M")
    if current_time_str < event.start_time or current_time_str > event.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sabha attendance window is active between {event.start_time} and {event.end_time} IST. Current server time: {current_time_str} IST."
        )

    # 3. Geofence radius & GPS Accuracy validation
    if req.accuracy is not None and req.accuracy > 100.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"GPS signal accuracy is too weak (±{int(req.accuracy)}m). Please stand in an open area for a better location fix."
        )

    distance = calculate_haversine_distance(
        req.latitude, req.longitude,
        venue.latitude, venue.longitude
    )

    # 15-meter indoor buffer tolerance for Mandir hall walls & GPS drift
    effective_radius = (venue.radius_meters or 100.0) + 15.0
    if distance > effective_radius:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You appear to be outside the venue geofence radius ({int(distance)}m away from {venue.name}, allowed radius: {int(venue.radius_meters)}m). Please move closer or ask a Karyakar for assistance."
        )

    # 4. Check duplicate scan
    existing = db.query(Attendance).filter(
        Attendance.event_id == event.id,
        Attendance.user_id == current_user.id
    ).first()

    if existing:
        if existing.status == AttendanceStatus.PRESENT:
            timestamp_ist = (existing.timestamp_utc + datetime.timedelta(hours=5, minutes=30)).strftime("%H:%M IST")
            return AttendanceResponse(
                id=existing.id,
                event_id=existing.event_id,
                event_title=event.title,
                event_date=event.event_date,
                user_id=existing.user_id,
                user_name=current_user.name,
                user_phone=current_user.phone,
                status=existing.status,
                marked_by_name=existing.marked_by_user.name if existing.marked_by_user else "Self (QR)",
                marking_method=existing.marking_method,
                excuse_reason=existing.excuse_reason,
                distance_meters=existing.distance_meters,
                timestamp_utc=existing.timestamp_utc
            )

    # 5. Create present attendance record
    attendance = Attendance(
        event_id=event.id,
        user_id=current_user.id,
        status=AttendanceStatus.PRESENT,
        marked_by_id=current_user.id,
        marking_method=MarkingMethod.SELF_QR,
        user_lat=req.latitude,
        user_long=req.longitude,
        distance_meters=round(distance, 1),
        timestamp_utc=datetime.datetime.utcnow()
    )
    db.add(attendance)

    # Update streak & lifetime count
    current_user.current_streak += 1
    current_user.lifetime_count += 1

    try:
        db.commit()
        db.refresh(attendance)
    except IntegrityError:
        db.rollback()
        existing_duplicate = db.query(Attendance).filter(
            Attendance.event_id == event.id,
            Attendance.user_id == current_user.id
        ).first()
        if existing_duplicate:
            return AttendanceResponse(
                id=existing_duplicate.id,
                event_id=existing_duplicate.event_id,
                event_title=event.title,
                event_date=event.event_date,
                user_id=existing_duplicate.user_id,
                user_name=current_user.name,
                user_phone=current_user.phone,
                status=existing_duplicate.status,
                marked_by_name=existing_duplicate.marked_by_user.name if existing_duplicate.marked_by_user else "Self (QR)",
                marking_method=existing_duplicate.marking_method,
                excuse_reason=existing_duplicate.excuse_reason,
                distance_meters=existing_duplicate.distance_meters,
                timestamp_utc=existing_duplicate.timestamp_utc
            )
        raise HTTPException(status_code=400, detail="Attendance already marked for this event.")

    return AttendanceResponse(
        id=attendance.id,
        event_id=event.id,
        event_title=event.title,
        event_date=event.event_date,
        user_id=current_user.id,
        user_name=current_user.name,
        user_phone=current_user.phone,
        status=attendance.status,
        marked_by_name=f"{current_user.name} (Self QR)",
        marking_method=attendance.marking_method,
        distance_meters=attendance.distance_meters,
        timestamp_utc=attendance.timestamp_utc
    )

@router.post("/manual", response_model=AttendanceResponse)
def manual_mark_attendance(
    req: ManualAttendanceRequest,
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """
    Manual attendance override by Karyakar or Admin for users with device/battery issues.
    Tags attendance with Karyakar/Admin name and ID.
    """
    event = db.query(Event).filter(Event.id == req.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    ist_now = get_current_ist_time()
    today_str = ist_now.strftime("%Y-%m-%d")
    current_time_str = ist_now.strftime("%H:%M")

    if event.status == EventStatus.CLOSED or event.event_date < today_str or (event.event_date == today_str and current_time_str >= event.end_time):
        raise HTTPException(status_code=400, detail="Attendance for this event is closed.")

    if event.event_date > today_str or (event.event_date == today_str and current_time_str < event.start_time):
        raise HTTPException(status_code=400, detail=f"Attendance for this sabha cannot be marked before the start time ({event.start_time} IST).")
    
    target_user = db.query(User).filter(User.id == req.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(Attendance).filter(
        Attendance.event_id == req.event_id,
        Attendance.user_id == req.user_id
    ).first()

    method = MarkingMethod.ADMIN_MANUAL if current_user.role == UserRole.ADMIN else MarkingMethod.KARYAKAR_MANUAL

    if existing:
        old_status = existing.status
        existing.status = req.status
        existing.marked_by_id = current_user.id
        existing.marking_method = method
        existing.timestamp_utc = datetime.datetime.utcnow()

        if req.status == AttendanceStatus.PRESENT and old_status != AttendanceStatus.PRESENT:
            target_user.current_streak += 1
            target_user.lifetime_count += 1
        elif req.status != AttendanceStatus.PRESENT and old_status == AttendanceStatus.PRESENT:
            target_user.current_streak = 0

        db.commit()
        db.refresh(existing)
        attendance = existing
    else:
        attendance = Attendance(
            event_id=req.event_id,
            user_id=req.user_id,
            status=req.status,
            marked_by_id=current_user.id,
            marking_method=method,
            timestamp_utc=datetime.datetime.utcnow()
        )
        db.add(attendance)

        if req.status == AttendanceStatus.PRESENT:
            target_user.current_streak += 1
            target_user.lifetime_count += 1
        else:
            target_user.current_streak = 0

        db.commit()
        db.refresh(attendance)

    return AttendanceResponse(
        id=attendance.id,
        event_id=event.id,
        event_title=event.title,
        event_date=event.event_date,
        user_id=target_user.id,
        user_name=target_user.name,
        user_phone=target_user.phone,
        status=attendance.status,
        marked_by_name=f"{current_user.name} ({current_user.role.title()})",
        marking_method=attendance.marking_method,
        timestamp_utc=attendance.timestamp_utc
    )

@router.post("/excuse", response_model=AttendanceResponse)
def excuse_upcoming_event(
    req: ExcuseAttendanceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Pre-marks an upcoming event as 'excused' with a valid reason.
    Breaks streak, but does not display as red 'absent' no-show.
    """
    event = db.query(Event).filter(Event.id == req.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    existing = db.query(Attendance).filter(
        Attendance.event_id == req.event_id,
        Attendance.user_id == current_user.id
    ).first()

    if existing:
        existing.status = AttendanceStatus.EXCUSED
        existing.excuse_reason = req.reason
        existing.timestamp_utc = datetime.datetime.utcnow()
        current_user.current_streak = 0  # Excused breaks streak per requirement
        db.commit()
        db.refresh(existing)
        attendance = existing
    else:
        attendance = Attendance(
            event_id=req.event_id,
            user_id=current_user.id,
            status=AttendanceStatus.EXCUSED,
            marked_by_id=current_user.id,
            marking_method=MarkingMethod.SELF_QR,
            excuse_reason=req.reason,
            timestamp_utc=datetime.datetime.utcnow()
        )
        current_user.current_streak = 0
        db.add(attendance)
        db.commit()
        db.refresh(attendance)

    return AttendanceResponse(
        id=attendance.id,
        event_id=event.id,
        event_title=event.title,
        event_date=event.event_date,
        user_id=current_user.id,
        user_name=current_user.name,
        user_phone=current_user.phone,
        status=attendance.status,
        marked_by_name=current_user.name,
        marking_method=attendance.marking_method,
        excuse_reason=attendance.excuse_reason,
        timestamp_utc=attendance.timestamp_utc
    )

@router.put("/{attendance_id}/edit", response_model=AttendanceResponse)
def edit_attendance_with_audit(
    attendance_id: int,
    req: EditAttendanceRequest,
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """
    Edits an existing attendance record and logs an audit record.
    """
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    old_status = attendance.status
    new_status = req.new_status

    if old_status == new_status:
        raise HTTPException(status_code=400, detail="New status must be different from current status.")

    # Audit trail log creation
    audit_entry = AttendanceAudit(
        attendance_id=attendance.id,
        modified_by_id=current_user.id,
        old_status=old_status,
        new_status=new_status,
        reason=req.reason,
        timestamp_utc=datetime.datetime.utcnow()
    )
    db.add(audit_entry)

    # Update record
    attendance.status = new_status

    # Recalculate target user streak / lifetime
    target_user = attendance.user
    if new_status == AttendanceStatus.PRESENT and old_status != AttendanceStatus.PRESENT:
        target_user.lifetime_count += 1
    elif old_status == AttendanceStatus.PRESENT and new_status != AttendanceStatus.PRESENT:
        target_user.current_streak = 0

    db.commit()
    db.refresh(attendance)

    return AttendanceResponse(
        id=attendance.id,
        event_id=attendance.event_id,
        event_title=attendance.event.title if attendance.event else "",
        event_date=attendance.event.event_date if attendance.event else "",
        user_id=target_user.id,
        user_name=target_user.name,
        user_phone=target_user.phone,
        status=attendance.status,
        marked_by_name=f"Edited by {current_user.name} ({current_user.role.title()})",
        marking_method=attendance.marking_method,
        timestamp_utc=attendance.timestamp_utc
    )

@router.get("/history", response_model=List[AttendanceResponse])
def get_attendance_history(
    user_id: Optional[int] = Query(None),
    event_id: Optional[int] = Query(None),
    limit: Optional[int] = Query(None),
    offset: Optional[int] = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Attendance).options(
        joinedload(Attendance.event),
        joinedload(Attendance.user),
        joinedload(Attendance.marked_by_user)
    )

    # Scoping: Yuvaks can only see their own history unless they specify their user_id
    if current_user.role in [UserRole.YUVAK, "user", "yuvak"]:
        query = query.filter(Attendance.user_id == current_user.id)
    elif user_id:
        query = query.filter(Attendance.user_id == user_id)

    if event_id:
        query = query.filter(Attendance.event_id == event_id)

    query = query.order_by(Attendance.timestamp_utc.desc())
    if limit is not None and limit > 0:
        query = query.offset(offset or 0).limit(limit)

    records = query.all()

    result = []
    for r in records:
        marked_by = "Auto Absent" if r.marking_method == MarkingMethod.AUTO_ABSENT else (
            r.marked_by_user.name if r.marked_by_user else "Self (QR)"
        )
        result.append(AttendanceResponse(
            id=r.id,
            event_id=r.event_id,
            event_title=r.event.title if r.event else "Sabha Event",
            event_date=r.event.event_date if r.event else "",
            user_id=r.user_id,
            user_name=r.user.name if r.user else "Member",
            user_phone=r.user.phone if r.user else "",
            status=r.status,
            marked_by_name=marked_by,
            marking_method=r.marking_method,
            excuse_reason=r.excuse_reason,
            distance_meters=r.distance_meters,
            timestamp_utc=r.timestamp_utc
        ))
    return result

@router.get("/audits/{attendance_id}", response_model=List[AttendanceAuditResponse])
def get_attendance_audits(
    attendance_id: int,
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    audits = db.query(AttendanceAudit).filter(
        AttendanceAudit.attendance_id == attendance_id
    ).order_by(AttendanceAudit.timestamp_utc.desc()).all()

    res = []
    for a in audits:
        res.append(AttendanceAuditResponse(
            id=a.id,
            modified_by_name=a.modified_by.name if a.modified_by else "Admin",
            old_status=a.old_status,
            new_status=a.new_status,
            reason=a.reason,
            timestamp_utc=a.timestamp_utc
        ))
    return res
