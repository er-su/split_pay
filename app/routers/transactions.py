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

def _verify_splits(payload: CreateTransactionIn):
    total_split_sum = 0
    for split in payload.splits:
        total_split_sum += split.amount_cents

    # Ensure splits add up or account for rounding error
    if not((total_split_sum  == payload.total_amount_cents) or (total_split_sum > payload.total_amount_cents - len(payload.splits) and total_split_sum <= payload.total_amount_cents)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid split sums")

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
def create_transaction(
    payload: CreateTransactionIn,
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a transaction. Returns 403 if not a member or if the group is archived
    Returns a 404 if the group is marked for deletion or does not exist
    Returns a 400 if the splits do not properly sum
    """
    group = db.get(Group, group_id)
    _require_member(db, group_id, current_user.id)
    _require_active_group(group, True)

    splits = []
    total_split_sum = 0
    for split in payload.splits:
        splits.append(Split(user_id=split.user_id, amount_cents=split.amount_cents, note=split.note))
        total_split_sum += split.amount_cents

    # Ensure splits add up or account for rounding error
    if not((total_split_sum  == payload.total_amount_cents) or (total_split_sum > payload.total_amount_cents - len(payload.splits) and total_split_sum <= payload.total_amount_cents)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid split sums")

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
def get_transaction(
    group_id: int,
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns the transaction. Returns a 403 if the user is not part of the group,
    the group is marked for deletion. Returns a 404 if the group or transaction does not exist
    """
    transaction = db.get(Transaction, transaction_id)

    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")

    group = transaction.group
    _require_member(db, group_id, current_user.id)
    _require_active_group(group)

    return transaction

# edit specific transaction
@router.put("/groups/{group_id}/transactions/{transaction_id}", response_model=TransactionOut)
def update_group(
    group_id: int,
    transaction_id: int,
    payload: UpdateTransactionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Edit the information within a transaction. Returns a 403 if user is an admin or the creator of the transcation
    Returns a 400 if the splits do not properly sum
    """
    transaction = db.get(Transaction, transaction_id)
    _verify_splits(payload)
    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    
    group = transaction.group
    membership = _require_member(db, group_id, current_user.id)
    _require_active_group(group, True)

    if membership.is_admin is False and transaction.creator_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Must be admin or creator")
    
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)

    return transaction

@router.delete("/groups/{group_id}/transaction/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    group_id: int,
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a transaction forever. This cannot be reversed. Returns a 404 if the transaction_id provided does
    not exist
    """
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

@router.get("/groups/{group_id}/transactions/{transaction_id}/splits/{split_id}")
def get_split():
    pass