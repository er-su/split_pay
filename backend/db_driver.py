# db.py
from sqlalchemy import create_engine, event, select, func, case
from sqlalchemy.orm import sessionmaker, Session
from .schema import Group, Transaction, Split
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict

def make_engine(url: str, **kwargs):
    """
    Example urls:
      - sqlite (file): 'sqlite:///./test.db'
      - sqlite (memory): 'sqlite+pysqlite:///:memory:'
      - postgres: 'postgresql+psycopg2://user:pass@host/db'
    """
    engine = create_engine(url, future=True, echo=kwargs.pop("echo", False), **kwargs)

    # IMPORTANT for SQLite: enable foreign keys on each connection
    # SQLite requires PRAGMA foreign_keys = ON per connection to actually enforce constraints.

    if url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, connection_record):
            try:
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA foreign_keys = ON")
                cursor.close()
            except Exception:
                # some DBAPIs may not expose cursor the same way; ignore and let app handle it
                pass

    return engine

def create_group(db: Session, name: str, creator_id: int | None, base_currency: str = "USD",
                 description: str | None = None, location_name: str | None = None) -> Group:
    g = Group(
        name=name,
        description=description,
        created_by=creator_id,
        base_currency=(base_currency or "USD"),
        location_name=location_name
    )
    db.add(g)
    db.commit()
    db.refresh(g)
    return g


def create_transaction_with_splits(
    db: Session,
    group_id: int,
    creator_id: int | None,
    payer_id: int,
    total_amount_cents: int,
    currency: str,
    splits: list[dict],  # each: {"user_id": int, "share_cents": int}
    exchange_rate_to_group: float | None = None,
    title: str | None = None,
    memo: str | None = None
) -> Transaction:
    """
    Creates a Transaction plus Split rows in a single DB transaction.
    `splits` must sum to total_amount_cents (server should validate).
    """
    # validation (raise exceptions or return errors from API)
    sum_shares = sum(int(s["share_cents"]) for s in splits)
    if sum_shares != int(total_amount_cents):
        raise ValueError("splits must sum to total_amount_cents")

    tx = Transaction(
        group_id=group_id,
        creator_id=creator_id,
        total_amount_cents=int(total_amount_cents),
        currency=currency,
        exchange_rate_to_group=exchange_rate_to_group,
        title=title,
        memo=memo
    )
    db.add(tx)
    db.flush()  # get tx.id

    for s in splits:
        is_payer = (s["user_id"] == payer_id)
        split = Split(
            transaction_id=tx.id,
            user_id=s["user_id"],
            amount_cents=int(s["share_cents"]),
            is_payer=is_payer
        )
        db.add(split)

    db.commit()
    db.refresh(tx)
    return tx

def get_group_member_net_balances(db: Session, group_id: int, user_id: int,
                                  get_rate_for_tx: callable) -> Dict[int, int]: # type: ignore
    """
    Returns a dict mapping other_user_id -> net_amount_cents_in_group_currency.
    Positive value => other_user owes this user (they owe you).
    Negative value => this user owes other_user.
    get_rate_for_tx(transaction_row) -> float: conversion multiplier to convert tx.amount_cents -> group_cents.
    """

    # 1) Load transactions + splits + payer info for the group.
    #    We'll fetch transactions and their splits and then compute net per other user in Python,
    #    because conversion uses potentially external rates and rounding rules.

    txs = db.execute(
        select(
            Transaction.id,
            Transaction.currency,
            Transaction.total_amount_cents,
            Transaction.exchange_rate_to_group,
            Transaction.group_id,
            Transaction.creator_id,
            Transaction.created_at,
            Transaction.group_id
        ).where(Transaction.group_id == group_id)
    ).all()

    # Eagerly fetch splits for those transactions
    tx_ids = [t.id for t in txs]
    splits = db.execute(
        select(Split.transaction_id, Split.user_id, Split.amount_cents, Split.is_payer)
        .where(Split.transaction_id.in_(tx_ids))
    ).all()

    # For convenience, build mapping tx_id -> splits list
    tx_splits: Dict[int, list] = {}
    for row in splits:
        tx_splits.setdefault(row.transaction_id, []).append({
            "user_id": row.user_id,
            "amount_cents": row.amount_cents,
            "is_payer": row.is_payer
        })

    # Map to store balances: other_user_id -> cents (positive => other owes user_id)
    balances: Dict[int, int] = {}

    # For each transaction, determine payer(s). For simplicity assume exactly one is_payer True.
    for t in txs:
        tx_id = t.id
        tx_rate = t.exchange_rate_to_group
        # If stored rate missing, call get_rate_for_tx(tx) to fetch a rate (caller-provided).
        if tx_rate is None:
            tx_rate = get_rate_for_tx(t)
        # conversion function: tx cents -> group cents
        def convert(cents: int) -> int:
            # careful rounding: round half up
            return int(Decimal(cents * Decimal(tx_rate)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

        splits_for_tx = tx_splits.get(tx_id, [])
        # find payer_id (first where is_payer)
        payer_row = next((s for s in splits_for_tx if s["is_payer"]), None)
        if payer_row is None:
            # no payer indicated: skip or treat as unknown — here we skip
            continue
        payer_id = payer_row["user_id"]

        # For each split in transaction, build pair-wise effect vs payer.
        for s in splits_for_tx:
            participant_id = s["user_id"]
            if participant_id == payer_id:
                continue  # payer doesn't owe themselves

            converted = convert(s["amount_cents"])

            if participant_id == user_id and payer_id != user_id:
                # user owes payer => this is part of "you owe them"
                # We represent net as positive for other_user owing you, so subtract here
                balances.setdefault(payer_id, 0)
                balances[payer_id] -= converted  # negative means you owe them
            elif payer_id == user_id and participant_id != user_id:
                # other participant owes you
                balances.setdefault(participant_id, 0)
                balances[participant_id] += converted  # positive means they owe you
            else:
                # pair doesn't involve user_id; ignore for per-user balances
                pass

    # balances now: for each other_user_id -> positive=they owe you; negative=you owe them
    return balances
