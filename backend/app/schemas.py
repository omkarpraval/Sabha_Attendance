from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import datetime
import re

def validate_10_digit_phone(v: str) -> str:
    cleaned = v.strip() if v else ""
    if not re.match(r"^\d{10}$", cleaned):
        raise ValueError("Mobile phone number must be exactly 10 numeric digits.")
    return cleaned

def validate_email_format(v: str) -> str:
    cleaned = v.strip().lower() if v else ""
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", cleaned):
        raise ValueError("Please provide a valid email address containing '@' and domain.")
    return cleaned

# Auth Schemas
class SignupRequest(BaseModel):
    phone: str
    email: str
    name: str
    dob: Optional[str] = None
    password: str

    @field_validator('phone')
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_10_digit_phone(v)

    @field_validator('email')
    @classmethod
    def check_email(cls, v: str) -> str:
        return validate_email_format(v)

from pydantic import BaseModel, Field, field_validator, model_validator

class LoginRequest(BaseModel):
    identifier: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    password: str

    @model_validator(mode='before')
    @classmethod
    def resolve_identifier(cls, values: dict) -> dict:
        if isinstance(values, dict):
            ident = values.get("identifier") or values.get("phone") or values.get("email")
            if not ident:
                raise ValueError("Must provide mobile phone number or email address.")
            values["identifier"] = str(ident).strip()
        return values

    @field_validator('identifier')
    @classmethod
    def check_identifier(cls, v: str) -> str:
        cleaned = v.strip()
        if "@" in cleaned:
            return validate_email_format(cleaned)
        return validate_10_digit_phone(cleaned)

class ForgotPasswordRequest(BaseModel):
    identifier: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class UserResponse(BaseModel):
    id: int
    phone: str
    email: Optional[str] = None
    name: str
    dob: Optional[str] = None
    role: str
    status: str
    member_category: str = "satsangi"

    # Extended Yuvak Profile Fields
    area: Optional[str] = None
    is_working: Optional[str] = None
    is_studying: Optional[str] = None
    occupation: Optional[str] = None
    company_name: Optional[str] = None
    education_stream: Optional[str] = None
    study_details: Optional[str] = None

    current_streak: int
    lifetime_count: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class UserCreateByAdmin(BaseModel):
    phone: str
    email: Optional[str] = None
    name: str
    dob: Optional[str] = None
    password: Optional[str] = None
    member_category: str = "satsangi"
    role: str = "yuvak"

    area: Optional[str] = None
    is_working: Optional[str] = None
    is_studying: Optional[str] = None
    occupation: Optional[str] = None
    company_name: Optional[str] = None
    education_stream: Optional[str] = None
    study_details: Optional[str] = None

    @field_validator('phone')
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_10_digit_phone(v)

    @field_validator('email')
    @classmethod
    def check_email(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            return validate_email_format(v)
        return None

class BulkUserItem(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    dob: Optional[str] = None
    member_category: Optional[str] = "satsangi"
    role: Optional[str] = "yuvak"
    password: Optional[str] = None

    area: Optional[str] = None
    is_working: Optional[str] = None
    is_studying: Optional[str] = None
    occupation: Optional[str] = None
    company_name: Optional[str] = None
    education_stream: Optional[str] = None
    study_details: Optional[str] = None

class BulkUserImportRequest(BaseModel):
    users: List[BulkUserItem]

class BulkUserImportResponse(BaseModel):
    created_count: int
    skipped_count: int
    skipped_phones: List[str]

class UserUpdateByAdmin(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[str] = None
    password: Optional[str] = None
    member_category: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

    area: Optional[str] = None
    is_working: Optional[str] = None
    is_studying: Optional[str] = None
    occupation: Optional[str] = None
    company_name: Optional[str] = None
    education_stream: Optional[str] = None
    study_details: Optional[str] = None

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
class EventUpdate(BaseModel):
    title: Optional[str] = None
    event_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    venue_id: Optional[int] = None
    qr_mode: Optional[str] = None

class EventCreate(BaseModel):
    title: str
    event_type: str = "one_time"  # "recurring" or "one_time"
    event_date: str  # YYYY-MM-DD
    day_of_week: Optional[str] = None  # monday, tuesday, etc.
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
    accuracy: Optional[float] = None

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

# Event Finance Schemas
class EventFinanceCreate(BaseModel):
    user_id: Optional[int] = None
    person_name: str
    amount: float
    purpose: str
    transaction_type: str = "expense"  # 'expense' | 'sewa_contribution'
    payment_method: str = "cash"       # 'cash' | 'upi' | 'bank_transfer' | 'other'
    notes: Optional[str] = None

class EventFinanceResponse(BaseModel):
    id: int
    event_id: int
    user_id: Optional[int] = None
    person_name: str
    amount: float
    purpose: str
    transaction_type: str
    payment_method: str
    notes: Optional[str] = None
    created_by_id: Optional[int] = None
    created_by_name: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class EventFinanceSummary(BaseModel):
    event_id: int
    total_expense: float
    total_sewa: float
    net_balance: float
    item_count: int
    items: List[EventFinanceResponse]

# Event Task / Duty Roster Schemas
class EventTaskCreate(BaseModel):
    user_id: Optional[int] = None
    person_name: str
    responsibility: str
    topic_notes: Optional[str] = None

class EventTaskResponse(BaseModel):
    id: int
    event_id: int
    user_id: Optional[int] = None
    user_phone: Optional[str] = None
    person_name: str
    responsibility: str
    topic_notes: Optional[str] = None
    created_by_id: Optional[int] = None
    created_by_name: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class EventTaskSummary(BaseModel):
    event_id: int
    item_count: int
    items: List[EventTaskResponse]
