import datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Event, Venue, User, Attendance, AttendanceAudit, EventStatus, UserStatus, AttendanceStatus, MarkingMethod, QRMode
from app.schemas import EventCreate, EventResponse, EventUpdate
from app.auth import get_current_user, require_admin
from app.utils.qr import generate_qr_base64
from app.utils.reports import generate_qr_poster_pdf

router = APIRouter(prefix="/api/events", tags=["Events"])

DAY_NAME_TO_WEEKDAY = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6
}

def calculate_recurring_dates(start_date_str: str, day_of_week: Optional[str], count: int) -> List[str]:
    """Helper to compute dates for N upcoming recurring days of week."""
    dates = []
    try:
        start_dt = datetime.datetime.strptime(start_date_str, "%Y-%m-%d").date()
    except Exception:
        start_dt = datetime.date.today()

    target_weekday = DAY_NAME_TO_WEEKDAY.get((day_of_week or "").strip().lower())
    if target_weekday is None:
        target_weekday = start_dt.weekday()

    days_ahead = (target_weekday - start_dt.weekday()) % 7
    current_date = start_dt + datetime.timedelta(days=days_ahead)

    for _ in range(count):
        dates.append(current_date.strftime("%Y-%m-%d"))
        current_date += datetime.timedelta(days=7)
    return dates

def close_single_event_logic(ev: Event, db: Session):
    """Closes an event and marks all un-marked approved users as AUTO_ABSENT."""
    if ev.status == EventStatus.CLOSED:
        return
    ev.status = EventStatus.CLOSED

    approved_users = db.query(User).filter(User.status == UserStatus.APPROVED).all()
    existing_records = {att.user_id: att for att in ev.attendances}

    for user in approved_users:
        if user.id in existing_records:
            record = existing_records[user.id]
            if record.status in [AttendanceStatus.ABSENT, AttendanceStatus.EXCUSED]:
                user.current_streak = 0
        else:
            absent_record = Attendance(
                event_id=ev.id,
                user_id=user.id,
                status=AttendanceStatus.ABSENT,
                marked_by_id=None,
                marking_method=MarkingMethod.AUTO_ABSENT,
                timestamp_utc=datetime.datetime.utcnow()
            )
            db.add(absent_record)
            user.current_streak = 0

    db.commit()
    db.refresh(ev)

def auto_close_expired_events(db: Session):
    """Automatically closes open events whose end_time (IST) has passed."""
    utc_now = datetime.datetime.utcnow()
    ist_now = utc_now + datetime.timedelta(hours=5, minutes=30)
    today_str = ist_now.strftime("%Y-%m-%d")
    time_str = ist_now.strftime("%H:%M")

    open_events = db.query(Event).filter(Event.status == EventStatus.OPEN).all()
    for ev in open_events:
        # Close if event date is in the past OR if today and end_time has passed
        if ev.event_date < today_str or (ev.event_date == today_str and ev.end_time <= time_str):
            close_single_event_logic(ev, db)

