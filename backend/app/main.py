from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, users, venues, events, attendance, reports, notifications

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sabha Attendance Management System API",
    description="Full-stack attendance tracking API with QR + Geofencing for regular and irregular sabha events.",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(venues.router)
app.include_router(events.router)
app.include_router(attendance.router)
app.include_router(reports.router)
app.include_router(notifications.router)

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "app": "Sabha Attendance Management System API",
        "version": "1.0.0"
    }
