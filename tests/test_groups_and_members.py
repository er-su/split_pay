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

def create_group(db: Session, user: User) -> tuple[Group, GroupMember]:
    g = Group(
        name=f"Trip Random {random.randint(0, 1000)}",
        description = "This is a test description",
        created_by = user.id,
        base_currency = "JPY"
    )

    db.add(g)
    db.commit()
    db.refresh(g)

    m = GroupMember(
        group_id=g.id,
        user_id=user.id,
        is_admin=True,
    )

    db.add(m)
    db.commit()
    db.refresh(m)

    return g, m

def add_member(db: Session, group: Group, user: User, is_admin: bool = False) -> GroupMember:
    m = GroupMember(
        group_id=group.id,
        user_id=user.id,
        is_admin=is_admin,
    )

    db.add(m)
    db.commit()
    db.refresh(m)

    return m

def test_group_creation_one_user(client, db_session):
    user = create_user(db_session)
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

def test_retriving_non_existant_group(client, db_session):
    user1 = create_user(db_session)
    app.dependency_overrides[get_current_user] = get_current_user_override(user1)

    failed_group = client.get("/groups/1")
    assert failed_group.status_code == 404

def test_deleting_non_existent_group(client, db_session):
    user1 = create_user(db_session)
    app.dependency_overrides[get_current_user] = get_current_user_override(user1)

    failed_group_delete = client.delete("/groups/1")
    assert failed_group_delete.status_code == 404

def test_editing_non_existent_group(client, db_session):
    user1 = create_user(db_session)
    app.dependency_overrides[get_current_user] = get_current_user_override(user1)

    failed_group_edit = client.put("/groups/1", json={})
    assert failed_group_edit.status_code == 404

def test_archiving_non_existent_group(client, db_session):
    user1 = create_user(db_session)
    app.dependency_overrides[get_current_user] = get_current_user_override(user1)

    failed_group_archive = client.post("/group/1/archive")
    assert failed_group_archive.status_code == 404

def test_unarchiving_non_existent_group(client, db_session):
    user1 = create_user(db_session)
    app.dependency_overrides[get_current_user] = get_current_user_override(user1)

    failed_group_unarchive = client.post("/group/1/unarchive")
    assert failed_group_unarchive.status_code == 404

def test_adding_to_non_existent_group(client, db_session):
    user1 = create_user(db_session)
    app.dependency_overrides[get_current_user] = get_current_user_override(user1)

    user2 = create_user(db_session, "test2@text.com", "tester2")
    payload = {
        "user_id": user2.id,
        "group_id": 1,
        "make_admin": True
    }
    failed_user_add = client.post("/groups/1/members", json=payload)
    assert failed_user_add.status_code == 404

def test_removing_from_non_existent_group(client, db_session):
    user1 = create_user(db_session)
    app.dependency_overrides[get_current_user] = get_current_user_override(user1)

    failed_user_delete = client.delete("/groups/1/members/2")
    assert failed_user_delete.status_code == 404

def test_retriving_non_existent_group_members(client, db_session):
    user1 = create_user(db_session)
    app.dependency_overrides[get_current_user] = get_current_user_override(user1)

    failed_group_members = client.get("/groups/3/members")
    assert failed_group_members.status_code == 404

def test_create_group_membership_on_creation(client, db_session):
    # Create a user in this test’s DB
    user = create_user(db_session, name = "tester", email="test@example.com")

    # Override the authentication dependency
    app.dependency_overrides[get_current_user] = get_current_user_override(user)

    # Call API endpoint
    payload = {
        "name": "Test Group",
        "description": "This is a test group",
        "base_currency": "JPY",
    }
    response = client.post("/groups/", json=payload)
    json = response.json()

    # Assert
    assert response.status_code == 201

    membership_resp = client.get(f"/groups/{json["id"]}/members")
    membership_json = membership_resp.json()[0]
    assert membership_resp.status_code == 200
    assert membership_json["user_id"] == user.id
    assert membership_json["group_id"] == 1
    assert membership_json["is_admin"]