@router.get("", response_model=List[EventResponse])
def list_events(
    status_filter: Optional[str] = Query(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Auto-close any expired open events first
    auto_close_expired_events(db)

    query = db.query(Event)
    if status_filter:
        query = query.filter(Event.status == status_filter)
    all_events = query.all()

    utc_now = datetime.datetime.utcnow()
    ist_now = utc_now + datetime.timedelta(hours=5, minutes=30)
    today_str = ist_now.strftime("%Y-%m-%d")
    time_str = ist_now.strftime("%H:%M")

    today_events = [e for e in all_events if e.event_date == today_str]
    upcoming_events = sorted([e for e in all_events if e.event_date > today_str], key=lambda x: (x.event_date, x.start_time))
    past_events = sorted([e for e in all_events if e.event_date < today_str], key=lambda x: (x.event_date, x.start_time), reverse=True)

    sorted_events = today_events + upcoming_events + past_events

    response = []
    for ev in sorted_events:
        resp = EventResponse.from_orm(ev)
        if ev.status == EventStatus.CLOSED:
            resp.status = "closed"
        elif ev.event_date > today_str or (ev.event_date == today_str and time_str < ev.start_time):
            resp.status = "upcoming"
        elif ev.event_date < today_str or (ev.event_date == today_str and time_str >= ev.end_time):
            resp.status = "closed"
        else:
            resp.status = "open"

        if ev.venue:
            resp.venue_name = ev.venue.name
            resp.venue_latitude = ev.venue.latitude
            resp.venue_longitude = ev.venue.longitude
            resp.venue_radius_meters = ev.venue.radius_meters
        response.append(resp)
    return response

@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auto_close_expired_events(db)
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    resp = EventResponse.from_orm(ev)

    utc_now = datetime.datetime.utcnow()
    ist_now = utc_now + datetime.timedelta(hours=5, minutes=30)
    today_str = ist_now.strftime("%Y-%m-%d")
    time_str = ist_now.strftime("%H:%M")

    if ev.status == EventStatus.CLOSED:
        resp.status = "closed"
    elif ev.event_date > today_str or (ev.event_date == today_str and time_str < ev.start_time):
        resp.status = "upcoming"
    elif ev.event_date < today_str or (ev.event_date == today_str and time_str >= ev.end_time):
        resp.status = "closed"
    else:
        resp.status = "open"

    if ev.venue:
        resp.venue_name = ev.venue.name
        resp.venue_latitude = ev.venue.latitude
        resp.venue_longitude = ev.venue.longitude
        resp.venue_radius_meters = ev.venue.radius_meters
    return resp

@router.post("", response_model=List[EventResponse])
def create_events(
    req: EventCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    venue = db.query(Venue).filter(Venue.id == req.venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    is_recurring = (req.event_type == "recurring" or req.is_recurring_saturday)

    if is_recurring:
        day_name = (req.day_of_week or "saturday").strip().lower()
        dates = calculate_recurring_dates(req.event_date, day_name, req.recurring_weeks)
        # Consistent permanent QR code reference for all recurring weekly sessions of this day & venue
        qr_ref = f"recurring_venue_{venue.id}_{day_name}"
    else:
        dates = [req.event_date]
        if req.qr_mode == QRMode.REUSABLE:
            qr_ref = venue.qr_code_reference
        else:
            qr_ref = f"event_{uuid.uuid4().hex[:12]}"

    created_events = []
    for d in dates:
        ev = Event(
            title=req.title,
            event_date=d,
            start_time=req.start_time,
            end_time=req.end_time,
            venue_id=req.venue_id,
            qr_mode=req.qr_mode,
            qr_code_reference=qr_ref,
            status=EventStatus.OPEN,
            created_by_id=current_user.id
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)
        
        resp = EventResponse.from_orm(ev)
        resp.venue_name = venue.name
        resp.venue_latitude = venue.latitude
        resp.venue_longitude = venue.longitude
        resp.venue_radius_meters = venue.radius_meters
        created_events.append(resp)

    return created_events

@router.get("/{event_id}/qr")
def get_event_qr(
    event_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    
    qr_data = ev.qr_code_reference
    qr_base64 = generate_qr_base64(qr_data)
    
    return {
        "event_id": ev.id,
        "event_title": ev.title,
        "event_date": ev.event_date,
        "start_time": ev.start_time,
        "end_time": ev.end_time,
        "qr_code_reference": qr_data,
        "qr_mode": ev.qr_mode,
        "qr_image_base64": qr_base64
    }

@router.get("/{event_id}/poster-pdf")
def get_event_poster_pdf(
    event_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    
    venue_name = ev.venue.name if ev.venue else "Central Sabha Mandir"
    qr_data = ev.qr_code_reference
    qr_base64 = generate_qr_base64(qr_data)

    pdf_bytes = generate_qr_poster_pdf(
        event_title=ev.title,
        event_date=ev.event_date,
        start_time=ev.start_time,
        end_time=ev.end_time,
        venue_name=venue_name,
        qr_ref=qr_data,
        qr_base64_str=qr_base64
    )

    clean_title = (ev.title or 'Sabha').replace(' ', '_')
    filename = f"Sabha_QR_Poster_{clean_title}_{ev.event_date}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/{event_id}/close", response_model=EventResponse)
def close_event(
    event_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    close_single_event_logic(ev, db)

    resp = EventResponse.from_orm(ev)
    if ev.venue:
        resp.venue_name = ev.venue.name
        resp.venue_latitude = ev.venue.latitude
        resp.venue_longitude = ev.venue.longitude
        resp.venue_radius_meters = ev.venue.radius_meters
    return resp

@router.put("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    req: EventUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    if req.title is not None: ev.title = req.title
    if req.event_date is not None: ev.event_date = req.event_date
    if req.start_time is not None: ev.start_time = req.start_time
    if req.end_time is not None: ev.end_time = req.end_time
    if req.venue_id is not None:
        venue = db.query(Venue).filter(Venue.id == req.venue_id).first()
        if not venue:
            raise HTTPException(status_code=404, detail="Venue not found")
        ev.venue_id = req.venue_id
    if req.qr_mode is not None: ev.qr_mode = req.qr_mode

    db.commit()
    db.refresh(ev)

    resp = EventResponse.from_orm(ev)
    if ev.venue:
        resp.venue_name = ev.venue.name
        resp.venue_latitude = ev.venue.latitude
        resp.venue_longitude = ev.venue.longitude
        resp.venue_radius_meters = ev.venue.radius_meters
    return resp

@router.delete("/recurring-series")
def delete_recurring_series(
    qr_ref: str = Query(...),
    delete_all: bool = Query(True),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Deletes all events associated with a recurring series (by qr_code_reference)."""
    query = db.query(Event).filter(Event.qr_code_reference == qr_ref)
    if not delete_all:
        query = query.filter(Event.status == EventStatus.OPEN)

    events_to_delete = query.all()
    if not events_to_delete:
        raise HTTPException(status_code=404, detail="No matching events found for this recurring series.")

    deleted_count = 0
    for ev in events_to_delete:
        att_ids = [a[0] for a in db.query(Attendance.id).filter(Attendance.event_id == ev.id).all()]
        if att_ids:
            db.query(AttendanceAudit).filter(AttendanceAudit.attendance_id.in_(att_ids)).delete(synchronize_session=False)
        db.query(Attendance).filter(Attendance.event_id == ev.id).delete(synchronize_session=False)
        db.delete(ev)
        deleted_count += 1

    db.commit()
    return {
        "status": "success",
        "message": f"Successfully deleted {deleted_count} recurring event occurrence(s) for series '{qr_ref}'."
    }

@router.delete("/{event_id}")
def delete_single_event(
    event_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Deletes a single event and its associated attendance records."""
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    att_ids = [a[0] for a in db.query(Attendance.id).filter(Attendance.event_id == ev.id).all()]
    if att_ids:
        db.query(AttendanceAudit).filter(AttendanceAudit.attendance_id.in_(att_ids)).delete(synchronize_session=False)
    db.query(Attendance).filter(Attendance.event_id == ev.id).delete(synchronize_session=False)

    db.delete(ev)
    db.commit()
    return {"status": "success", "message": f"Event '{ev.title}' deleted successfully."}
