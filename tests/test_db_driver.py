import pytest
from sqlalchemy.orm import sessionmaker
from backend.db_driver import create_group, create_transaction_with_splits, get_group_member_net_balances, make_engine
from backend.schema import Base, User, Group, Transaction, Split


# Utility Methods

@pytest.fixture(scope="function")
def db_session():
    """Create a temporary SQLite DB and yield a SQLAlchemy session."""
    engine = make_engine("sqlite+pysqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    db = TestingSessionLocal()
    yield db
    db.close()
    engine.dispose()


def create_users(db, count=3):
    """Utility to create mock users quickly."""
    users = []
    for i in range(count):
        user = User(email=f"user{i}@example.com", display_name=f"User {i}")
        db.add(user)
        users.append(user)
    db.commit()
    return users


# Tests

def test_create_group_basic(db_session):
    """Ensure a group is created correctly with defaults."""
    users = create_users(db_session, 1)
    creator = users[0]

    group = create_group(
        db=db_session,
        name="Weekend Trip",
        creator_id=creator.id,
        base_currency="USD",
        description="Trip to the beach",
        location_name="Santa Monica"
    )

    assert isinstance(group, Group)
    assert group.id is not None
    assert group.name == "Weekend Trip"
    assert group.base_currency == "USD"
    assert group.created_by == creator.id


def test_create_transaction_with_splits_valid(db_session):
    """Ensure a transaction and its splits persist correctly."""
    users = create_users(db_session, 3)
    group = create_group(db_session, "Dinner", users[0].id)

    tx = create_transaction_with_splits(
        db=db_session,
        group_id=group.id,
        creator_id=users[0].id,
        payer_id=users[0].id,
        total_amount_cents=9000,
        currency="USD",
        splits=[
            {"user_id": users[0].id, "share_cents": 3000},
            {"user_id": users[1].id, "share_cents": 3000},
            {"user_id": users[2].id, "share_cents": 3000},
        ],
        title="Dinner at Grill House",
    )

    assert isinstance(tx, Transaction)
    assert tx.id is not None
    assert tx.total_amount_cents == 9000
    assert tx.currency == "USD"

    splits = db_session.query(Split).filter_by(transaction_id=tx.id).all()
    assert len(splits) == 3
    payer_split = [s for s in splits if s.is_payer]
    assert len(payer_split) == 1 and payer_split[0].user_id == users[0].id


def test_create_transaction_with_invalid_split_sum(db_session):
    """Ensure mismatched split totals raise ValueError."""
    users = create_users(db_session, 2)
    group = create_group(db_session, "Mismatch Test", users[0].id)

    with pytest.raises(ValueError):
        create_transaction_with_splits(
            db=db_session,
            group_id=group.id,
            creator_id=users[0].id,
            payer_id=users[0].id,
            total_amount_cents=1000,
            currency="USD",
            splits=[
                {"user_id": users[0].id, "share_cents": 700},
                {"user_id": users[1].id, "share_cents": 100},
            ],
        )


def test_get_group_member_net_balances_basic(db_session):
    """Verify per-user balances in a simple scenario."""
    users = create_users(db_session, 3)
    group = create_group(db_session, "Road Trip", users[0].id)

    # Transaction 1: user0 pays $90 split evenly (user1, user2 owe user0)
    create_transaction_with_splits(
        db=db_session,
        group_id=group.id,
        creator_id=users[0].id,
        payer_id=users[0].id,
        total_amount_cents=9000,
        currency="USD",
        splits=[
            {"user_id": users[0].id, "share_cents": 3000},
            {"user_id": users[1].id, "share_cents": 3000},
            {"user_id": users[2].id, "share_cents": 3000},
        ],
    )

    # Transaction 2: user1 pays $60 split evenly
    create_transaction_with_splits(
        db=db_session,
        group_id=group.id,
        creator_id=users[1].id,
        payer_id=users[1].id,
        total_amount_cents=6000,
        currency="USD",
        splits=[
            {"user_id": users[0].id, "share_cents": 2000},
            {"user_id": users[1].id, "share_cents": 2000},
            {"user_id": users[2].id, "share_cents": 2000},
        ],
    )

    # Dummy exchange rate fetcher (1.0 = same currency)
    get_rate = lambda tx: 1.0

    # Compute balances for each user
    balances_user0 = get_group_member_net_balances(db_session, group.id, users[0].id, get_rate)
    balances_user1 = get_group_member_net_balances(db_session, group.id, users[1].id, get_rate)
    balances_user2 = get_group_member_net_balances(db_session, group.id, users[2].id, get_rate)

    # Expected results in USD dollars:
    # User0: +40, User1: +10, User2: -50 (sum zero)
    assert round(sum(balances_user0.values()) - 4000) == 0 # fails
    assert round(sum(balances_user1.values()) - 1000) == 0
    assert round(sum(balances_user2.values()) + 5000) == 0


def test_get_group_member_net_balances_with_conversion(db_session):
    """Ensure conversion rates apply correctly."""
    users = create_users(db_session, 2)
    group = create_group(db_session, "International", users[0].id, base_currency="USD")

    # Transaction: user0 pays ¥12000 for both users (split 50/50)
    create_transaction_with_splits(
        db=db_session,
        group_id=group.id,
        creator_id=users[0].id,
        payer_id=users[0].id,
        total_amount_cents=12000,
        currency="JPY",
        splits=[
            {"user_id": users[0].id, "share_cents": 6000},
            {"user_id": users[1].id, "share_cents": 6000},
        ],
    )

    # Conversion rate (JPY → USD): 0.007
    def fake_rate(tx):
        return 0.007

    balances = get_group_member_net_balances(db_session, group.id, users[0].id, fake_rate)
    # user1 owes user0: 6000 * 0.007 = 42 USD cents
    expected = int(round(6000 * 0.007))
    assert balances[users[1].id] == expected
