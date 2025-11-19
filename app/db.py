# app/db.py
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.schema import Base

# Make DB path stable and absolute
BASE_DIR = Path(__file__).resolve().parent  # .../split_play/app
DB_PATH = BASE_DIR / "dev.db"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Bind sessions to the ENGINE, not a single Connection
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    future=True,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)




# app/db.py
# import os
# from pathlib import Path
# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker, DeclarativeBase
# from backend.schema import Base
# BASE_DIR = Path(__file__).resolve().parent  # .../split_play/app
# DB_PATH = BASE_DIR / "dev.db"

# DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
# connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# # Use DATABASE_URL env var, default to SQLite file for dev
# DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
# # connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
# # engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True, pool_pre_ping=True)
# # connection = engine.connect()
# # SessionLocal = sessionmaker(bind=connection, autoflush=False, autocommit=False, expire_on_commit=False)
