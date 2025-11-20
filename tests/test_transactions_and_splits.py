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

@pytest.fixture
def setup_env(client, db_session):
    g, users, members = create_group_and_users(db_session, 4)
    return g, users, members


def test_create_transaction_as_member(client: TestClient, db_session: Session, setup_env):
    group, users, members = setup_env
    app.dependency_overrides[get_current_user] = get_current_user_override(users[1])

    payload = {
        "payer_id": int(users[1].id),
        "total_amount_cents": str(60.00),
        "exchange_rate_to_group": float(1.0),
        "currency": "USD",
        "title": "Dinner",
        "memo": "Testing",
        "splits": [
            {"user_id": int(users[0].id), "amount_cents": str(30.00)},
            {"user_id": int(users[2].id), "amount_cents": str(30.00)},
        ],
    }

    res = client.post(f"/groups/{group.id}/transactions", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert Decimal(data["total_amount_cents"]) == Decimal("60.00")
    assert len(data["splits"]) == 2
    assert data["payer_id"] == users[1].id

    # Check DB persisted
    tx = db_session.query(Transaction).filter_by(group_id=group.id).first()
    assert tx is not None
    assert tx.title == "Dinner"
    assert len(tx.splits) == 2

def test_create_transaction_non_member_forbidden(client, db_session, setup_env):
    group, users, members = setup_env
    outsider = create_user(db_session, email="not_in_group@mail.com", name="Outsider")
    app.dependency_overrides[get_current_user] = get_current_user_override(outsider)

    payload = {
        "payer_id": users[0].id,
        "total_amount_cents": (60.00),
        "currency": "USD",
        "title": "Test",
        "splits": [{"user_id": users[0].id, "amount_cents": (60.00)}],
    }

    res = client.post(f"/groups/{group.id}/transactions", json=payload)
    assert res.status_code == 403


def test_create_transaction_empty_splits(client, db_session, setup_env):
    group, users, members = setup_env
    app.dependency_overrides[get_current_user] = get_current_user_override(users[0])

    payload = {
        "payer_id": users[0].id,
        "total_amount_cents": "50.00",
        "currency": "USD",
        "title": "Test",
        "splits": [],
    }

    res = client.post(f"/groups/{group.id}/transactions", json=payload)
    # Should fail Pydantic validation before hitting endpoint
    assert res.status_code in (422, 400)

    # now test if the sum doesnt sum up
    
def test_create_transaction_nonsumming_splits(client: TestClient, db_session: Session, setup_env):
    _, users, _ = setup_env
    app.dependency_overrides[get_current_user] = get_current_user_override(users[0])

    payload = {
        "payer_id": users[0].id,
        "total_amount_cents": "50.00",
        "currency": "USD",
        "title": "Test",
        "splits": [
            {"user_id": users[1].id, "amount_cents": "25.00"},
            {"user_id": users[2].id, "amount_cents": "25.01"}
        ],
    }

    res = client.post(f"/groups/1/transactions", json=payload)
    assert res.status_code == 400

def test_transaction_rounding_issues(client: TestClient, db_session: Session, setup_env):
    _, users, _ = setup_env
    app.dependency_overrides[get_current_user] = get_current_user_override(users[0])

    amount = Decimal("10.00")
    per_user = amount / Decimal("3")

    payload = {
        "payer_id": users[0].id,
        "total_amount_cents": str(amount),
        "currency": "USD",
        "title": "Test",
        "splits": [
            {"user_id": users[1].id, "amount_cents": str(per_user)},
            {"user_id": users[2].id, "amount_cents": str(per_user)},
            {"user_id": users[3].id, "amount_cents": str(per_user)}
        ],
    }

    res = client.post(f"/groups/1/transactions", json=payload)
    assert(res.status_code == 200)
    
def test_create_transaction_with_non_member_split(client: TestClient, db_session: Session, setup_env):
    _, users, _ = setup_env
    app.dependency_overrides[get_current_user] = get_current_user_override(users[0])

    payload = {
        "payer_id": users[0].id,
        "total_amount_cents": "50.00",
        "currency": "USD",
        "title": "Test",
        "splits": [
            {"user_id": users[1].id, "amount_cents": "25.00"},
            {"user_id": 1000, "amount_cents": "25.00"}
        ],
    }

    res = client.post(f"/groups/1/transactions", json=payload)
    assert res.status_code == 400

def test_create_transaction_with_self_member_split(client: TestClient, db_session: Session, setup_env):
    _, users, _ = setup_env
    app.dependency_overrides[get_current_user] = get_current_user_override(users[0])

    payload = {
        "payer_id": users[0].id,
        "total_amount_cents": "50.00",
        "currency": "USD",
        "title": "Test",
        "splits": [
            {"user_id": users[1].id, "amount_cents": "25.00"},
            {"user_id": users[0].id, "amount_cents": "25.00"}
        ],
    }

    res = client.post(f"/groups/1/transactions", json=payload)
    assert res.status_code == 400


def test_get_transaction_success(client, db_session, setup_env):
    group, users, members = setup_env
    app.dependency_overrides[get_current_user] = get_current_user_override(users[1])

    # Create one transaction
    tx = Transaction(
        group_id=group.id,
        creator_id=users[1].id,
        payer_id=users[1].id,
        total_amount_cents=10000,
        currency="USD",
        title= "Test",
    )
    db_session.add(tx)
    db_session.commit()
    db_session.refresh(tx)

    res = client.get(f"/groups/{group.id}/transactions/{tx.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == tx.id
    assert data["group_id"] == group.id


def test_get_transaction_not_found(client, db_session, setup_env):
    group, users, _ = setup_env
    app.dependency_overrides[get_current_user] = get_current_user_override(users[0])
    res = client.get(f"/groups/{group.id}/transactions/99999")
    assert res.status_code == 404


def test_update_transaction_by_creator(client, db_session, setup_env):
    group, users, _ = setup_env
    creator = users[1]
    app.dependency_overrides[get_current_user] = get_current_user_override(creator)

    tx = Transaction(
        group_id=group.id,
        creator_id=creator.id,
        payer_id=creator.id,
        total_amount_cents=Decimal("60.00"),
        currency="USD",
        title="Old title",
        splits = [
            Split(user_id = users[0].id, amount_cents = "30.00"),
            Split(user_id = users[2].id, amount_cents = "30.00"),
        ]
    )
    db_session.add(tx)
    db_session.commit()
    db_session.refresh(tx)

    res = client.put(
        f"/transactions/{tx.id}",
        json={
            "title": "New title",
            "memo": "Updated",
            "total_amount_cents": "50.00",
            "splits": [
                {"user_id": users[2].id, "amount_cents": 25.00},
                {"user_id": users[0].id, "amount_cents": 25.00}
            ], 
        },
    )

    assert res.status_code == 200
    assert (res := res.json())["title"] == "New title"
    assert len(res["splits"]) == 2
    assert Decimal(res["total_amount_cents"]) == Decimal("50.00")
    for split in res["splits"]:
        assert Decimal(split["amount_cents"]) == Decimal("25.00")


def test_update_transaction_forbidden_for_non_creator(client, db_session, setup_env):
    group, users, _ = setup_env
    creator, non_creator = users[0], users[2]
    app.dependency_overrides[get_current_user] = get_current_user_override(non_creator)

    tx = Transaction(
        group_id=group.id,
        creator_id=creator.id,
        payer_id=creator.id,
        total_amount_cents=5000,
        currency="USD",
        title="Cannot edit me",
    )
    db_session.add(tx)
    db_session.commit()
    db_session.refresh(tx)

    res = client.put(f"/transactions/{tx.id}", json={"title": "Hack attempt"})
    assert res.status_code == 403

def test_delete_transaction_by_admin(client: TestClient, db_session: Session, setup_env):
    group, users, members = setup_env
    admin = users[0]
    app.dependency_overrides[get_current_user] = get_current_user_override(admin)

    tx = Transaction(
        group_id=group.id,
        creator_id=users[1].id,
        payer_id=users[1].id,
        title="Test",
        total_amount_cents="60.00",
        currency="USD",
        splits = [
            Split(user_id = users[0].id, amount_cents = "30.00"),
            Split(user_id = users[2].id, amount_cents = "30.00"),
        ]
    )
    db_session.add(tx)
    db_session.commit()
    db_session.refresh(tx)

    res = client.delete(f"/groups/{group.id}/transaction/{tx.id}")
    assert res.status_code == 204
    assert db_session.query(Transaction).filter_by(id=tx.id).first() is None


def test_delete_transaction_forbidden(client, db_session, setup_env):
    group, users, _ = setup_env
    app.dependency_overrides[get_current_user] = get_current_user_override(users[2])

    tx = Transaction(
        group_id=group.id,
        creator_id=users[0].id,
        payer_id=users[0].id,
        total_amount_cents=2500,
        currency="USD",
    )
    db_session.add(tx)
    db_session.commit()
    db_session.refresh(tx)

    res = client.delete(f"/groups/{group.id}/transaction/{tx.id}")
    assert res.status_code == 403

def test_transaction_splits_dues(client: TestClient, db_session: Session, setup_env):
    group, users, _ = setup_env
    app.dependency_overrides[get_current_user] = get_current_user_override(users[0])

    # user 1 and 2 owes user 0 30 dollar
    payload = {
        "payer_id": int(users[0].id),
        "total_amount_cents": "60.00",
        "exchange_rate_to_group": float(1.0),
        "currency": "USD",
        "title": "Dinner",
        "memo": "Testing",
        "splits": [
            {"user_id": int(users[1].id), "amount_cents": "30.00"},
            {"user_id": int(users[2].id), "amount_cents": "30.00"},
        ],
    }
    
    resp = client.post("/groups/1/transactions", json=payload)
    assert resp.status_code == 200

    # user 1 owes user 0 -270 and user 2 owes user 0 30
    payload2  = {
        "payer_id": int(users[1].id),
        "total_amount_cents": "600.00",
        "exchange_rate_to_group": float(1.0),
        "currency": "USD",
        "title": "Dinner",
        "memo": "Testing",
        "splits": [
            {"user_id": int(users[0].id), "amount_cents": "300.00"},
            {"user_id": int(users[2].id), "amount_cents": "300.00"},
        ],
    }

    resp = client.post("/groups/1/transactions", json=payload2)
    assert resp.status_code == 200

    # user 1 owes user 0 -270 and user 2 owes user 0 0 dollars
    payload3  = {
        "payer_id": int(users[2].id),
        "total_amount_cents": "60.00",
        "exchange_rate_to_group": float(1.0),
        "currency": "USD",
        "title": "Dinner",
        "memo": "Testing",
        "splits": [
            {"user_id": int(users[0].id), "amount_cents": "30.00"},
            {"user_id": int(users[1].id), "amount_cents": "30.00"},
        ],
    }

    resp = client.post("/groups/1/transactions", json=payload3)
    assert resp.status_code == 200

    resp = client.get("/groups/1/dues")
    assert resp.status_code == 200
    assert Decimal(resp.json()["dues"]["2"]) == -270
    assert Decimal(resp.json()["dues"]["3"]) == 0

def test_transaction_exchange(client: TestClient, db_session: Session, setup_env):
    group, users, _ = setup_env
    app.dependency_overrides[get_current_user] = get_current_user_override(users[0])

    payload = {
        "payer_id": int(users[0].id),
        "total_amount_cents": "60.00",
        "exchange_rate_to_group": float(2.0),
        "currency": "USD",
        "title": "Dinner",
        "memo": "Testing",
        "splits": [
            {"user_id": int(users[1].id), "amount_cents": "30.00"},
            {"user_id": int(users[2].id), "amount_cents": "30.00"},
        ],
    }
    
    resp = client.post("/groups/1/transactions", json=payload)
    assert resp.status_code == 200
    assert resp.json()["exchange_rate_to_group"] != None

    resp = client.get("/groups/1/dues")
    assert resp.status_code == 200
    # should double
    assert Decimal(resp.json()["dues"]["2"]) == Decimal("60.00")