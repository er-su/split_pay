# debug_db.py
from app.db import SessionLocal
from backend.schema import GroupMember

def main():
    db = SessionLocal()
    try:
        # Try exactly the query that was failing in _require_member
        qm = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == 1,
                GroupMember.user_id == 1,
                GroupMember.left_at.is_(None),
            )
            .first()
        )
        print("Query ran successfully. Result:", qm)
    finally:
        db.close()

if __name__ == "__main__":
    main()
