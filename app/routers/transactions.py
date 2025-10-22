# app/routers/transactions.py
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, FastAPI
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional

from backend.schema import Transaction, User, Split, Group, GroupMember
from app.deps import get_db, get_current_user
from app.schema import (
    SplitIn,
    SplitOut,
    CreateTransactionIn,
    UpdateTransactionIn,
    TransactionOut
)

router = APIRouter(tags=["transactions"])

def _require_member(db: Session, group_id: int, user_id: int) -> GroupMember:
    gm = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id, GroupMember.left_at.is_(None))
        .first()
    )
    if not gm:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not a member of this group")
    return gm

def _require_admin(db: Session, group_id: int, user_id: int) -> GroupMember:
    gm = _require_member(db, group_id, user_id)
    if not gm.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return gm

def _require_active_group(group: Group | None, enforce_archive: bool = False):
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    elif group.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group is deleted")
    elif enforce_archive and group.is_archived:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Group is archived")
    
# create transaction
@router.post("/groups/{group_id}/transactions", response_model=TransactionOut)
async def create_transaction(
    payload: CreateTransactionIn,
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    group = db.get(Group, group_id)
    _require_member(db, group_id, current_user.id)
    _require_active_group(group)

    splits = [
        Split(user_id=split.user_id, amount_cents=split.amount_cents)
        for split in payload.splits
    ]

    t = Transaction(
        group_id = group_id,
        creator_id = current_user.id,
        payer_id = payload.payer_id,

        title = payload.title,
        memo = payload.memo,

        total_amount_cents = payload.total_amount_cents,
        currency = payload.currency,
        exchange_rate_to_group = payload.exchange_rate_to_group,

        splits = splits
    )

    db.add(t)
    db.commit()
    db.refresh(t)
    return t

# get specific transaction
@router.get("/groups/{group_id}/transactions/{transaction_id}", response_model=TransactionOut)
async def get_transaction(
    group_id: int,
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    transaction = db.get(Transaction, transaction_id)

    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")

    group = transaction.group
    _require_member(db, group_id, current_user.id)
    _require_active_group(group)

    return transaction

# edit specific transaction
@router.put("/groups/{group_id}/transactions/{transaction_id}", response_model=TransactionOut)
async def update_group(
    group_id: int,
    transaction_id: int,
    payload: UpdateTransactionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transaction = db.get(Transaction, transaction_id)

    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    
    group = transaction.group
    membership = _require_member(db, group_id, current_user.id)
    _require_active_group(group, True)

    if membership.is_admin is False and transaction.creator_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Must be admin or creator")
    
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)

    return transaction

# delete a transaction permanantly 
@router.delete("/groups/{group_id}/transaction/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    group_id: int,
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transaction = db.get(Transaction, transaction_id)

    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    
    group = transaction.group
    membership = _require_member(db, group_id, current_user.id)
    _require_active_group(group, True)

    if membership.is_admin is False and transaction.creator_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Must be admin or creator")
    db.delete(transaction)
    db.commit()