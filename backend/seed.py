import datetime
from app.database import engine, Base, SessionLocal
from app.models import User, Venue, Event, Attendance, UserRole, UserStatus, EventStatus, MarkingMethod, AttendanceStatus, QRMode
from app.auth import hash_password

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing tables if any
    db.query(Attendance).delete()
    db.query(Event).delete()
    db.query(Venue).delete()
    db.query(User).delete()
    db.commit()

    print("Seeding database...")

    # 1. Create Admin User
    admin = User(
        phone="9999999999",
        name="Pujya Admin Swami",
        dob="1985-05-15",
        hashed_password=hash_password("admin123"),
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        current_streak=5,
        lifetime_count=24
    )
    db.add(admin)

    # 2. Create Karyakar User
    karyakar = User(
        phone="8888888888",
        name="Priya Shah",
        dob="1995-08-20",
        hashed_password=hash_password("karyakar123"),
        role=UserRole.KARYAKAR,
        status=UserStatus.APPROVED,
        current_streak=4,
        lifetime_count=18
    )
    db.add(karyakar)

    # 3. Create Regular Approved Users
    user1 = User(
        phone="7777777777",
        name="Aarav Patel",
        dob="2000-01-10",
        hashed_password=hash_password("user123"),
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        current_streak=3,
        lifetime_count=15
    )
    user2 = User(
        phone="7777777778",
        name="Riya Sharma",
        dob="1998-11-04",
        hashed_password=hash_password("user123"),
        role=UserRole.USER,
        status=UserStatus.APPROVED,
        current_streak=1,
        lifetime_count=6
    )
    
    # 4. Create Pending Approval User
    user_pending = User(
        phone="6666666666",
        name="Devang Mehta",
        dob="2002-06-25",
        hashed_password=hash_password("user123"),
        role=UserRole.USER,
        status=UserStatus.PENDING,
        current_streak=0,
        lifetime_count=0
    )

    db.add_all([user1, user2, user_pending])
    db.commit()

    # 5. Create Venue
    venue = Venue(
        name="Central Sabha Mandir",
        address="Main Auditorium, Ashram Road, Sector 12",
        latitude=23.0225,
        longitude=72.5714,
        radius_meters=200.0,
        qr_code_reference="venue_central_mandir"
    )
    db.add(venue)
    db.commit()
    db.refresh(venue)

    # 6. Create Events
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    past_date_str = (datetime.date.today() - datetime.timedelta(days=7)).strftime("%Y-%m-%d")
    upcoming_date_str = (datetime.date.today() + datetime.timedelta(days=7)).strftime("%Y-%m-%d")

    # Live Today Event
    live_event = Event(
        title="Weekly Saturday Sabha - Live",
        event_date=today_str,
        start_time="00:00",
        end_time="23:59",
        venue_id=venue.id,
        qr_mode=QRMode.REUSABLE,
        qr_code_reference=venue.qr_code_reference,
        status=EventStatus.OPEN,
        created_by_id=admin.id
    )

    # Past Closed Event
    past_event = Event(
        title="Weekly Saturday Sabha - Past",
        event_date=past_date_str,
        start_time="17:00",
        end_time="20:00",
        venue_id=venue.id,
        qr_mode=QRMode.PER_EVENT,
        qr_code_reference="event_past_sabha_001",
        status=EventStatus.CLOSED,
        created_by_id=admin.id
    )

    # Upcoming Event
    upcoming_event = Event(
        title="Special Janmashtami Maha Sabha",
        event_date=upcoming_date_str,
        start_time="18:00",
        end_time="21:30",
        venue_id=venue.id,
        qr_mode=QRMode.PER_EVENT,
        qr_code_reference="event_janmashtami_special",
        status=EventStatus.OPEN,
        created_by_id=admin.id
    )

    db.add_all([live_event, past_event, upcoming_event])
    db.commit()
    db.refresh(live_event)
    db.refresh(past_event)

    # 7. Create Past Attendance Records
    att1 = Attendance(
        event_id=past_event.id,
        user_id=user1.id,
        status=AttendanceStatus.PRESENT,
        marked_by_id=user1.id,
        marking_method=MarkingMethod.SELF_QR,
        distance_meters=14.5,
        timestamp_utc=datetime.datetime.utcnow() - datetime.timedelta(days=7)
    )
    att2 = Attendance(
        event_id=past_event.id,
        user_id=user2.id,
        status=AttendanceStatus.PRESENT,
        marked_by_id=karyakar.id,
        marking_method=MarkingMethod.KARYAKAR_MANUAL,
        timestamp_utc=datetime.datetime.utcnow() - datetime.timedelta(days=7)
    )
    att_admin = Attendance(
        event_id=past_event.id,
        user_id=admin.id,
        status=AttendanceStatus.PRESENT,
        marked_by_id=admin.id,
        marking_method=MarkingMethod.SELF_QR,
        distance_meters=22.1,
        timestamp_utc=datetime.datetime.utcnow() - datetime.timedelta(days=7)
    )

    db.add_all([att1, att2, att_admin])
    db.commit()
    db.close()

    print("Database successfully seeded!")

if __name__ == "__main__":
    seed_database()
