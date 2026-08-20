from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Event, EventTask, User
from app.schemas import EventTaskCreate, EventTaskResponse, EventTaskSummary
from app.auth import require_karyakar_or_admin, get_current_user

router = APIRouter(prefix="/api", tags=["Tasks & Duty Roster"])

@router.get("/events/{event_id}/tasks", response_model=EventTaskSummary)
def get_event_tasks(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch all task & duty assignments for a specific event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found."
        )

    records = db.query(EventTask).options(
        joinedload(EventTask.created_by),
        joinedload(EventTask.user)
    ).filter(EventTask.event_id == event_id).order_by(EventTask.created_at.asc()).all()

    items = []
    for r in records:
        items.append(EventTaskResponse(
            id=r.id,
            event_id=r.event_id,
            user_id=r.user_id,
            user_phone=r.user.phone if r.user else None,
            person_name=r.person_name,
            responsibility=r.responsibility,
            topic_notes=r.topic_notes,
            created_by_id=r.created_by_id,
            created_by_name=r.created_by.name if r.created_by else None,
            created_at=r.created_at
        ))

    return EventTaskSummary(
        event_id=event_id,
        item_count=len(items),
        items=items
    )


@router.post("/events/{event_id}/tasks", response_model=EventTaskResponse, status_code=status.HTTP_201_CREATED)
def create_event_task(
    event_id: int,
    payload: EventTaskCreate,
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """Assign a duty / task to a person for an event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found."
        )

    person_name = payload.person_name.strip()
    if payload.user_id:
        member = db.query(User).filter(User.id == payload.user_id).first()
        if member:
            person_name = member.name

    new_task = EventTask(
        event_id=event_id,
        user_id=payload.user_id,
        person_name=person_name,
        responsibility=payload.responsibility.strip(),
        topic_notes=payload.topic_notes.strip() if payload.topic_notes else None,
        created_by_id=current_user.id
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return EventTaskResponse(
        id=new_task.id,
        event_id=new_task.event_id,
        user_id=new_task.user_id,
        user_phone=new_task.user.phone if new_task.user else None,
        person_name=new_task.person_name,
        responsibility=new_task.responsibility,
        topic_notes=new_task.topic_notes,
        created_by_id=new_task.created_by_id,
        created_by_name=current_user.name,
        created_at=new_task.created_at
    )


@router.delete("/tasks/{task_id}", status_code=status.HTTP_200_OK)
def delete_event_task(
    task_id: int,
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """Delete an assigned task entry."""
    task = db.query(EventTask).filter(EventTask.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task assignment not found."
        )

    db.delete(task)
    db.commit()
    return {"message": "Task assignment deleted successfully", "deleted_id": task_id}


@router.get("/tasks/summary-all", response_model=Dict[int, List[EventTaskResponse]])
def get_all_tasks_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns a dictionary mapping event_id -> list of assigned tasks for all events."""
    all_tasks = db.query(EventTask).options(
        joinedload(EventTask.user),
        joinedload(EventTask.created_by)
    ).order_by(EventTask.created_at.asc()).all()

    summary: Dict[int, List[EventTaskResponse]] = {}
    for r in all_tasks:
        if r.event_id not in summary:
            summary[r.event_id] = []
        summary[r.event_id].append(EventTaskResponse(
            id=r.id,
            event_id=r.event_id,
            user_id=r.user_id,
            user_phone=r.user.phone if r.user else None,
            person_name=r.person_name,
            responsibility=r.responsibility,
            topic_notes=r.topic_notes,
            created_by_id=r.created_by_id,
            created_by_name=r.created_by.name if r.created_by else None,
            created_at=r.created_at
        ))

    return summary
