import datetime
import pytest
from fastapi.testclient import TestClient
from app.main import app
from seed import seed_database

client = TestClient(app)

def test_full_attendance_flow():
    # 1. Seed database
    seed_database()

    # 2. Login Admin
    res = client.post("/api/auth/login", json={"phone": "9999999999", "password": "admin123"})
    assert res.status_code == 200
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. Login Regular User
    res = client.post("/api/auth/login", json={"phone": "7777777777", "password": "user123"})
    assert res.status_code == 200
    user_token = res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 4. Get today's live event
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    res = client.get("/api/events", headers=user_headers)
    assert res.status_code == 200
    events = res.json()
    live_event = next(e for e in events if e["status"] == "open" and e["event_date"] == today_str)

    # 5. Scan QR code outside geofence (Expect 400 error)
    scan_outside = client.post("/api/attendance/scan", json={
        "qr_code_reference": live_event["qr_code_reference"],
        "latitude": 0.0,
        "longitude": 0.0
    }, headers=user_headers)
    assert scan_outside.status_code == 400
    assert "outside the venue geofence" in scan_outside.json()["detail"]

    # 6. Scan QR code INSIDE geofence (Expect 200 success)
    scan_inside = client.post("/api/attendance/scan", json={
        "qr_code_reference": live_event["qr_code_reference"],
        "latitude": live_event["venue_latitude"],
        "longitude": live_event["venue_longitude"]
    }, headers=user_headers)
    assert scan_inside.status_code == 200
    assert scan_inside.json()["status"] == "present"

    # 7. Check Duplicate scan
    scan_dup = client.post("/api/attendance/scan", json={
        "qr_code_reference": live_event["qr_code_reference"],
        "latitude": live_event["venue_latitude"],
        "longitude": live_event["venue_longitude"]
    }, headers=user_headers)
    assert scan_dup.status_code == 200
    assert scan_dup.json()["status"] == "present"

    # 8. Export Excel Report
    excel_res = client.get("/api/reports/export/excel", headers=admin_headers)
    assert excel_res.status_code == 200
    assert len(excel_res.content) > 0

    # 10. Test Forgot Password and Reset Password flow
    fp_res = client.post("/api/auth/forgot-password", json={"identifier": "7777777777"})
    assert fp_res.status_code == 200
    res_data = fp_res.json()
    assert "dev_reset_link" not in res_data
    assert "reset_token" not in res_data
    assert "Password reset link has been sent" in res_data["message"]

    # Test reset password using valid JWT reset token directly
    from app.routers.auth import create_access_token, hash_password
    from app.models import User
    from app.database import SessionLocal
    db = SessionLocal()
    u = db.query(User).filter(User.phone == "7777777777").first()
    reset_tok = create_access_token(data={"sub": u.phone, "type": "password_reset"})
    u.reset_token_hash = hash_password(reset_tok)
    db.commit()
    db.close()

    reset_res = client.post("/api/auth/reset-password", json={"token": reset_tok, "new_password": "newuserpassword123"})
    assert reset_res.status_code == 200
    assert "Password updated successfully" in reset_res.json()["message"]

    print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_full_attendance_flow()
