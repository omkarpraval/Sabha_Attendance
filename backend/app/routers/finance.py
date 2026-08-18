from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Event, EventFinance, User
from app.schemas import EventFinanceCreate, EventFinanceResponse, EventFinanceSummary
from app.auth import require_karyakar_or_admin

router = APIRouter(prefix="/api", tags=["Finances"])

@router.get("/events/{event_id}/finances", response_model=EventFinanceSummary)
def get_event_finances(
    event_id: int,
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """Fetch all finance entries and totals for a specific event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found."
        )

    records = db.query(EventFinance).options(
        joinedload(EventFinance.created_by),
        joinedload(EventFinance.user)
    ).filter(EventFinance.event_id == event_id).order_by(EventFinance.created_at.desc()).all()

    total_expense = sum(r.amount for r in records if r.transaction_type == "expense")
    total_sewa = sum(r.amount for r in records if r.transaction_type == "sewa_contribution")
    net_balance = total_sewa - total_expense

    items = []
    for r in records:
        items.append(EventFinanceResponse(
            id=r.id,
            event_id=r.event_id,
            user_id=r.user_id,
            person_name=r.person_name,
            amount=r.amount,
            purpose=r.purpose,
            transaction_type=r.transaction_type,
            payment_method=r.payment_method,
            notes=r.notes,
            created_by_id=r.created_by_id,
            created_by_name=r.created_by.name if r.created_by else None,
            created_at=r.created_at
        ))

    return EventFinanceSummary(
        event_id=event_id,
        total_expense=total_expense,
        total_sewa=total_sewa,
        net_balance=net_balance,
        item_count=len(items),
        items=items
    )

@router.post("/events/{event_id}/finances", response_model=EventFinanceResponse)
def create_event_finance(
    event_id: int,
    req: EventFinanceCreate,
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """Add a new finance transaction (expense or sewa contribution) for an event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found."
        )

    if req.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be greater than 0."
        )

    # Determine person name from linked user if provided
    person_name = req.person_name.strip()
    if req.user_id:
        linked_user = db.query(User).filter(User.id == req.user_id).first()
        if linked_user:
            person_name = linked_user.name

    if not person_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please specify a person or select a registered member."
        )

    finance_entry = EventFinance(
        event_id=event_id,
        user_id=req.user_id,
        person_name=person_name,
        amount=req.amount,
        purpose=req.purpose.strip() or "General Sabha Expense",
        transaction_type=req.transaction_type if req.transaction_type in ["expense", "sewa_contribution"] else "expense",
        payment_method=req.payment_method if req.payment_method in ["cash", "upi", "bank_transfer", "other"] else "cash",
        notes=req.notes,
        created_by_id=current_user.id
    )

    db.add(finance_entry)
    db.commit()
    db.refresh(finance_entry)

    return EventFinanceResponse(
        id=finance_entry.id,
        event_id=finance_entry.event_id,
        user_id=finance_entry.user_id,
        person_name=finance_entry.person_name,
        amount=finance_entry.amount,
        purpose=finance_entry.purpose,
        transaction_type=finance_entry.transaction_type,
        payment_method=finance_entry.payment_method,
        notes=finance_entry.notes,
        created_by_id=finance_entry.created_by_id,
        created_by_name=current_user.name,
        created_at=finance_entry.created_at
    )

@router.delete("/finances/{finance_id}")
def delete_event_finance(
    finance_id: int,
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
):
    """Delete a finance record."""
    entry = db.query(EventFinance).filter(EventFinance.id == finance_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Finance record not found."
        )

    db.delete(entry)
    db.commit()
    return {"message": "Finance entry deleted successfully", "id": finance_id}

@router.get("/finances/summary-all")
def get_all_events_finance_summary(
    current_user: User = Depends(require_karyakar_or_admin),
    db: Session = Depends(get_db)
) -> Dict[int, dict]:
    """Returns total expense, total sewa, and transaction count for all events."""
    all_records = db.query(EventFinance).all()
    summary: Dict[int, dict] = {}

    for r in all_records:
        if r.event_id not in summary:
            summary[r.event_id] = {
                "total_expense": 0.0,
                "total_sewa": 0.0,
                "net_balance": 0.0,
                "item_count": 0
            }
        if r.transaction_type == "expense":
            summary[r.event_id]["total_expense"] += r.amount
        elif r.transaction_type == "sewa_contribution":
            summary[r.event_id]["total_sewa"] += r.amount
        summary[r.event_id]["item_count"] += 1

    for ev_id, data in summary.items():
        data["net_balance"] = data["total_sewa"] - data["total_expense"]

    return summary
