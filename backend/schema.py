# models.py
from __future__ import annotations
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from pydantic import EmailStr
from sqlalchemy import (
    Integer, String, Boolean, DateTime, ForeignKey, Text, func, Index, event, Numeric
)
from sqlalchemy.orm import (
    DeclarativeBase, Mapped, mapped_column, relationship
)
from sqlalchemy.ext.hybrid import hybrid_property


# --- Base ---
class Base(DeclarativeBase):
    pass

# --- User and OAuth link ---
class User(Base):
    """
    Store essential information about users. Contains relationships with OAuth accounts, memberships, and transactions
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[Optional[EmailStr]] = mapped_column(String(320), unique=True, index=True, nullable=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    google_sub: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")
    deleted_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # relationships
    memberships: Mapped[List["GroupMember"]] = relationship("GroupMember", back_populates="user", cascade="all, delete-orphan")
    transactions_created: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="creator", foreign_keys="Transaction.creator_id")

    def is_deleted(self) -> bool:
        return self.deleted_at is not None or not self.is_active

    def anonymize(self):
        """
        Clear personally-identifying information while preserving the DB record and id.
        This supports the 'placeholder' requirement.
        """
        self.email = None
        self.is_active = False
        self.deleted_at = datetime.now(timezone.utc)  # type: ignore

    def __repr__(self):
        return f"<User id={self.id} email={self.email!r}>"

# --- Groups and memberships ---
class Group(Base):
    """
    Contains basic information about groups
    """
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # base currency
    base_currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="USD")

    # optional location fields (keep simple)
    location_name: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    location_lat: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)   # store as text or use geo type if needed
    location_lon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    members: Mapped[List["GroupMember"]] = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")
    transactions: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="group", cascade="all, delete-orphan")

    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")
    deleted_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)

    def archive(self) -> None:
        self.is_archived = True

    def soft_delete(self):
        self.deleted_at = datetime.now(timezone.utc)  # type: ignore

    def __repr__(self):
        return f"<Group id={self.id} name={self.name!r} desc={self.description} currency={self.base_currency} creator={self.created_by}>"

class GroupMember(Base):
    """
    Member associates to group associations
    """
    __tablename__ = "group_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, server_default="0", nullable=False)

    group: Mapped["Group"] = relationship("Group", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="memberships")

    left_at: Mapped[Optional[DateTime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ux_group_user", "group_id", "user_id", unique=True),
    )

    def leave(self):
        self.left_at = datetime.now(timezone.utc) # type: ignore

    def __repr__(self):
        return (f"<user={self.user_id} group={self.group_id} joined={self.joined_at} is_admin={self.is_admin}")

# --- Transactions and splits ---
class Transaction(Base):
    """
    Represents a single split bill inside a group.
    """
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    payer_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    creator_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    title: Mapped[str] = mapped_column(String(300), nullable=True)
    memo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # store amounts in integer "cents" to avoid floating point problems
    total_amount_cents: Mapped[Decimal] = mapped_column(Numeric(precision=18, scale=6), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=True, server_default="USD") 
    exchange_rate_to_group: Mapped[Optional[float]] = mapped_column(nullable=True)

    group: Mapped["Group"] = relationship("Group", back_populates="transactions")
    creator: Mapped[Optional["User"]] = relationship("User", back_populates="transactions_created", foreign_keys=[creator_id])
    splits: Mapped[List["Split"]] = relationship("Split", back_populates="transaction", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Transaction id={self.id} group={self.group_id} total={self.total_amount_cents}>"

class Split(Base):
    """
    Each Split row records how much a particular user owes (or is owed) for a transaction.
    Convention: positive amount_cents means this person owes that amount for the transaction.
    """
    __tablename__ = "splits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    transaction_id: Mapped[int] = mapped_column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    amount_cents: Mapped[Decimal] = mapped_column(Numeric(precision=18, scale=6), nullable=False)  # owed by user for this transaction
    is_payer: Mapped[bool] = mapped_column(Boolean, server_default="0", nullable=False) 
    note: Mapped[Optional[str]] = mapped_column(String(400), nullable=True)

    transaction: Mapped["Transaction"] = relationship("Transaction", back_populates="splits")
    user: Mapped["User"] = relationship("User")

    @hybrid_property
    def user_display_name(self) -> Optional[str]:
        """Expose the display_name of the related user."""
        return self.user.display_name if self.user else None

    __table_args__ = (
        Index("ux_transaction_user", "transaction_id", "user_id", unique=True),
    )
