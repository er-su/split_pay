# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.deps import get_db
from app.main import app
from backend.schema import Base


@pytest.fixture(scope="function")
def db_session():
    """Create a brand-new clean in-memory SQLite DB for each test."""
    # 1️⃣ Create an engine (new DB per test)
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )

    # 2️⃣ Establish a single connection
    connection = engine.connect()

    # 3️⃣ Bind all sessions to that connection
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)

    # 4️⃣ Create all tables in that connection
    Base.metadata.create_all(bind=connection)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        connection.close()
        engine.dispose()


@pytest.fixture(scope="function")
def client(db_session):
    """Make FastAPI use the same DB session as the test."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    yield client

    app.dependency_overrides.clear()
