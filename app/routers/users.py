from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, FastAPI
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import exists, select
from typing import List, Optional

from backend.schema import Transaction, User, Split, Group, GroupMember
from app.deps import get_db, get_current_user
from app.schema import (
    EditUserIn,
    SplitIn,
    SplitOut,
    CreateTransactionIn,
    UpdateTransactionIn,
    TransactionOut,
    UserOut,
    GroupOut,
    CreateUserIn
)

router = APIRouter(tags=["users"])

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

@router.get("/me", response_model=UserOut)
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gets basic information about the user. Raises a 404 if the user is marked as deleted
    """
    if current_user.is_deleted():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User has been deleted")
    
    return current_user

@router.get("/me/groups", response_model=List[GroupOut])
def get_my_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns a list of GroupOut objects the current user is in. Raises a 404 error if user is marked for deletion
    """
    if current_user.is_deleted():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User has been deleted")

    stmt = (
        select(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == current_user.id)
        .where(GroupMember.left_at.is_(None))  # optional: skip users who left groups
    )
    return db.scalars(stmt).all()

@router.post("/create-user", response_model=UserOut)
def create_user(
    payload: CreateUserIn,
    db: Session = Depends(get_db)
):
    """
    Creates a user. If the user already exists, returns a 400 bad request
    If the user was previously marked for deletion, reuse the old entry with new values
    Else create a new entry and return it
    """
    stmt = select(User).where(User.google_sub == payload.google_sub)
    result = db.scalar(stmt)

    # already exists but deleted their account, repurpose
    if result is not None and result.deleted_at is not None:
        result.email = payload.email
        result.display_name = payload.display_name
        result.is_active = True
        db.commit()
        db.refresh(result)
        return result

    # already exists and isnt deleted, error
    if result is not None and result.deleted_at is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User already exists")
    
    # else create a new user
    u = User(
        email=payload.email,
        display_name=payload.display_name or "No Name User",
        google_sub=payload.google_sub
    )

    db.add(u)
    db.commit()
    db.refresh(u)

    return u

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes self. Returns 404 if already marked for deletion
    """
    if current_user.deleted_at is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User has been deleted")

    current_user.anonymize()

    db.refresh(current_user)

@router.put("/me", response_model=UserOut)
def edit_user(
    payload: EditUserIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Edits the users information. Raises a 404 if the user is marked for deletion
    """
    if current_user.deleted_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User has been deleted")

    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user
