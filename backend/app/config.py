import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sabha Attendance Management System"
    SECRET_KEY: str = "sabha_secret_key_2026_super_secure_jwt_token_key_change_in_prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 365  # 1 Year persistent login until explicit logout
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 365  # 1 Year
    DATABASE_URL: str = "sqlite:///./sabha_attendance.db"
    FRONTEND_URL: str = "http://localhost:5173"
    
    # VAPID keys for Web Push Notifications
    VAPID_PUBLIC_KEY: str = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgD8RjWJv-Q2K757279-L-0129-L0129"
    VAPID_PRIVATE_KEY: str = "u8_81928391283912831293819238123"
    VAPID_CLAIMS_SUB: str = "mailto:admin@sabha.org"

    # SMTP & HTTPS Email configuration
    SMTP_HOST: str = "smtp.zoho.in"
    SMTP_PORT: int = 465
    SMTP_USERNAME: str = "omkarpraval@zohomail.in"
    SMTP_PASSWORD: str = "vmWcGaLrCySv"
    EMAIL_FROM: str = "omkarpraval@zohomail.in"
    SMTP_USE_TLS: bool = False

    # HTTP Email API Keys (Port 443 HTTPS - bypasses cloud socket blocks)
    RESEND_API_KEY: str = ""
    BREVO_API_KEY: str = ""

    # Initial Admin Accounts for Automatic Production Bootstrapping
    INITIAL_ADMIN_PHONE_1: str = ""
    INITIAL_ADMIN_EMAIL_1: str = ""
    INITIAL_ADMIN_PASSWORD_1: str = ""

    INITIAL_ADMIN_PHONE_2: str = ""
    INITIAL_ADMIN_EMAIL_2: str = ""
    INITIAL_ADMIN_PASSWORD_2: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
