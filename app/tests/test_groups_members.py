from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from ..main import app
from ..deps import get_db, get_current_user
from .. import schema as APImodels
from backend import schema as models
import random
from backend.schema import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

connection = engine.connect()

# 2️⃣ Bind a new sessionmaker to this engine
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)

# 3️⃣ Create all tables using the same Base
Base.metadata.create_all(bind=connection)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def get_current_user_override(user: models.User):
    def _get_current_user():
        return user
    return _get_current_user

def create_user(db: Session, email="a@x.com", name="Alice") -> models.User:
    u = models.User(email=email, display_name=name, google_sub=email)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

def create_group(db: Session, user: models.User) -> tuple[models.Group, models.GroupMember]:
    g = models.Group(
        name=f"Trip Random {random.randint(0, 1000)}",
        description = "This is a test description",
        created_by = user.id,
        base_currency = "JPY"
    )

    db.add(g)
    db.commit()
    db.refresh(g)

    m = models.GroupMember(
        group_id=g.id,
        user_id=user.id,
        is_admin=True,
    )

    db.add(m)
    db.commit()
    db.refresh(m)

    return g, m

def add_member(db: Session, group: models.Group, user: models.User, is_admin: bool = False) -> models.GroupMember:
    m = models.GroupMember(
        group_id=group.id,
        user_id=user.id,
        is_admin=is_admin,
    )

    db.add(m)
    db.commit()
    db.refresh(m)

    return m

""" def test_group_creation_one_user():
    db = get_db().__next__()
    user = create_user(db)
    app.dependency_overrides[get_current_user] = get_current_user_override(user)
    payload = {
        "name": "Test Group",
        "description": "This is a test group",
        "base_currency": "JPY",
    }
    r = client.post("/groups/", json=payload)
    r_json = r.json()

    assert r.status_code == 201
    assert (
        r_json == {
            "id": 1,
            "name": "Test Group",
            "description": "This is a test group",
            "base_currency": "JPY",
            "created_by": user.id,
            "location_name": None
        }
    )

    r = client.get("/groups/1")
    assert r.status_code == 200
    assert(r_json == r.json())

def test_group_member_when_creation():
    pass """