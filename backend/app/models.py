import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole:
    ADMIN = "admin"
    KARYAKAR = "karyakar"
    USER = "user"

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
    name = Column(String, nullable=False)
    dob = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default=UserRole.USER, nullable=False)
    status = Column(String, default=UserStatus.PENDING, nullable=False)
    current_streak = Column(Integer, default=0)
    lifetime_count = Column(Integer, default=0)
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
    event_date = Column(String, nullable=False)  # YYYY-MM-DD
    start_time = Column(String, nullable=False)  # HH:MM (24h)
    end_time = Column(String, nullable=False)    # HH:MM (24h)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=False)
    qr_mode = Column(String, default=QRMode.REUSABLE, nullable=False)
    qr_code_reference = Column(String, index=True, nullable=False)  # Non-unique to allow reusable venue QR reference across events
    status = Column(String, default=EventStatus.OPEN, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    venue = relationship("Venue", back_populates="events")
    created_by = relationship("User")
    attendances = relationship("Attendance", back_populates="event")

class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, nullable=False)  # present, absent, excused
    marked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    marking_method = Column(String, nullable=False)  # self_qr, karyakar_manual, admin_manual, auto_absent
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
    attendance_id = Column(Integer, ForeignKey("attendances.id"), nullable=False)
    modified_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    old_status = Column(String, nullable=False)
    new_status = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    timestamp_utc = Column(DateTime, default=datetime.datetime.utcnow)

    attendance = relationship("Attendance", back_populates="audits")
    modified_by = relationship("User")

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    endpoint = Column(Text, nullable=False)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")
