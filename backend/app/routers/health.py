import time
import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter(prefix="/api/health", tags=["Health"])

START_TIME = time.time()

@router.get("")
def healthcheck(db: Session = Depends(get_db)):
    """
    Returns server health, database connectivity, and uptime metrics.
    """
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "unhealthy"

    uptime_seconds = int(time.time() - START_TIME)
    
    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "database": db_status,
        "uptime_seconds": uptime_seconds,
        "timestamp_utc": datetime.datetime.utcnow().isoformat() + "Z"
    }
