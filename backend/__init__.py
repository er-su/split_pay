# backend/__init__.py

# Expose modules so that tests can import like:
# from backend.db_driver import create_group, ...
# from backend.schema import Base, User, ...

from . import db_driver
from . import schema

# Optional: make everything directly available at package level
# Only do this if you want 'from backend import create_group' to work
from .db_driver import (
    create_group,
    create_transaction_with_splits,
    get_group_member_net_balances,
    make_engine,
)
from .schema import Base, User, Group, Transaction, Split
