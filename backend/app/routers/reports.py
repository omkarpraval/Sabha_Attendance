from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Event, Attendance, MarkingMethod, User, UserStatus
from app.auth import require_karyakar_or_admin
from app.utils.reports import generate_excel_report, generate_pdf_report

router = APIRouter(prefix="/api/reports", tags=["Reports"])

def fetch_grouped_event_reports(
    db: Session,
    event_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[dict]:
    """
    Fetches attendance records grouped event-by-event with top header details for each event.
    """
    query = db.query(Event).options(
        joinedload(Event.venue),
        joinedload(Event.attendances).joinedload(Attendance.user),
        joinedload(Event.attendances).joinedload(Attendance.marked_by_user)
    )

    if event_id:
        query = query.filter(Event.id == event_id)
    else:
        if start_date:
            query = query.filter(Event.event_date >= start_date)
        if end_date:
            query = query.filter(Event.event_date <= end_date)

    events = query.order_by(Event.event_date.desc(), Event.start_time.desc()).all()

    grouped = []
    for ev in events:
        records = []
        present_count = 0
        absent_count = 0

        for r in ev.attendances:
            marked_by = "Auto Absent" if r.marking_method == MarkingMethod.AUTO_ABSENT else (
                r.marked_by_user.name if r.marked_by_user else "Self (QR)"
            )
            st = str(r.status.value if hasattr(r.status, 'value') else r.status).upper()
            if st == "PRESENT":
                present_count += 1
            else:
                absent_count += 1

            records.append({
                "user_name": r.user.name if r.user else "Member",
                "user_phone": r.user.phone if r.user else "N/A",
                "status": st,
                "marked_by_name": marked_by,
                "marking_method": r.marking_method.value if hasattr(r.marking_method, 'value') else str(r.marking_method),
                "distance_meters": f"{r.distance_meters:.1f}" if r.distance_meters is not None else "N/A",
                "timestamp_utc": r.timestamp_utc.strftime("%Y-%m-%d %H:%M UTC") if r.timestamp_utc else "N/A"
            })

        venue_name = ev.venue.name if ev.venue else "Central Sabha Mandir"
        total = len(records)
        pct = round((present_count / total * 100)) if total > 0 else 0

        grouped.append({
            "event_id": ev.id,
            "event_title": ev.title,
            "event_date": ev.event_date,
            "start_time": ev.start_time,
            "end_time": ev.end_time,
            "venue_name": venue_name,
            "total_headcount": total,
            "present_count": present_count,
            "absent_count": absent_count,
            "turnout_pct": pct,
            "records": records
        })

    return grouped


@router.get("/export/excel")
def export_excel(
    event_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    grouped = fetch_grouped_event_reports(db, event_id, start_date, end_date)
    if not grouped:
        raise HTTPException(status_code=404, detail="No matching events or records found for export.")

    excel_bytes = generate_excel_report(grouped)

    if event_id and len(grouped) == 1:
        clean_title = grouped[0]['event_title'].replace(' ', '_')
        filename = f"Sabha_Report_{clean_title}_{grouped[0]['event_date']}.xlsx"
    else:
        filename = f"Sabha_Attendance_Report_{start_date or 'all'}_to_{end_date or 'all'}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/export/pdf")
def export_pdf(
    event_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    grouped = fetch_grouped_event_reports(db, event_id, start_date, end_date)
    if not grouped:
        raise HTTPException(status_code=404, detail="No matching events or records found for export.")

    title_suffix = f"for Event '{grouped[0]['event_title']}'" if (event_id and len(grouped) == 1) else f"Date Range: {start_date or 'all'} to {end_date or 'all'}"
    pdf_bytes = generate_pdf_report(grouped, title_suffix)

    if event_id and len(grouped) == 1:
        clean_title = grouped[0]['event_title'].replace(' ', '_')
        filename = f"Sabha_Report_{clean_title}_{grouped[0]['event_date']}.pdf"
    else:
        filename = f"Sabha_Attendance_Report_{start_date or 'all'}_to_{end_date or 'all'}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
