import os
import re
import openpyxl
import datetime
from sqlalchemy import text
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User, Venue, Event, Attendance, UserRole, UserStatus, EventStatus, MarkingMethod, AttendanceStatus, QRMode
from app.auth import hash_password

def seed_database():
    if "sqlite" in settings.DATABASE_URL.lower():
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
    else:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS area VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_working VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_studying VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS education_stream VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS study_details VARCHAR;"))
            conn.commit()
        Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing tables if any
    db.query(Attendance).delete()
    db.query(Event).delete()
    db.query(Venue).delete()
    db.query(User).delete()
    db.commit()

    print("Seeding database...")

    # 1. Create Admin Users
    admin = User(
        phone="9999999999",
        email="admin@sabha.org",
        name="Pujya Admin Swami",
        dob="1985-05-15",
        hashed_password=hash_password("admin123"),
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        current_streak=5,
        lifetime_count=24
    )
    admin1 = User(
        phone="8369302198",
        email="omkarpraval958@gmail.com",
        name="Omkar Praval (Admin)",
        dob="1995-01-01",
        hashed_password=hash_password("8369302198"),
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        current_streak=8,
        lifetime_count=32
    )
    admin2 = User(
        phone="8779690801",
        email="2662.shishir@gmail.com",
        name="Shishir (Admin)",
        dob="1995-08-08",
        hashed_password=hash_password("8779690801"),
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
        current_streak=6,
        lifetime_count=28
    )
    db.add_all([admin, admin1, admin2])

    # 2. Create Karyakar User
    karyakar = User(
        phone="8888888888",
        email="karyakar@sabha.org",
        name="Priya Shah",
        dob="1995-08-20",
        hashed_password=hash_password("karyakar123"),
        role=UserRole.KARYAKAR,
        status=UserStatus.APPROVED,
        current_streak=4,
        lifetime_count=18
    )
    db.add(karyakar)

    # 3. Import Yuvaks from Untitled form (Responses).xlsx if available
    excel_path = os.path.join(os.path.dirname(__file__), "..", "Untitled form (Responses).xlsx")
    if not os.path.exists(excel_path):
        excel_path = r"C:\Users\premraval010\Desktop\Sabha_Attendance\Untitled form (Responses).xlsx"

    seen_phones = {"9999999999", "8369302198", "8779690801", "8888888888"}
    imported_yuvaks = []
    if os.path.exists(excel_path):
        try:
            wb = openpyxl.load_workbook(excel_path)
            sheet = wb.active
            for row in sheet.iter_rows(min_row=2, values_only=True):
                if not row or len(row) < 5 or not row[4]:
                    continue
                name_str = str(row[1] or "").strip()
                dob_val = row[2]
                if isinstance(dob_val, (datetime.datetime, datetime.date)):
                    dob_str = dob_val.strftime("%Y-%m-%d")
                else:
                    dob_str = str(dob_val or "").strip()

                area_str = str(row[3] or "").strip() if len(row) > 3 else ""
                raw_phone = str(row[4] or "")
                phone_str = re.sub(r"\D", "", raw_phone)
                if len(phone_str) > 10:
                    phone_str = phone_str[-10:]
                if len(phone_str) < 10:
                    continue

                if phone_str in seen_phones:
                    continue
                seen_phones.add(phone_str)

                working_str = str(row[5] or "").strip() if len(row) > 5 else ""
                studying_str = str(row[6] or "").strip() if len(row) > 6 else ""
                occupation_str = str(row[7] or "").strip() if len(row) > 7 else ""
                company_str = str(row[8] or "").strip() if len(row) > 8 else ""
                stream_str = str(row[9] or "").strip() if len(row) > 9 else ""
                details_str = str(row[10] or "").strip() if len(row) > 10 else ""

                if not db.query(User).filter(User.phone == phone_str).first():
                    yuvak_user = User(
                        phone=phone_str,
                        name=name_str or "Yuvak Member",
                        dob=dob_str,
                        hashed_password=hash_password(phone_str),
                        role=UserRole.YUVAK,
                        status=UserStatus.APPROVED,
                        member_category="satsangi",
                        area=area_str,
                        is_working=working_str,
                        is_studying=studying_str,
                        occupation=occupation_str,
                        company_name=company_str,
                        education_stream=stream_str,
                        study_details=details_str,
                        current_streak=0,
                        lifetime_count=0
                    )
                    db.add(yuvak_user)
                    imported_yuvaks.append(yuvak_user)
            db.commit()
            print(f"Successfully imported {len(imported_yuvaks)} Yuvak responses from Excel!")
        except Exception as e_excel:
            print(f"Excel import note: {e_excel}")

    # Fallback default test Yuvaks if no Excel
    if not imported_yuvaks:
        user1 = User(
            phone="7777777777",
            email="user1@sabha.org",
            name="Aarav Patel",
            dob="2000-01-10",
            hashed_password=hash_password("user123"),
            role=UserRole.YUVAK,
            status=UserStatus.APPROVED,
            member_category="satsangi",
            current_streak=3,
            lifetime_count=15
        )
        user2 = User(
            phone="7777777778",
            email="user2@sabha.org",
            name="Riya Sharma",
            dob="1998-11-04",
            hashed_password=hash_password("user123"),
            role=UserRole.YUVAK,
            status=UserStatus.APPROVED,
            member_category="gunbhavi",
            current_streak=1,
            lifetime_count=6
        )
        db.add_all([user1, user2])
        db.commit()
        imported_yuvaks = [user1, user2]
    
    # 4. Create Pending Approval Yuvak
    user_pending = User(
        phone="6666666666",
        email="devang@sabha.org",
        name="Devang Mehta",
        dob="2002-06-25",
        hashed_password=hash_password("user123"),
        role=UserRole.YUVAK,
        status=UserStatus.PENDING,
        member_category="satsangi",
        current_streak=0,
        lifetime_count=0
    )

    db.add(user_pending)
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
    target_u1 = imported_yuvaks[0]
    target_u2 = imported_yuvaks[1] if len(imported_yuvaks) > 1 else imported_yuvaks[0]

    att1 = Attendance(
        event_id=past_event.id,
        user_id=target_u1.id,
        status=AttendanceStatus.PRESENT,
        marked_by_id=target_u1.id,
        marking_method=MarkingMethod.SELF_QR,
        distance_meters=14.5,
        timestamp_utc=datetime.datetime.utcnow() - datetime.timedelta(days=7)
    )
    att2 = Attendance(
        event_id=past_event.id,
        user_id=target_u2.id,
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
