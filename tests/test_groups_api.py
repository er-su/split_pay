# Still working on some issues in the tests

import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

# import the router module the user uploaded
from app.routers import groups as groups_router_module  # the uploaded file groups.py exposes `router`

# import backend models (user/group/member) and Base for schema
from backend.schema import Base, User, Group, GroupMember

# We'll override the dependencies get_db and get_current_user used in groups.py.
# groups.py imports get_db, get_current_user from app.deps at module import time.
# We'll provide dependency overrides to the TestClient app.

TEST_SQLITE_URL = "sqlite://"
engine = create_engine(TEST_SQLITE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
Base.metadata.create_all(bind=engine)

@pytest.fixture()
def db_session():
    """Yield a SQLAlchemy session bound to the shared test engine."""
    session = TestingSessionLocal()
    # Seed base users (id=0 for get_current_user)
    user0 = User(id=0, email="user0@example.com", display_name="User Zero")
    session.add(user0)
    session.commit()
    yield session
    session.close()

@pytest.fixture()
def client(db_session):
    """Create a FastAPI TestClient that uses the test DB session."""
    # Override get_db to use the same session/engine
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_get_current_user():
        return db_session.get(User, 0)

    app.dependency_overrides.clear()
    app.dependency_overrides.update({
        # use string name or function ref depending on how you import
        "get_db": override_get_db,
        "get_current_user": override_get_current_user,
    })

    with TestClient(app) as c:
        yield c

# -------------------------
# Helper functions for tests
# -------------------------
def create_group_payload(name="Test Group", base_currency="USD"):
    return {
        "name": name,
        "description": "A test group",
        "base_currency": base_currency,
        "location_name": None,
        "location_lat": None,
        "location_lon": None,
    }

# -------------------------
# Tests
# -------------------------
def test_create_and_get_group_happy_path(client, db_session):
    session, _ = db_session
    # create a group
    resp = client.post("/groups/", json=create_group_payload("G1"))
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["id"] is not None
    group_id = data["id"]

    # current_user (id=0) should be a member; retrieving group should succeed
    resp = client.get(f"/groups/{group_id}")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["name"] == "G1"
    # ensure group exists in DB and member row created
    gm = session.query(GroupMember).filter_by(group_id=group_id, user_id=0).first()
    assert gm is not None
    assert gm.is_admin is True

def test_non_member_cannot_get_group(client, db_session):
    session, _ = db_session
    # create group using user 0
    resp = client.post("/groups/", json=create_group_payload("Private"))
    group_id = resp.json()["id"]

    # Simulate a different caller by overriding dependency temporarily
    def other_user():
        return session.query(User).filter(User.email == "user1@example.com").first()
    client.app.dependency_overrides[groups_router_module.get_current_user] = other_user

    # user1 is not a member -> should get 403
    r = client.get(f"/groups/{group_id}")
    assert r.status_code == 403

    # restore default current_user
    def default_user():
        return session.get(User, 0)
    client.app.dependency_overrides[groups_router_module.get_current_user] = default_user

def test_update_group_requires_admin_and_not_archived(client, db_session):
    session, _ = db_session
    r = client.post("/groups/", json=create_group_payload("Updatable"))
    gid = r.json()["id"]

    # Non-admin attempt: use user1
    def user1():
        return session.query(User).filter(User.email == "user1@example.com").first()
    client.app.dependency_overrides[groups_router_module.get_current_user] = user1

    # Attempt to patch -> should be 403 because not admin
    patch_payload = {"description": "new desc"}
    r = client.patch(f"/groups/{gid}", json=patch_payload)
    assert r.status_code == 403

    # Restore admin user (id 0)
    def user0():
        return session.get(User, 0)
    client.app.dependency_overrides[groups_router_module.get_current_user] = user0

    # Archive the group first, then attempting to update should return 403 due to enforce_archive in update_group
    r = client.post(f"/groups/{gid}/archive")
    assert r.status_code == 204
    # Now update should fail with 403
    r = client.patch(f"/groups/{gid}", json=patch_payload)
    assert r.status_code == 403

    # Unarchive and then update should succeed
    r = client.post(f"/groups/{gid}/unarchive")
    assert r.status_code == 204
    r = client.patch(f"/groups/{gid}", json=patch_payload)
    assert r.status_code == 200
    assert r.json()["description"] == "new desc"

def test_archive_unarchive_permissions(client, db_session):
    session, _ = db_session
    r = client.post("/groups/", json=create_group_payload("Arch Group"))
    gid = r.json()["id"]

    # user1 try archive -> forbidden
    def user1():
        return session.query(User).filter(User.email == "user1@example.com").first()
    client.app.dependency_overrides[groups_router_module.get_current_user] = user1
    r = client.post(f"/groups/{gid}/archive")
    assert r.status_code == 403

    # user0 (admin) archives
    def user0():
        return session.get(User, 0)
    client.app.dependency_overrides[groups_router_module.get_current_user] = user0
    r = client.post(f"/groups/{gid}/archive")
    assert r.status_code == 204

    # unarchive by non-admin -> should be 403
    client.app.dependency_overrides[groups_router_module.get_current_user] = user1
    r = client.post(f"/groups/{gid}/unarchive")
    assert r.status_code == 403

    # unarchive by admin
    client.app.dependency_overrides[groups_router_module.get_current_user] = user0
    r = client.post(f"/groups/{gid}/unarchive")
    assert r.status_code == 204

def test_add_member_and_list(client, db_session):
    session, _ = db_session
    r = client.post("/groups/", json=create_group_payload("Members Group"))
    gid = r.json()["id"]

    # Add user1 as member by admin (user0)
    payload = {"user_id": session.query(User).filter(User.email == "user1@example.com").first().id, "make_admin": False}
    r = client.post(f"/groups/{gid}/members", json=payload)
    assert r.status_code == 200
    j = r.json()
    assert j["user_id"] is not None

    # Adding same user again should return 400
    r = client.post(f"/groups/{gid}/members", json=payload)
    assert r.status_code == 400

    # List members should include both user0 and user1
    r = client.get(f"/groups/{gid}/members")
    assert r.status_code == 200
    arr = r.json()
    ids = {m["user_id"] for m in arr}
    assert 0 in ids

def test_add_member_user_not_found(client, db_session):
    session, _ = db_session
    r = client.post("/groups/", json=create_group_payload("G-notfound"))
    gid = r.json()["id"]

    # try to add user id that doesn't exist
    payload = {"user_id": 9999, "make_admin": False}
    r = client.post(f"/groups/{gid}/members", json=payload)
    assert r.status_code == 404

def test_reactivate_member_after_leave_and_remove_member_edgecases(client, db_session):
    session, _ = db_session
    r = client.post("/groups/", json=create_group_payload("Rejoin"))
    gid = r.json()["id"]

    user1 = session.query(User).filter(User.email == "user1@example.com").first()
    # add user1
    payload = {"user_id": user1.id, "make_admin": False}
    r = client.post(f"/groups/{gid}/members", json=payload)
    assert r.status_code == 200

    # remove user1 (admin removes)
    r = client.delete(f"/groups/{gid}/members/{user1.id}")
    assert r.status_code == 204

    # remove again -> membership not found
    r = client.delete(f"/groups/{gid}/members/{user1.id}")
    assert r.status_code == 404

    # re-add user1 -> should reactivate membership
    r = client.post(f"/groups/{gid}/members", json=payload)
    assert r.status_code == 200

def test_last_member_leaving_deletes_group_soft(client, db_session):
    session, _ = db_session
    # create a group where only user0 is member
    r = client.post("/groups/", json=create_group_payload("Solo"))
    gid = r.json()["id"]

    # user0 leaves (self-call)
    def user0():
        return session.get(User, 0)
    client.app.dependency_overrides[groups_router_module.get_current_user] = user0

    r = client.delete(f"/groups/{gid}/members/0")
    assert r.status_code == 204

    # group should now be soft-deleted -> attempts to get should return 404
    r = client.get(f"/groups/{gid}")
    assert r.status_code == 404

def test_soft_and_hard_delete_endpoints(client, db_session):
    session, _ = db_session
    # create group
    r = client.post("/groups/", json=create_group_payload("DelTest"))
    gid = r.json()["id"]

    # try soft delete as non-admin (simulate user1)
    def user1():
        return session.query(User).filter(User.email == "user1@example.com").first()
    client.app.dependency_overrides[groups_router_module.get_current_user] = user1
    r = client.delete(f"/groups/{gid}")
    assert r.status_code == 403

    # admin can soft delete
    def user0():
        return session.get(User, 0)
    client.app.dependency_overrides[groups_router_module.get_current_user] = user0
    r = client.delete(f"/groups/{gid}")
    assert r.status_code == 204

    # recreate another group and hard delete
    r2 = client.post("/groups/", json=create_group_payload("DelTest2"))
    gid2 = r2.json()["id"]
    # hard delete param ?hard=true
    r = client.delete(f"/groups/{gid2}?hard=true")
    assert r.status_code == 204
    # after hard delete, get returns 404
    r = client.get(f"/groups/{gid2}")
    assert r.status_code == 404

def test_cannot_act_on_deleted_group(client, db_session):
    session, _ = db_session
    r = client.post("/groups/", json=create_group_payload("ToDelete"))
    gid = r.json()["id"]

    # admin soft delete
    def user0():
        return session.get(User, 0)
    client.app.dependency_overrides[groups_router_module.get_current_user] = user0
    r = client.delete(f"/groups/{gid}")
    assert r.status_code == 204

    # now attempts to update should yield 404
    r = client.patch(f"/groups/{gid}", json={"description": "x"})
    assert r.status_code == 404

    # adding members should 404
    r = client.post(f"/groups/{gid}/members", json={"user_id": 1, "make_admin": False})
    assert r.status_code == 404
