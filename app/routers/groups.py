# app/routers/groups.py
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from .transactions import get_exchange_rate

from backend.schema import Group, GroupMember, User
from app.deps import get_db, get_current_user
from app.schema import (
    CreateGroupIn,
    GroupDuesOut,
    GroupOut,
    MemberOut,
    UpdateGroupIn,
    CreateMemberIn,
)

from pydantic import BaseModel

router = APIRouter()

# -------------------------
# Utility helpers
# -------------------------
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

@router.post("/groups", response_model=GroupOut, status_code=status.HTTP_201_CREATED, tags=["groups"])
def create_group(
    payload: CreateGroupIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new group and add the creator as an admin member.
    Adds to both groups and memberships table and returns the created group information
    """
    group = Group(
        name=payload.name,
        description=payload.description,
        base_currency=payload.base_currency,
        location_name=payload.location_name,
        location_lat=payload.location_lat,
        location_lon=payload.location_lon,
        created_by=current_user.id,
    )
    db.add(group)
    db.flush()  # assign group.id

    gm = GroupMember(group_id=group.id, user_id=current_user.id, is_admin=True)
    db.add(gm)
    db.commit()
    db.refresh(group)
    return GroupOut.model_validate(group)

@router.get("/groups/{group_id}", response_model=GroupOut, tags=["groups"])
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return basic information about a group
    """
    group = db.get(Group, group_id)
    _require_active_group(group)
    _require_member(db, group_id, current_user.id)
    return GroupOut.model_validate(group)

@router.put("/groups/{group_id}", response_model=GroupOut, tags=["groups"])
def update_group(
    group_id: int,
    payload: UpdateGroupIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update group information and return new representation of group
    """
    group = db.get(Group, group_id)
    _require_active_group(group, True)
    _require_admin(db, group_id, current_user.id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(group, field, value)
    
    db.commit()
    db.refresh(group)

    return GroupOut.model_validate(group)

# -------------------------
# Archive / Unarchive group (admin only)
# -------------------------
@router.post("/groups/{group_id}/archive", status_code=status.HTTP_204_NO_CONTENT, tags=["groups"])
def archive_group(
    group_id: int, 
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Archive group (read-only). Only admin."""
    group = db.get(Group, group_id)

    if group.is_archived: # type: ignore
        return None
    
    _require_active_group(group)
    _require_admin(db, group_id, current_user.id)
    group.is_archived = True # type: ignore
    db.commit()

    return None

@router.post("/groups/{group_id}/unarchive", status_code=status.HTTP_204_NO_CONTENT, tags=["groups"])
def unarchive_group(
    group_id: int, 
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Unarchive group. Only admin."""
    group = db.get(Group, group_id)
    
    if group.is_archived is False: # type: ignore
        return None
    
    _require_active_group(group)
    _require_admin(db, group_id, current_user.id)
    group.is_archived = False # type: ignore
    db.commit()

    return None

@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["groups"])
def soft_delete_group(
    group_id: int, 
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user), 
    hard: bool = False
):
    """
    Soft-delete a group by default (set deleted_at).
    If hard=True and the current_user is admin, perform hard delete (dangerous).
    Query param example: DELETE /groups/1?hard=true
    """
    group = db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    _require_admin(db, group_id, current_user.id)

    if hard:
        # Hard delete: only allowed to admins (and maybe superusers)
        db.delete(group)
        db.commit()
        return None

    # Soft delete
    group.deleted_at = datetime.now(timezone.utc)  # type: ignore
    db.commit()
    return None

@router.get("/groups/{group_id}/dues", response_model=GroupDuesOut, tags=["groups"])
def get_current_dues(
    group_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user), 
):
    group = db.get(Group, group_id)
    _require_member(db, group_id, current_user.id)
    _require_active_group(group, True)

    dues = {(membership.user_id) : Decimal("0.00") for membership in group.members if membership.user_id != current_user.id} # type: ignore

    for transaction in group.transactions: # type: ignore
        #TODO if there is a rate, then multiply all cents with rate
        # is the payer, then add all the values
        multiplier = Decimal(1)
        if transaction.exchange_rate_to_group is not None and (transaction.currency != group.base_currency): # type: ignore
            multiplier = Decimal(str(transaction.exchange_rate_to_group))

        elif transaction.exchange_rate_to_group is None and (transaction.currency != group.base_currency): # type: ignore
            # this means the exhcange rate issue was deferred since there was some issue when creating
            multiplier = Decimal(str(get_exchange_rate(transaction_currency=transaction.currency, group_currency=group.base_currency))) # type: ignore
        
        if multiplier is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Exchange rate failure")
        
        if transaction.payer_id == current_user.id:
            for split in transaction.splits:
                if split.user_id == current_user.id:
                    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid split; contains self")
                dues[split.user_id] += split.amount_cents * multiplier
        
        # not the payer, see if they are in the splits
        else:
            for split in transaction.splits:
                # if the user is in the split
                if split.user_id == current_user.id:
                    dues[transaction.payer_id] -= split.amount_cents * multiplier
                    break

    return GroupDuesOut(
        dues=dues
    )

# Member stuff
@router.post("/groups/{group_id}/members", response_model=MemberOut, tags=["members"])
def add_member(
    group_id: int,
    payload: CreateMemberIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.get(Group, group_id)

    _require_active_group(group, True)
    _require_admin(db, group_id, current_user.id)

    user = db.get(User, payload.user_id)

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    gm = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == user.id)
        .first()
    )

    # If membership exists and left is None -> still a member
    if gm and gm.left_at is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already a member")

    # If member exists and left at some point -> update old db entry
    if gm and gm.left_at is not None:
        gm.left_at = None
        gm.is_admin = payload.make_admin

    # Was never part of the group
    else:
        gm = GroupMember(group_id=group_id, user_id=user.id, is_admin=payload.make_admin)
        db.add(gm)

    db.commit()
    db.refresh(gm)

    return MemberOut(
        user_id=gm.user_id,
        group_id=group_id,
        display_name=user.display_name,
        joined_at=str(gm.joined_at),
        left_at=str(gm.left_at) if gm.left_at else None,
        is_admin=gm.is_admin,
    )

@router.get("/groups/{group_id}/members", response_model=List[MemberOut], tags=["members"])
def list_non_left_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Only returns members that are present (have not left)
    """
    group = db.get(Group, group_id)
    _require_active_group(group)
    _require_member(db, group_id, current_user.id)

    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    return [
        MemberOut(
            user_id=m.user_id,
            group_id=m.group_id,
            display_name=m.user.display_name,
            joined_at=m.joined_at.isoformat(), # type: ignore
            left_at=m.left_at.isoformat() if m.left_at else None, # type: ignore
            is_admin=m.is_admin,
        )
        for m in members if m.left_at is None
    ]

@router.get("/groups/{group_id}/all-members", response_model=List[MemberOut], tags=["members"])
def list_all_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),    
):
    """
    Returns all members, even those who have left
    """
    group = db.get(Group, group_id)
    _require_active_group(group)
    _require_member(db, group_id, current_user.id)

    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    return [
        MemberOut(
            user_id=m.user_id,
            group_id=m.group_id,
            display_name=m.user.display_name,
            joined_at=m.joined_at.isoformat(), # type: ignore
            left_at=m.left_at.isoformat() if m.left_at else None, # type: ignore
            is_admin=m.is_admin,
        )
        for m in members
    ]  

@router.delete("/groups/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["members"])
def remove_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.get(Group, group_id)
    _require_active_group(group, True)

    # allow self-leave or admin removal
    if current_user.id != user_id:
        _require_admin(db, group_id, current_user.id)

    gm = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == user_id, GroupMember.left_at.is_(None))
        .first()
    )

    if not gm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")

    gm.left_at = datetime.now(timezone.utc) # type: ignore
    db.flush()

    active_count = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.left_at.is_(None))
        .count()
    )

    if active_count == 0:
        group.soft_delete() # type: ignore
