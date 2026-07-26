import datetime
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Event, Venue, User, Attendance, EventStatus, UserStatus, AttendanceStatus, MarkingMethod, QRMode
from app.schemas import EventCreate, EventResponse
from app.auth import get_current_user, require_admin
from app.utils.qr import generate_qr_base64
from app.utils.reports import generate_qr_poster_pdf

router = APIRouter(prefix="/api/events", tags=["Events"])

def calculate_next_saturdays(count: int) -> List[str]:
    """Helper to compute dates for N upcoming Saturdays starting from today."""
    saturdays = []
    today = datetime.date.today()
    days_ahead = (5 - today.weekday()) % 7
    if days_ahead == 0 and datetime.datetime.now().hour > 22:
        days_ahead += 7
    
    current_sat = today + datetime.timedelta(days=days_ahead)
    for _ in range(count):
        saturdays.append(current_sat.strftime("%Y-%m-%d"))
        current_sat += datetime.timedelta(days=7)
    return saturdays

@router.get("", response_model=List[EventResponse])
def list_events(
    status_filter: Optional[str] = Query(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Event)
    if status_filter:
        query = query.filter(Event.status == status_filter)
    all_events = query.all()

    utc_now = datetime.datetime.utcnow()
    ist_now = utc_now + datetime.timedelta(hours=5, minutes=30)
    today_str = ist_now.strftime("%Y-%m-%d")

    today_events = [e for e in all_events if e.event_date == today_str]
    upcoming_events = sorted([e for e in all_events if e.event_date > today_str], key=lambda x: (x.event_date, x.start_time))
    past_events = sorted([e for e in all_events if e.event_date < today_str], key=lambda x: (x.event_date, x.start_time), reverse=True)

    sorted_events = today_events + upcoming_events + past_events

    response = []
    for ev in sorted_events:
        resp = EventResponse.from_orm(ev)
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
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    resp = EventResponse.from_orm(ev)
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

    dates = [req.event_date]
    if req.is_recurring_saturday:
        dates = calculate_next_saturdays(req.recurring_weeks)

    created_events = []
    for d in dates:
        if req.qr_mode == QRMode.REUSABLE:
            qr_ref = venue.qr_code_reference
        else:
            qr_ref = f"event_{uuid.uuid4().hex[:12]}"

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

    resp = EventResponse.from_orm(ev)
    if ev.venue:
        resp.venue_name = ev.venue.name
        resp.venue_latitude = ev.venue.latitude
        resp.venue_longitude = ev.venue.longitude
        resp.venue_radius_meters = ev.venue.radius_meters
    return resp
