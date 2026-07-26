import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pywebpush import webpush, WebPushException

from app.database import get_db
from app.config import settings
from app.models import PushSubscription, User, UserRole
from app.schemas import PushSubscriptionSchema
from app.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("/vapid-public-key")
def get_vapid_public_key():
    return {"public_key": settings.VAPID_PUBLIC_KEY}

@router.post("/subscribe")
def subscribe(
    sub: PushSubscriptionSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    endpoint = sub.endpoint
    p256dh = sub.keys.get("p256dh", "")
    auth = sub.keys.get("auth", "")

    existing = db.query(PushSubscription).filter(
        PushSubscription.user_id == current_user.id,
        PushSubscription.endpoint == endpoint
    ).first()

    if not existing:
        new_sub = PushSubscription(
            user_id=current_user.id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth
        )
        db.add(new_sub)
        db.commit()

    return {"message": "Push subscription saved successfully."}

def send_web_push_notification(subscription: PushSubscription, payload: dict):
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth
                }
            },
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_CLAIMS_SUB}
        )
    except WebPushException as ex:
        print(f"Web Push Exception: {ex}")
    except Exception as e:
        print(f"Failed to send web push: {e}")

@router.post("/test-push")
def test_push_notification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subs = db.query(PushSubscription).filter(PushSubscription.user_id == current_user.id).all()
    payload = {
        "title": "Sabha Notification Test",
        "body": f"Hello {current_user.name}! Web Push is working properly.",
        "icon": "/icon-192.png"
    }
    for sub in subs:
        send_web_push_notification(sub, payload)
    return {"message": f"Push sent to {len(subs)} subscription endpoints."}
