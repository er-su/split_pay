# app/routers/groups.py
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.schema import Group, GroupMember, User
from app.deps import get_db, get_current_user
from app.schema import (
    CreateGroupIn,
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

@router.post("/groups/", response_model=GroupOut, status_code=status.HTTP_201_CREATED, tags=["groups"])
async def create_group(
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
    return group

@router.get("/groups/{group_id}", response_model=GroupOut, tags=["groups"])
async def get_group(
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
    return group

@router.put("/groups/{group_id}", response_model=GroupOut, tags=["groups"])
async def update_group(
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
        setattr(group, field, value)
    
    db.commit()
    db.refresh(group)

    return group

# -------------------------
# Archive / Unarchive group (admin only)
# -------------------------
@router.post("/groups/{group_id}/archive", status_code=status.HTTP_204_NO_CONTENT, tags=["groups"])
async def archive_group(
    group_id: int, 
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Archive group (read-only). Only admin."""
    group = db.get(Group, group_id)
    _require_active_group(group)
    _require_admin(db, group_id, current_user.id)
    group.is_archived = True # type: ignore
    db.commit()

    return None

@router.post("/groups/{group_id}/unarchive", status_code=status.HTTP_204_NO_CONTENT, tags=["groups"])
async def unarchive_group(
    group_id: int, 
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user)
):
    """Unarchive group. Only admin."""
    group = db.get(Group, group_id)
    _require_active_group(group)
    _require_admin(db, group_id, current_user.id)
    group.is_archived = False # type: ignore
    db.commit()

    return None

@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["groups"])
async def soft_delete_group(
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

# Member stuff
@router.post("/groups/{group_id}/members", response_model=MemberOut, tags=["members"])
def add_member(
    group_id: int,
    payload: CreateMemberIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.get(Group, group_id)

    _require_active_group(group)
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
        display_name=user.display_name,
        joined_at=str(gm.joined_at),
        left_at=str(gm.left_at) if gm.left_at else None,
        is_admin=gm.is_admin,
    )

@router.get("/{group_id}/members", response_model=List[MemberOut], tags=["members"])
def list_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.get(Group, group_id)
    _require_active_group(group)
    _require_member(db, group_id, current_user.id)

    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    return [
        MemberOut(
            user_id=m.user_id,
            display_name=m.user.display_name,
            joined_at=m.joined_at.isoformat(), # type: ignore
            left_at=m.left_at.isoformat() if m.left_at else None, # type: ignore
            is_admin=m.is_admin,
        )
        for m in members
    ]

@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["members"])
def remove_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.get(Group, group_id)
    _require_active_group(group)

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

    with db.begin():
        gm.left_at = datetime.now(timezone.utc) # type: ignore
        db.flush()

        active_count = (
            db.query(GroupMember)
            .filter(GroupMember.group_id == group_id, GroupMember.left_at.is_(None))
            .count()
        )

        if active_count == 0:
            group.soft_delete() # type: ignore

# -------------------------
# Account deletion (anonymize user, preserve placeholders)
# -------------------------
#@router.post("/me/delete-account", status_code=204)
#def delete_my_account(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """
    An endpoint users call to delete their account. This will:
    - anonymize their User record (email cleared, display_name changed to 'Deleted user {id}')
    - keep GroupMember rows intact, preserving user_display_name_snapshot for group history.
    """
    """  user = db.get(User, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Anonymize the user
    user.anonymize()

    # Note: do not delete GroupMember records — they are kept to provide placeholders.
    # But we ensure user_display_name_snapshot exists for any membership lacking it.
    for gm in user.memberships:
        if not gm.user_display_name_snapshot:
            gm.user_display_name_snapshot = user.display_name or f"Deleted user {user.id}"
    db.commit()
    return None
 """