import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sabha Attendance Management System"
    SECRET_KEY: str = "sabha_secret_key_2026_super_secure_jwt_token_key_change_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for ease of testing
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days
    DATABASE_URL: str = "sqlite:///./sabha_attendance.db"
    
    # VAPID keys for Web Push Notifications
    VAPID_PUBLIC_KEY: str = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgD8RjWJv-Q2K757279-L-0129-L0129"
    VAPID_PRIVATE_KEY: str = "u8_81928391283912831293819238123"
    VAPID_CLAIMS_SUB: str = "mailto:admin@sabha.org"

    # SMTP Email configuration (Zoho SMTP)
    SMTP_HOST: str = "smtp.zoho.in"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = "omkarpraval@zohomail.in"
    SMTP_PASSWORD: str = "vmWcGaLrCySv"
    EMAIL_FROM: str = "omkarpraval@zohomail.in"
    SMTP_USE_TLS: bool = True

    class Config:
        env_file = ".env"

settings = Settings()
