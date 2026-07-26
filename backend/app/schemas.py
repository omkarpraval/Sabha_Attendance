from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import datetime
import re

def validate_10_digit_phone(v: str) -> str:
    cleaned = v.strip() if v else ""
    if not re.match(r"^\d{10}$", cleaned):
        raise ValueError("Mobile phone number must be exactly 10 numeric digits.")
    return cleaned

# Auth Schemas
class SignupRequest(BaseModel):
    phone: str
    name: str
    dob: Optional[str] = None
    password: str

    @field_validator('phone')
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_10_digit_phone(v)

class LoginRequest(BaseModel):
    phone: str
    password: Optional[str] = None
    otp: Optional[str] = None

    @field_validator('phone')
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_10_digit_phone(v)

class OTPRequest(BaseModel):
    phone: str

    @field_validator('phone')
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_10_digit_phone(v)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    phone: str
    name: str
    dob: Optional[str] = None
    role: str
    status: str
    current_streak: int
    lifetime_count: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Venue Schemas
class VenueCreate(BaseModel):
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    radius_meters: float = 100.0

class VenueResponse(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    radius_meters: float
    qr_code_reference: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Event Schemas
class EventCreate(BaseModel):
    title: str
    event_date: str  # YYYY-MM-DD
    start_time: str  # HH:MM
    end_time: str    # HH:MM
    venue_id: int
    qr_mode: str = "reusable"  # reusable or per_event
    is_recurring_saturday: bool = False
    recurring_weeks: int = 1

class EventResponse(BaseModel):
    id: int
    title: str
    event_date: str
    start_time: str
    end_time: str
    venue_id: int
    venue_name: Optional[str] = None
    venue_latitude: Optional[float] = None
    venue_longitude: Optional[float] = None
    venue_radius_meters: Optional[float] = None
    qr_mode: str
    qr_code_reference: str
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Attendance Schemas
class ScanAttendanceRequest(BaseModel):
    qr_code_reference: str
    latitude: float
    longitude: float

class ManualAttendanceRequest(BaseModel):
    user_id: int
    event_id: int
    status: str = "present"  # present, absent

class ExcuseAttendanceRequest(BaseModel):
    event_id: int
    reason: str

class EditAttendanceRequest(BaseModel):
    new_status: str
    reason: str

class AttendanceAuditResponse(BaseModel):
    id: int
    modified_by_name: str
    old_status: str
    new_status: str
    reason: str
    timestamp_utc: datetime.datetime

    class Config:
        from_attributes = True

class AttendanceResponse(BaseModel):
    id: int
    event_id: int
    event_title: Optional[str] = None
    event_date: Optional[str] = None
    user_id: int
    user_name: Optional[str] = None
    user_phone: Optional[str] = None
    status: str
    marked_by_name: Optional[str] = None
    marking_method: str
    excuse_reason: Optional[str] = None
    distance_meters: Optional[float] = None
    timestamp_utc: datetime.datetime

    class Config:
        from_attributes = True

# Web Push Subscription Schema
class PushSubscriptionSchema(BaseModel):
    endpoint: str
    keys: dict
