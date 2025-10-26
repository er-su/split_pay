from decimal import Decimal
from fastapi.testclient import TestClient
import pytest
from backend.schema import User, GroupMember, Group, Transaction, Split
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

""" @pytest.fixture
def setup_env(client, db_session):
    g, users, members = create_group_and_users(db_session, 4)
    return g, users, members """

def test_create_user(client: TestClient, db_session: Session):
    payload = {
        "email": "wassup@gmail.com",
        "google_sub": "random sub"
    }

    resp = client.post("/create-user", json = payload)
    assert resp.status_code == 200
    assert (resp := resp.json())["email"] == "wassup@gmail.com"
    assert resp["display_name"] == "wassup@gmail.com"

def test_get_user(client: TestClient, db_session: Session):
    payload = {
        "email": "wassup@gmail.com",
        "google_sub": "random sub"
    }

    resp = client.post("/create-user", json = payload)
    assert resp.status_code == 200
    assert (resp := resp.json())["email"] == "wassup@gmail.com"
    assert resp["display_name"] == "wassup@gmail.com"

    user = db_session.get(User, resp["id"])
    app.dependency_overrides[get_current_user] = get_current_user_override(user)

    resp = client.get("/me")
    assert resp.status_code == 200
    assert (resp := resp.json())["email"] == "wassup@gmail.com"
    assert resp["display_name"] == "wassup@gmail.com"

def test_delete_user(client: TestClient, db_session: Session):
    user = create_user(db_session)
    app.dependency_overrides[get_current_user] = get_current_user_override(user)

    resp = client.delete("/me")
    assert resp.status_code == 204

    resp = db_session.get(User, user.id)
    assert resp is not None
    assert resp.deleted_at is not None
    assert resp.email is None
    assert resp.display_name is not None
    assert resp.google_sub is not None

def test_edit_user(client: TestClient, db_session: Session):
    user = create_user(db_session)
    app.dependency_overrides[get_current_user] = get_current_user_override(user)

    payload = {
        "email": "newemail@gmail.com",
        "display_name": "new display name lmao"
    }

    resp = client.put("/me", json=payload)
    assert resp.status_code == 200
    assert (resp := resp.json())["email"] == "newemail@gmail.com"
    assert resp["display_name"] == "new display name lmao"

def test_getting_groups(client: TestClient, db_session: Session):
    user = create_user(db_session)
    app.dependency_overrides[get_current_user] = get_current_user_override(user)

    # test with no groups
    resp = client.get("/me/groups")
    assert resp.status_code == 200
    assert len(resp.json()) == 0


    payload = {
        "name": "Test Group1",
        "description": "This is a test group",
        "base_currency": "JPY",
    }
    resp = client.post("/groups", json=payload)
    assert resp.status_code == 201

    resp = client.get("/me/groups")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["name"] == payload["name"]

    payload = {
        "name": "Test Group2",
        "description": "This is a test group",
        "base_currency": "JPY",
    }
    resp = client.post("/groups", json=payload)
    assert resp.status_code == 201

    resp = client.get("/me/groups")
    assert resp.status_code == 200
    assert len(resp.json()) == 2
    assert resp.json()[1]["name"] == payload["name"]

def test_deletion_while_in_transaction(client: TestClient, db_session: Session):
    group, users, members = create_group_and_users(db_session, 2)
    app.dependency_overrides[get_current_user] = get_current_user_override(users[0])

    #create a transaction invloving user 1
    payload = {
        "payer_id": users[0].id,
        "title": "Dinner with user 1",
        "total_amount_cents": "25.00",
        "currency": "USD",
        "splits": [
            {"user_id": users[1].id, "amount_cents": "25.00", "note": "user 1 is fat"},
        ],
    }

    resp = client.post("/groups/1/transactions", json=payload)
    assert resp.status_code == 200

    resp = client.get("/groups/1/transactions")
    assert resp.status_code == 200
    assert len(resp := resp.json()) == 1

    resp = client.get("/groups/1/members")
    assert resp.status_code == 200
    assert len(resp.json()) == 2

    # now delete user 1
    app.dependency_overrides[get_current_user] = get_current_user_override(users[1])
    resp = client.delete("/me")
    assert resp.status_code == 204

    #inspect group and stuff note that normally, deleted people cant access due to the check in get_current_user
    # but this fails since we are overriding the thing
    app.dependency_overrides[get_current_user] = get_current_user_override(users[0])
    resp = client.get("/groups/1/transactions/1")
    assert resp.status_code == 200

    resp = client.get("/groups/1/members")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = client.get("/groups/1/all-members")
    assert resp.status_code == 200
    assert len(resp.json()) == 2
    
    resp = client.get("/users/1")
    assert resp.status_code == 404