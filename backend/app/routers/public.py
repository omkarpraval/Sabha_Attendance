from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.database import get_db
from app.models import User, Event, Attendance, UserRole, UserStatus, EventStatus, Venue

router = APIRouter(prefix="/api/public", tags=["Public Data"])

@router.get("/leaderboard")
def get_public_leaderboard(db: Session = Depends(get_db)):
    """
    Returns approved members ranked by:
    1. current_streak (descending)
    2. tie-breaker: average punctuality in minutes relative to event start time (earliest first)
    """
    users = db.query(User).filter(
        User.role.in_([UserRole.YUVAK, "user", "yuvak"]),
        User.status == UserStatus.APPROVED
    ).all()

    total_events = db.query(Event).count()

    leaderboard_data = []

    for u in users:
        attendances = db.query(Attendance, Event).join(Event, Attendance.event_id == Event.id).filter(
            Attendance.user_id == u.id
        ).all()

        punctuality_minutes_list = []
        present_count = 0
        for att, ev in attendances:
            if getattr(att.status, 'value', str(att.status)).lower() == 'present':
                present_count += 1
            try:
                ev_start_dt = datetime.strptime(f"{ev.event_date} {ev.start_time}", "%Y-%m-%d %H:%M")
                diff_minutes = (att.timestamp - ev_start_dt).total_seconds() / 60.0
                punctuality_minutes_list.append(diff_minutes)
            except Exception:
                pass

        # Fallback to lifetime_count if present_count is 0 but lifetime_count > 0
        final_present = present_count if present_count > 0 else (u.lifetime_count or 0)
        turnout_pct = round((final_present / total_events * 100), 0) if total_events > 0 else 0

        avg_punctuality = sum(punctuality_minutes_list) / len(punctuality_minutes_list) if punctuality_minutes_list else 999.0

        leaderboard_data.append({
            "id": u.id,
            "name": u.name,
            "phone": u.phone,
            "member_category": u.member_category or "satsangi",
            "current_streak": u.current_streak or 0,
            "lifetime_count": u.lifetime_count or 0,
            "present_count": final_present,
            "total_events": total_events,
            "turnout_pct": int(turnout_pct),
            "avg_punctuality": round(avg_punctuality, 1)
        })

    leaderboard_data.sort(key=lambda x: (-x["current_streak"], x["avg_punctuality"], -x["lifetime_count"]))

    for index, item in enumerate(leaderboard_data):
        item["rank"] = index + 1
        if item["avg_punctuality"] == 999.0:
            item["punctuality_label"] = "Regular attendee"
        elif item["avg_punctuality"] <= 0:
            item["punctuality_label"] = f"Avg {abs(int(item['avg_punctuality']))}m early ⚡"
        else:
            item["punctuality_label"] = f"Avg {int(item['avg_punctuality'])}m past start"

    return leaderboard_data


@router.get("/birthdays")
def get_public_birthdays(db: Session = Depends(get_db)):
    """
    Returns approved members celebrating their birthday today (MM-DD match).
    Also includes upcoming birthdays if none today.
    """
    today = date.today()
    approved_users = db.query(User).filter(User.status == UserStatus.APPROVED).all()

    today_birthdays = []
    upcoming_birthdays = []

    for u in approved_users:
        if not u.dob:
            continue
        try:
            parts = str(u.dob).replace('/', '-').split('-')
            if len(parts) != 3:
                continue
            
            # If format YYYY-MM-DD
            if len(parts[0]) == 4:
                b_month = int(parts[1])
                b_day = int(parts[2])
            else: # If format DD-MM-YYYY
                b_month = int(parts[1])
                b_day = int(parts[0])

            clean_phone = u.phone.replace(" ", "").replace("-", "") if u.phone else ""
            wa_phone = f"91{clean_phone}" if len(clean_phone) == 10 else clean_phone

            user_obj = {
                "id": u.id,
                "name": u.name,
                "phone": u.phone,
                "whatsapp_phone": wa_phone,
                "role": u.role.value if hasattr(u.role, 'value') else str(u.role),
                "member_category": u.member_category or "satsangi",
                "dob_formatted": f"{b_day:02d}/{b_month:02d}"
            }

            if b_month == today.month and b_day == today.day:
                today_birthdays.append(user_obj)
            else:
                this_year_bday = date(today.year, b_month, b_day)
                if this_year_bday < today:
                    this_year_bday = date(today.year + 1, b_month, b_day)
                days_until = (this_year_bday - today).days
                user_obj["days_until"] = days_until
                upcoming_birthdays.append(user_obj)
        except Exception:
            pass

    upcoming_birthdays.sort(key=lambda x: x["days_until"])

    return {
        "today_has_birthdays": len(today_birthdays) > 0,
        "today_birthdays": today_birthdays,
        "upcoming_birthdays": upcoming_birthdays[:3]
    }


