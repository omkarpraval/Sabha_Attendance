import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Venue, Event, Attendance, AttendanceAudit
from app.auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin Operations"])

@router.get("/backup")
def export_database_backup(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Super-Admin one-click database snapshot backup.
    Exports full JSON structure of all database tables for disaster recovery.
    """
    users = db.query(User).all()
    venues = db.query(Venue).all()
    events = db.query(Event).all()
    attendances = db.query(Attendance).all()
    audits = db.query(AttendanceAudit).all()

    backup_data = {
        "metadata": {
            "exported_by": current_user.name,
            "exported_at": datetime.datetime.utcnow().isoformat() + "Z",
            "version": "1.0.0"
        },
        "users": [
            {
                "id": u.id,
                "phone": u.phone,
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "status": u.status,
                "member_category": u.member_category,
                "current_streak": u.current_streak,
                "lifetime_count": u.lifetime_count,
                "created_at": u.created_at.isoformat() if u.created_at else None
            } for u in users
        ],
        "venues": [
            {
                "id": v.id,
                "name": v.name,
                "address": v.address,
                "latitude": v.latitude,
                "longitude": v.longitude,
                "radius_meters": v.radius_meters,
                "qr_code_reference": v.qr_code_reference
            } for v in venues
        ],
        "events": [
            {
                "id": e.id,
                "title": e.title,
                "event_type": e.event_type,
                "event_date": e.event_date,
                "day_of_week": e.day_of_week,
                "start_time": e.start_time,
                "end_time": e.end_time,
                "venue_id": e.venue_id,
                "qr_mode": e.qr_mode,
                "qr_code_reference": e.qr_code_reference,
                "status": e.status
            } for e in events
        ],
        "attendances": [
            {
                "id": a.id,
                "event_id": a.event_id,
                "user_id": a.user_id,
                "status": a.status,
                "marked_by_id": a.marked_by_id,
                "marking_method": a.marking_method,
                "excuse_reason": a.excuse_reason,
                "distance_meters": a.distance_meters,
                "timestamp_utc": a.timestamp_utc.isoformat() if a.timestamp_utc else None
            } for a in attendances
        ],
        "audits": [
            {
                "id": au.id,
                "attendance_id": au.attendance_id,
                "modified_by_id": au.modified_by_id,
                "old_status": au.old_status,
                "new_status": au.new_status,
                "reason": au.reason,
                "timestamp_utc": au.timestamp_utc.isoformat() if au.timestamp_utc else None
            } for au in audits
        ]
    }

    filename = f"sabha_attendance_backup_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    headers = {
        "Content-Disposition": f"attachment; filename={filename}"
    }
    return JSONResponse(content=backup_data, headers=headers)
