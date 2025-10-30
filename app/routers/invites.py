from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError
import os

from ..schema import InviteOut
from backend.schema import Group, GroupMember, User
from ..deps import get_db, get_current_user

INVITE_TOKEN_EXPIRE_DAYS = 7
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "dev-change-me")  # set secure value in production
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
FRONT_END_BASE_URL = os.getenv("FRONT_END_BASE_URL", "http://127.0.0.1:5173")

router = APIRouter(tags=["invites"])

@router.post("/groups/{group_id}/invite", response_model = InviteOut)
def generate_invite_link(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    
    group_member = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.id)
        .first()
    )

    if not group_member or not group_member.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a group member")

    # Create a signed token
    payload = {
        "group_id": group_id,
        "inviter_id": current_user.id,
        "exp": datetime.now(timezone.utc) + timedelta(days=INVITE_TOKEN_EXPIRE_DAYS),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    # Return a link the frontend can share
    invite_link = f"{FRONT_END_BASE_URL}/groups/join/{token}"
    return {"invite_link": invite_link}

@router.get("/groups/join/{token}")
def join_group(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        group_id: int = payload.get("group_id") # type: ignore
        if not group_id:
            raise HTTPException(status_code=400, detail="Invalid invite link")
        
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired invite link")
    
    # Check if group still exists
    group = db.get(Group, group_id)
    if not group or group.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Group not found or archived")
    
    gm = (
        db.query(GroupMember)
        .filter(GroupMember.group_id == group_id, GroupMember.user_id == current_user.id)
        .first()
    )

    # already a member
    if gm and gm.left_at is None:
        return {"message": "Already a member"}
    
    # If member exists and left at some point -> update old db entry
    elif gm and gm.left_at is not None:
        gm.left_at = None
        gm.is_admin = False

    else:
        gm = GroupMember(group_id=group_id, user_id=current_user.id, is_admin=False)
        db.add(gm)

    db.commit()
    db.refresh(gm)

    return {"message": "Joined group successfully", "group_id": group_id}