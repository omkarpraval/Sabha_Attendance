from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base
from app.routers import auth, users, venues, events, attendance, reports, notifications, analytics, health, admin, public

from app.config import settings

# Ensure new columns exist in pre-existing PostgreSQL database tables
try:
    with engine.connect() as conn:
        if "postgresql" in settings.DATABASE_URL.lower():
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS member_category VARCHAR DEFAULT 'satsangi';"))
        conn.execute(text("UPDATE users SET member_category = 'gunbhavi' WHERE member_category IN ('goon_bhavi', 'bhavi');"))
        conn.execute(text("UPDATE users SET role = 'yuvak' WHERE role = 'user';"))
        conn.commit()
except Exception:
    pass

# Create database tables
Base.metadata.create_all(bind=engine)

def ensure_initial_admins():
    from app.database import SessionLocal
    from app.models import User, UserRole, UserStatus
    from app.auth import hash_password
    
    db = SessionLocal()
    try:
        admins_to_check = [
            (
                settings.INITIAL_ADMIN_PHONE_1,
                settings.INITIAL_ADMIN_EMAIL_1,
                settings.INITIAL_ADMIN_PASSWORD_1,
                "Initial Admin 1"
            ),
            (
                settings.INITIAL_ADMIN_PHONE_2,
                settings.INITIAL_ADMIN_EMAIL_2,
                settings.INITIAL_ADMIN_PASSWORD_2,
                "Initial Admin 2"
            )
        ]

        for phone, email, password, default_name in admins_to_check:
            phone_str = str(phone).strip() if phone else ""
            email_str = str(email).strip() if email else ""
            pwd_str = str(password).strip() if password else ""

            if not (phone_str or email_str) or not pwd_str:
                continue

            existing = None
            if phone_str:
                existing = db.query(User).filter(User.phone == phone_str).first()
            if not existing and email_str:
                existing = db.query(User).filter(User.email == email_str).first()

            if not existing:
                new_admin = User(
                    phone=phone_str or "0000000000",
                    email=email_str or None,
                    name=default_name,
                    hashed_password=hash_password(pwd_str),
                    role=UserRole.ADMIN,
                    status=UserStatus.APPROVED,
                    member_category="satsangi"
                )
                db.add(new_admin)
                db.commit()
                print(f"[BOOTSTRAP] Initial Admin account created: {phone_str or email_str}")
            else:
                existing.role = UserRole.ADMIN
                existing.status = UserStatus.APPROVED
                existing.hashed_password = hash_password(pwd_str)
                if not existing.email and email_str:
                    existing.email = email_str
                db.commit()
                print(f"[BOOTSTRAP] Initial Admin account updated: {existing.phone}")
    except Exception as e:
        print(f"[BOOTSTRAP ERROR] Error ensuring initial admins: {e}")
    finally:
        db.close()

# Auto-bootstrap initial admin accounts on server startup
ensure_initial_admins()

app = FastAPI(
    title="Sabha Attendance Management System API",
    description="Full-stack attendance tracking API with QR + Geofencing for regular and irregular sabha events.",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(venues.router)
app.include_router(events.router)
app.include_router(attendance.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(analytics.router)
app.include_router(health.router)
app.include_router(admin.router)
app.include_router(public.router)

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "app": "Sabha Attendance Management System API",
        "version": "1.0.0"
    }
