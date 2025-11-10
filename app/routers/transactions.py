# app/routers/transactions.py
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from fastapi import APIRouter, Depends, HTTPException, Query, status, FastAPI
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from typing import List, Optional, Set
from pathlib import Path
import requests
import json
import os

from backend.schema import Transaction, User, Split, Group, GroupMember
from app.deps import get_db, get_current_user
from app.schema import (
    SplitIn,
    SplitOut,
    CreateTransactionIn,
    UpdateTransactionIn,
    TransactionOut
)

TWO_PLACES = Decimal(10) ** -2
router = APIRouter(tags=["transactions"])

def get_exchange_rate(transaction_currency: str, group_currency: str):
    if transaction_currency == group_currency:
        return None
    
    # first check if the exchange has already been cached, note that exchange rate goes both ways so either
    # currency will be fine
    trans_path = Path(f"../exchange_cache/{transaction_currency}.json")
    group_path = Path(f"../exchange_cache/{group_currency}.json")

    if trans_path.exists():
        with open(trans_path, "r") as f:
            exchange_data = json.load(f)

        now = int(datetime.now(timezone.utc).timestamp())

        # if its still valid
        if int(exchange_data["time_next_update_unix"]) > now:
            return float(exchange_data["rates"][group_currency])
        
        # else move onto the group path instead

    if group_path.exists():
        with open(group_path, "r") as f:
            exchange_data = json.load(f)

        now = int(datetime.now(timezone.utc).timestamp())

        # if its still valid
        if int(exchange_data["time_next_update_unix"]) > now:
            return (1.0 / float(exchange_data["rates"][group_currency]))
        
    os.makedirs(os.path.dirname(trans_path), exist_ok=True)
    # making
    trans_resp = requests.get(f"https://open.er-api.com/v6/latest/{transaction_currency}")
    if trans_resp.status_code == 200:
        # save the resp
        transaction_data = trans_resp.json()
        assert transaction_data["result"] == "success"

        with open(trans_path, "w") as f:
            json.dump(transaction_data, f, ensure_ascii=False, indent=4)
        
        return float(transaction_data["rates"][group_currency]) 
    
    # try the other one if this fails too

    group_resp = requests.get(f"https://open.er-api.com/v6/latest/{transaction_currency}")
    if group_resp.status_code == 200:
        # save the resp
        group_data = group_resp.json()
        assert group_data["result"] == "success"

        with open(group_path, "w") as f:
            json.dump(group_data, f, ensure_ascii=False, indent=4)
        
        return (1.0 / float(group_data["rates"][group_currency]))
    
    # unable to request, defer to a different time
    return None

def _verify_splits(payload: CreateTransactionIn | UpdateTransactionIn, user_ids_in_group: Set[int], payer_id: int):
    if payload.splits is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must provide splits")

    total_split_sum = Decimal()
    for split in payload.splits:
        if split.user_id not in user_ids_in_group or split.user_id == payer_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid split users")
        total_split_sum += split.amount_cents
        
        # remove to check for duplicate user ids in splits
        user_ids_in_group.remove(split.user_id)

    # Ensure splits add up or account for rounding error (ignore pylance error as we verify that they are not None before passing into function)
    if (total_split_sum.quantize(TWO_PLACES, rounding=ROUND_HALF_UP) != payload.total_amount_cents): # type: ignore
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid split sums {total_split_sum} != {payload.total_amount_cents}")
    
def _verify_update_splits(old_transaction: Transaction, payload: UpdateTransactionIn, user_ids_in_group: Set[int], payer_id: int):
    # if splits and total are not updated, then everything should be fine
    if payload.splits is None and payload.total_amount_cents is None:
        return None
    
    # else verify that the splits and payload are updated, must pull the original total to verify
    
    # if both were updated
    if payload.total_amount_cents is not None and payload.splits is not None:
        # verify as normal
        _verify_splits(payload, user_ids_in_group, payer_id)

    elif payload.total_amount_cents is None:
        # we verify as normal by assuming that the old value is inserted
        payload.total_amount_cents = old_transaction.total_amount_cents
        _verify_splits(payload, user_ids_in_group, payer_id)

    # if the splits are unchanged do the same
    else:
        payload.splits = [SplitIn.model_validate(split) for split in old_transaction.splits]
        _verify_splits(payload, user_ids_in_group, payer_id)