def test_adding_other_user(client, db_session):
    # Create user 1 and group; assert that group was created successfully with tester 1 as main user
    user1 = create_user(db_session, "test@test.com",  "tester1")
    app.dependency_overrides[get_current_user] = get_current_user_override(user1)

    # test non-existant group
    membership_resp = client.get(f"/groups/1/all-members")
    assert membership_resp.status_code == 404
    
    create_group(db_session, user1)

    membership_resp = client.get(f"/groups/1/all-members")
    membership_json = membership_resp.json()[0]
    assert membership_resp.status_code == 200
    assert membership_json["user_id"] == user1.id
    assert membership_json["group_id"] == 1
    assert membership_json["is_admin"]

    user2 = create_user(db_session, "test2@text.com", "tester2")
    app.dependency_overrides[get_current_user] = get_current_user_override(user2)

    # Ensure that user2 is unable to add itself
    payload = {
        "user_id": user2.id,
        "group_id": 1,
        "make_admin": True
    }
    mem_resp = client.post("/groups/1/members", json=payload)
    assert mem_resp.status_code == 403

    # switch back to user 1 who is admin and invite user 2 as non admin
    app.dependency_overrides[get_current_user] = get_current_user_override(user1)
    mem_resp = client.post("/groups/1/members", json=payload)

    assert mem_resp.status_code == 200
    mem_resp = client.get("groups/1/members")
    assert(len(mem_resp.json()) == 2)

    # try adding a user that is already a member
    dup_resp = client.post("/groups/1/members", json=payload)
    assert dup_resp.status_code == 400

    #try adding a user that doesn't exist
    payload = {
        "user_id": 7,
        "group_id": 1,
        "make_admin": True
    }
    non_existant = client.post("groups/1/members", json=payload)
    assert non_existant.status_code == 404

def test_removing_other_user(client, db_session):
    user1 = create_user(db_session, "test@test.com",  "tester1")
    user2 = create_user(db_session, "test2@text.com", "tester2")
    
    app.dependency_overrides[get_current_user] = get_current_user_override(user1)

    group, _ = create_group(db_session, user1)

    # test removing a user that is not part of the group
    failed_resp = client.delete("/groups/1/members/2")
    assert failed_resp.status_code == 404

    add_member(db_session, group, user2, is_admin = False)
    success_resp = client.delete("/groups/1/members/2")
    assert success_resp.status_code == 204
    check_resp = client.get("/groups/1/members")
    check_all = client.get("/groups/1/all-members")
    assert len(check_resp.json()) == 1
    assert len(check_all.json()) == 2
  
def test_edit_group_info(client, db_session):
    user1 = create_user(db_session, "test@test.com",  "tester1")
    user2 = create_user(db_session, "test2@text.com", "tester2")

    app.dependency_overrides[get_current_user] = get_current_user_override(user1)

    group = create_group(db_session, user1)

    # empty payload means no edits basically
    payload = {}
    resp = client.put("groups/1", json=payload)
    unchanged_group = client.get("groups/1")

    assert resp.status_code < 300
    assert unchanged_group.status_code < 300
    assert(resp.json() == unchanged_group.json())

    # try changing one field only
    payload = {
        "name": "new edited name"
    }

    resp = client.put("groups/1", json=payload)
    changed_name_group = client.get("groups/1")

    assert resp.status_code < 300
    assert changed_name_group.status_code < 300
    assert(resp.json()["name"] == "new edited name")
    assert(resp.json()["description"] == changed_name_group.json()["description"])

    # try changing all fields
    payload = {
        "name": "new edited name",
        "description": "new edited description",
        "base_currency": "NTD"
    }

    resp = client.put("groups/1", json=payload)
    changed_name_group = client.get("groups/1")

    assert resp.status_code < 300
    assert changed_name_group.status_code < 300
    assert(resp.json()["name"] == "new edited name")
    assert(resp.json()["description"] == "new edited description")
    assert(resp.json()["base_currency"] == "NTD")

def test_archive_unarchive_system(client, db_session):
    user1 = create_user(db_session, "test@test.com",  "tester1")
    user2 = create_user(db_session, "test2@text.com", "tester2")

    app.dependency_overrides[get_current_user] = get_current_user_override(user1)

    group = create_group(db_session, user1)
    payload = {
        "user_id": user2.id,
        "group_id": 1,
        "make_admin": False
    }

    mem_resp = client.post("/groups/1/members", json=payload)
    assert(mem_resp.status_code == 200)
    
    # try archiving the group as non-admin (should fail)
    app.dependency_overrides[get_current_user] = get_current_user_override(user2)
    failed_archive_resp = client.post("groups/1/archive")
    assert failed_archive_resp.status_code == 403

    # now try archiving as admin
    app.dependency_overrides[get_current_user] = get_current_user_override(user1)
    success_archive_resp = client.post("groups/1/archive")
    assert success_archive_resp.status_code == 204

    # test archive ops dont work
    user3 = create_user(db_session, "test3@text.com", "tester3")
    failed_add = client.post("groups/1/members", json={
        "user_id": user3.id,
        "make_admin": False
    })
    assert failed_add.status_code == 403
    
    failed_remove = client.delete("groups/1/members/2")
    assert failed_remove.status_code == 403

    failed_update = client.put("/groups/1", json={})
    assert failed_update.status_code == 403

    # now try unarchiving as non admin
    app.dependency_overrides[get_current_user] = get_current_user_override(user2)
    failed_unarchive_resp = client.post("groups/1/unarchive")
    assert failed_unarchive_resp.status_code == 403

    app.dependency_overrides[get_current_user] = get_current_user_override(user1)
    success_unarchive_resp = client.post("groups/1/unarchive")
    assert success_unarchive_resp.status_code == 204
