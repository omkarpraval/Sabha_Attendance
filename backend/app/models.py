import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class MemberCategory:
    SATSANGI = "satsangi"
    GUNBHAVI = "gunbhavi"
    GOON_BHAVI = "gunbhavi"  # Backward-compatible alias
    B2Y = "b2y"
    BTY = "b2y"  # Backward-compatible alias

class UserRole:
    ADMIN = "admin"
    KARYAKAR = "karyakar"
    YUVAK = "yuvak"
    USER = "yuvak"  # Backward-compatible alias

class UserStatus:
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class QRMode:
    REUSABLE = "reusable"
    PER_EVENT = "per_event"

class EventStatus:
    OPEN = "open"
    CLOSED = "closed"

class AttendanceStatus:
    PRESENT = "present"
    ABSENT = "absent"
    EXCUSED = "excused"

class MarkingMethod:
    SELF_QR = "self_qr"
    KARYAKAR_MANUAL = "karyakar_manual"
    ADMIN_MANUAL = "admin_manual"
    AUTO_ABSENT = "auto_absent"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=False)
    dob = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default=UserRole.YUVAK, index=True, nullable=False)
    status = Column(String, default=UserStatus.APPROVED, index=True, nullable=False)
    member_category = Column(String, default=MemberCategory.SATSANGI, index=True, nullable=False)

    # Extended Yuvak Profile Information
    area = Column(String, nullable=True)
    is_working = Column(String, nullable=True)
    is_studying = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    education_stream = Column(String, nullable=True)
    study_details = Column(String, nullable=True)

    current_streak = Column(Integer, default=0)
    lifetime_count = Column(Integer, default=0)
    reset_token_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    attendances = relationship("Attendance", foreign_keys="[Attendance.user_id]", back_populates="user")
    marked_attendances = relationship("Attendance", foreign_keys="[Attendance.marked_by_id]", back_populates="marked_by_user")

class Venue(Base):
    __tablename__ = "venues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_meters = Column(Float, default=100.0, nullable=False)
    qr_code_reference = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    events = relationship("Event", back_populates="venue")

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    event_date = Column(String, index=True, nullable=False)  # YYYY-MM-DD
    start_time = Column(String, nullable=False)  # HH:MM (24h)
    end_time = Column(String, nullable=False)    # HH:MM (24h)
    venue_id = Column(Integer, ForeignKey("venues.id"), index=True, nullable=False)
    qr_mode = Column(String, default=QRMode.REUSABLE, nullable=False)
    qr_code_reference = Column(String, index=True, nullable=False)  # Non-unique to allow reusable venue QR reference across events
    status = Column(String, default=EventStatus.OPEN, index=True, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="events")
    created_by = relationship("User")
    attendances = relationship("Attendance", back_populates="event")
    finances = relationship("EventFinance", back_populates="event", cascade="all, delete-orphan")
    tasks = relationship("EventTask", back_populates="event", cascade="all, delete-orphan")

class Attendance(Base):
    __tablename__ = "attendances"
    __table_args__ = (
        UniqueConstraint('event_id', 'user_id', name='uq_event_user_attendance'),
    )

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    status = Column(String, index=True, nullable=False)  # present, absent, excused
    marked_by_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    marking_method = Column(String, index=True, nullable=False)  # self_qr, karyakar_manual, admin_manual, auto_absent
    excuse_reason = Column(Text, nullable=True)
    user_lat = Column(Float, nullable=True)
    user_long = Column(Float, nullable=True)
    distance_meters = Column(Float, nullable=True)
    timestamp_utc = Column(DateTime, default=datetime.datetime.utcnow)

    event = relationship("Event", back_populates="attendances")
    user = relationship("User", foreign_keys=[user_id], back_populates="attendances")
    marked_by_user = relationship("User", foreign_keys=[marked_by_id], back_populates="marked_attendances")
    audits = relationship("AttendanceAudit", back_populates="attendance")

class AttendanceAudit(Base):
    __tablename__ = "attendance_audits"

    id = Column(Integer, primary_key=True, index=True)
    attendance_id = Column(Integer, ForeignKey("attendances.id"), index=True, nullable=False)
    modified_by_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    old_status = Column(String, nullable=False)
    new_status = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    timestamp_utc = Column(DateTime, default=datetime.datetime.utcnow)

    attendance = relationship("Attendance", back_populates="audits")
    modified_by = relationship("User")

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    endpoint = Column(Text, nullable=False)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")

class EventFinance(Base):
    __tablename__ = "event_finances"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    person_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    purpose = Column(String, nullable=False)
    transaction_type = Column(String, default="expense", nullable=False)  # 'expense' | 'sewa_contribution'
    payment_method = Column(String, default="cash", nullable=False)        # 'cash' | 'upi' | 'bank_transfer' | 'other'
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    event = relationship("Event", back_populates="finances")
    user = relationship("User", foreign_keys=[user_id])
    created_by = relationship("User", foreign_keys=[created_by_id])

class EventTask(Base):
    __tablename__ = "event_tasks"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    person_name = Column(String, nullable=False)
    responsibility = Column(String, nullable=False)  # e.g. Pravachan, Anchor, Kirtan, Prasang Katha, Audio, Prasad
    topic_notes = Column(Text, nullable=True)        # e.g. Vachanamrut G-1, Swamini Vato, etc.
    created_by_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    event = relationship("Event", back_populates="tasks")
    user = relationship("User", foreign_keys=[user_id])
    created_by = relationship("User", foreign_keys=[created_by_id])