def _get_all_users_in_group(db: Session, group_id: int, exclude_deleted:bool = False) -> Set[int]:
    if exclude_deleted:
        stmt = (
            select(User.id)
            .join(GroupMember, GroupMember.user_id == User.id)
            .where(
                GroupMember.group_id == group_id,
                User.deleted_at.is_(None),
            )
        )
    else:
        stmt = (
            select(User.id)
            .join(GroupMember, GroupMember.user_id == User.id)
            .where(
                GroupMember.group_id == group_id,
            )
        )
    return set(db.scalars(stmt))

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
    #TODO automatically add the current exchange rate if not provided via api
    """
    Create a transaction. Returns 403 if not a member or if the group is archived
    Returns a 404 if the group is marked for deletion or does not exist
    Returns a 400 if the splits do not properly sum
    """
    group = db.get(Group, group_id)
    _require_member(db, group_id, current_user.id)
    _require_active_group(group, True)

    group_user_ids = _get_all_users_in_group(db, group_id, True)
    _verify_splits(payload, group_user_ids, payload.payer_id)

    # get transaction rate
    if group.base_currency != payload.currency and payload.exchange_rate_to_group is None: # type: ignore
        exchange_rate = get_exchange_rate(payload.currency, group.base_currency) # type: ignore
    else:
        exchange_rate = None
        
    splits = [Split(
        user_id=split.user_id, 
        amount_cents=split.amount_cents, 
        note=split.note
    ) for split in payload.splits]

    t = Transaction(
        group_id = group_id,
        creator_id = current_user.id,
        payer_id = payload.payer_id,

        title = payload.title,
        memo = payload.memo,

        total_amount_cents = payload.total_amount_cents,
        currency = payload.currency,
        exchange_rate_to_group = payload.exchange_rate_to_group or exchange_rate,

        splits = splits
    )

    db.add(t)
    db.commit()
    db.refresh(t)
    return t

@router.get("/groups/{group_id}/transactions", response_model=List[TransactionOut])
def get_all_transactions(
    group_id: int,
    start_date: Optional[datetime] = Query(None, description="Filter transactions created after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter transactions created before this date"),
    payer_id: Optional[int] = Query(None),
    creator_id: Optional[int] = Query(None),
    limit: int = Query(10, ge=1, le=200, description="Limit number of results (default 50)"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    group = db.get(Group, group_id)
    _require_member(db, group_id, current_user.id)
    _require_active_group(group, False)
    stmt = (
        select(Transaction)
        .options(
            joinedload(Transaction.splits).joinedload(Split.user)
        )
        .where(Transaction.group_id == group_id)
    )

    # Optional filters
    if start_date:
        stmt = stmt.where(Transaction.created_at >= start_date)
    if end_date:
        stmt = stmt.where(Transaction.created_at <= end_date)
    if payer_id:
        stmt = stmt.where(Transaction.payer_id == payer_id)
    if creator_id:
        stmt = stmt.where(Transaction.creator_id == creator_id)
    stmt = stmt.order_by(Transaction.created_at.desc()).limit(limit).offset(offset)

    result = db.scalars(stmt).unique()
    transactions = result.all()

    return transactions

# get specific transaction
@router.get("/transactions/{transaction_id}", response_model=TransactionOut)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Returns the transaction. Returns a 403 if the user is not part of the group,
    the group is marked for deletion. Returns a 404 if the group or transaction does not exist
    """
    transaction = (
        db.query(Transaction)
        .options(
            joinedload(Transaction.splits).joinedload(Split.user)
        )
        .filter(Transaction.id == transaction_id)
        .first()
    )

    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")

    group = transaction.group
    _require_member(db, group.id, current_user.id)
    _require_active_group(group)

    return transaction

# edit specific transaction
@router.put("/transactions/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    payload: UpdateTransactionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Edit the information within a transaction. Returns a 403 if user is an admin or the creator of the transcation
    Returns a 400 if the splits do not properly sum
    """
    transaction = (
        db.query(Transaction)
        .options(
            joinedload(Transaction.splits).joinedload(Split.user)
        )
        .filter(Transaction.id == transaction_id)
        .first()
    )
    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
  
    group = transaction.group
    group_id = group.id
    membership = _require_member(db, group_id, current_user.id)
    _require_active_group(group, True)

  
    group_user_ids = _get_all_users_in_group(db, group_id, False)
    _verify_update_splits(transaction, payload, group_user_ids, payload.payer_id or transaction.payer_id)
    if transaction is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Transaction not found")
    
    if membership.is_admin is False and transaction.creator_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Must be admin or creator")
    
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)

    return transaction

@router.delete("/transaction/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
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
    group_id = group.id
    membership = _require_member(db, group_id, current_user.id)
    _require_active_group(group, True)

    if membership.is_admin is False and transaction.creator_id != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Must be admin or creator")
    db.delete(transaction)
    db.commit()

@router.get("/groups/{group_id}/transactions/{transaction_id}/splits/{split_id}")
def get_split():
    #TODO implement individual split info (etc)
    pass