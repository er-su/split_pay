from backend.schema import User, GroupMember, Group
from sqlalchemy.orm import Session
from app.deps import get_current_user  # your auth dep
from app.main import app
import random

def get_current_user_override(user):
    def override():
        return user
    return override

def create_user(db: Session, email="a@x.com", name="Alice") -> User:
    u = User(email=email, display_name=name, google_sub=email)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

def create_group_and_users(db: Session, num_users: int) -> tuple[Group, list[User], list[GroupMember]]:
    assert num_users >= 1
    users = [create_user(db, email=f"tester{i}@gmail.com", name=f"tester{i}") for i in range(num_users)]
    user = users[0]
    g = Group(
        name=f"Trip Random {random.randint(0, 1000)}",
        description = "This is a test description",
        created_by = user.id,
        base_currency = "JPY"
    )

    db.add(g)
    db.commit()
    db.refresh(g)

    members = [GroupMember(
        group_id=g.id,
        user_id=user.id,
        is_admin=True,
    )]
    for i in range(1, num_users):
        user = users[i]
        members.append(
            GroupMember(
                group_id=g.id,
                user_id=user.id,
                is_admin=False
            )
        )
    for m in members:
        db.add(m)
        db.commit()
        db.refresh(m)

    return g, users, members

def test_creating_transactions(client, db_session):
    group, users, members = create_group_and_users(db_session, 3)
    app.dependency_overrides[get_current_user] = get_current_user_override(users[1])
    