@router.get("/live-status")
def get_public_live_status(db: Session = Depends(get_db)):
    """
    Returns current active event, next upcoming event, or latest event status with full date, timing, and venue location.
    """
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")

    # 1. Check for Active / Open event today
    active_event = db.query(Event).filter(
        Event.status == EventStatus.OPEN,
        Event.event_date == today_str
    ).first()

    target_ev = active_event
    is_live = True if active_event else False

    # 2. If no active event today, check for upcoming events
    if not target_ev:
        upcoming_events = db.query(Event).filter(
            Event.event_date >= today_str,
            Event.status != EventStatus.CLOSED
        ).all()

        future_events = []
        for ev in upcoming_events:
            try:
                ev_start_dt = datetime.strptime(f"{ev.event_date} {ev.start_time}", "%Y-%m-%d %H:%M")
                if ev_start_dt > now:
                    future_events.append((ev_start_dt, ev))
            except Exception:
                pass

        future_events.sort(key=lambda x: x[0])
        if future_events:
            target_ev = future_events[0][1]

    # 3. If no upcoming event, fallback to latest event in DB
    if not target_ev:
        target_ev = db.query(Event).order_by(Event.id.desc()).first()

    if target_ev:
        venue = db.query(Venue).filter(Venue.id == target_ev.venue_id).first() if target_ev.venue_id else None
        venue_name = venue.name if venue else "BAPS Swaminarayan Mandir"
        venue_address = venue.address if (venue and venue.address) else "Mandir Sabha Hall"

        try:
            ev_dt = datetime.strptime(target_ev.event_date, "%Y-%m-%d")
            date_formatted = ev_dt.strftime("%A, %b %d, %Y")
        except Exception:
            date_formatted = target_ev.event_date

        start_t = target_ev.start_time or "17:00"
        end_t = target_ev.end_time or "19:00"

        return {
            "is_live": is_live,
            "event_title": target_ev.title,
            "event_date": target_ev.event_date,
            "date_formatted": date_formatted,
            "start_time": start_t,
            "end_time": end_t,
            "timing_str": f"{start_t} – {end_t}",
            "venue_name": venue_name,
            "venue_address": venue_address,
            "message": f"🔴 Sabha Live Now: {target_ev.title}" if is_live else f"🗓️ Next Sabha: {target_ev.title} — {date_formatted} at {start_t}"
        }

    return {
        "is_live": False,
        "event_title": "Weekly Satsang Sabha",
        "date_formatted": "Every Sunday",
        "timing_str": "5:00 PM – 7:00 PM",
        "venue_name": "BAPS Swaminarayan Mandir",
        "venue_address": "Main Sabha Hall",
        "message": "🗓️ Next Weekly Sabha coming soon"
    }


@router.get("/stats")
def get_public_stats(db: Session = Depends(get_db)):
    """
    Returns public aggregate counts for home page floating counters.
    """
    total_attendances = db.query(Attendance).count()
    total_events = db.query(Event).count()
    total_members = db.query(User).filter(User.status == UserStatus.APPROVED).count()

    return {
        "total_attendances": total_attendances or 148,
        "total_events": total_events or 24,
        "total_members": total_members or 42
    }
