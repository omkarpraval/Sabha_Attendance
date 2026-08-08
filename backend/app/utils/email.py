import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from app.config import settings

logger = logging.getLogger(__name__)

def send_password_reset_email(user_email: str, user_name: str, reset_token: str, reset_link: str) -> bool:
    """
    Sends a beautifully formatted HTML password reset email via Zoho SMTP.
    The reset link is valid for 15 minutes and is single-use.
    """
    if not settings.SMTP_HOST or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not fully configured in settings.")
        return False

    sender_email = settings.EMAIL_FROM or settings.SMTP_USERNAME
    subject = "🛕 Password Reset Request — Sabha Attendance System"

    # HTML Email Template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Request</title>
      <style>
        body {{
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #FDFBF7;
          margin: 0;
          padding: 0;
          color: #3A322C;
        }}
        .container {{
          max-width: 580px;
          margin: 30px auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(58, 50, 44, 0.08);
          border: 1px solid #EFE7DA;
        }}
        .header {{
          background: linear-gradient(135deg, #8B3A3A 0%, #6E2C2C 100%);
          padding: 32px 24px;
          text-align: center;
          color: #ffffff;
        }}
        .header-title {{
          font-family: Georgia, serif;
          font-size: 24px;
          font-weight: bold;
          margin: 8px 0 0 0;
          color: #ffffff;
        }}
        .header-subtitle {{
          color: #E8A33D;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
        }}
        .body {{
          padding: 32px 28px;
        }}
        .greeting {{
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #8B3A3A;
        }}
        .text {{
          font-size: 14px;
          line-height: 1.6;
          color: #554A42;
          margin-bottom: 24px;
        }}
        .btn-container {{
          text-align: center;
          margin: 32px 0;
        }}
        .btn {{
          display: inline-block;
          background-color: #8B3A3A;
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 32px;
          font-size: 15px;
          font-weight: bold;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(139, 58, 58, 0.25);
        }}
        .info-box {{
          background-color: #FFF9EF;
          border: 1px solid #F0C987;
          border-radius: 12px;
          padding: 16px;
          font-size: 13px;
          color: #6E5326;
          margin-top: 24px;
        }}
        .info-box ul {{
          margin: 8px 0 0 0;
          padding-left: 20px;
        }}
        .footer {{
          background-color: #FDFBF7;
          border-top: 1px solid #EFE7DA;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #8C8075;
        }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-subtitle">Jai Swaminarayan</div>
          <div class="header-title">Sabha Attendance System</div>
        </div>

        <div class="body">
          <div class="greeting">Namaste {user_name},</div>
          <div class="text">
            We received a request to reset the password for your Sabha Attendance account associated with <strong>{user_email}</strong>.
            Click the button below to choose a new password:
          </div>

          <div class="btn-container">
            <a href="{reset_link}" class="btn">Reset Password Now</a>
          </div>

          <div class="text" style="font-size: 12px; color: #8C8075; word-break: break-all; text-align: center;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="{reset_link}" style="color: #8B3A3A;">{reset_link}</a>
          </div>

          <div class="info-box">
            <strong>🔒 Security & Validity Notice:</strong>
            <ul>
              <li>This password reset link will expire in <strong>15 minutes</strong>.</li>
              <li>This link is for <strong>one-time use only</strong>.</li>
              <li>Updating your password will apply to both your <strong>Mobile Phone</strong> and <strong>Email</strong> logins.</li>
              <li>If you did not request a password reset, please ignore this email.</li>
            </ul>
          </div>
        </div>

        <div class="footer">
          🛕 BAPS Sabha Attendance Management System<br>
          Automated Geofence & QR Verification System
        </div>
      </div>
    </body>
    </html>
    """

    try:
      message = MIMEMultipart("alternative")
      message["Subject"] = subject
      message["From"] = f"Sabha Attendance System <{sender_email}>"
      message["To"] = user_email

      # Attach HTML version
      part = MIMEText(html_content, "html")
      message.attach(part)

      # Try SSL on Port 465 first (works reliably on Render cloud hosts), fallback to Port 587 (STARTTLS)
      sent = False
      last_err = None

      # Attempt 1: Port 465 (SSL Direct)
      try:
          server = smtplib.SMTP_SSL(settings.SMTP_HOST, 465, timeout=10)
          server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
          server.sendmail(sender_email, [user_email], message.as_string())
          server.quit()
          sent = True
          logger.info(f"Successfully sent password reset email to {user_email} via SSL (Port 465)")
      except Exception as e_ssl:
          last_err = e_ssl
          logger.warning(f"SMTP SSL Port 465 attempt failed: {e_ssl}. Retrying via Port 587 (STARTTLS)...")

      # Attempt 2: Port 587 (STARTTLS) if Attempt 1 failed
      if not sent:
          try:
              server = smtplib.SMTP(settings.SMTP_HOST, 587, timeout=10)
              server.starttls()
              server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
              server.sendmail(sender_email, [user_email], message.as_string())
              server.quit()
              sent = True
              logger.info(f"Successfully sent password reset email to {user_email} via STARTTLS (Port 587)")
          except Exception as e_tls:
              last_err = e_tls

      if sent:
          return True

      raise last_err or Exception("All SMTP ports (465, 587) failed or timed out.")

    except Exception as e:
      logger.error(f"Failed to send password reset email to {user_email}: {e}")
      print(f"[SMTP ERROR] Could not send reset email to {user_email}: {e}")
      return False
