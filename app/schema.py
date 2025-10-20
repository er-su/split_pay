from typing import List, Optional, Annotated
from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict

# integer cents (non-negative)
Cents = Annotated[int, Field(ge=0)]
# currency code string (simple constraint)
CurrencyCode = Annotated[str, Field(min_length=3, max_length=8)]

# ---------- AUTH / USER ----------

class UserOut(BaseModel):
    """Public user representation returned to clients."""
    id: int
    email: Optional[EmailStr] = None
    display_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TokenOut(BaseModel):
    """Auth response that contains the app-issued access token and user info."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut

    model_config = ConfigDict(from_attributes=True)


# ---------- GROUPS ----------

class CreateGroupIn(BaseModel):
    """Request body for creating a group."""
    name: Annotated[str, Field(max_length=200)]
    description: Optional[Annotated[str, Field(max_length=500)]] = None
    base_currency: CurrencyCode = "USD"
    location_name: Optional[Annotated[str, Field(max_length=300)]] = None
    location_lat: Optional[Annotated[str, Field(max_length=50)]] = None
    location_lon: Optional[Annotated[str, Field(max_length=50)]] = None

class GroupOut(BaseModel):
    """Group representation returned to clients."""
    id: int
    name: str
    description: Optional[str]
    base_currency: str
    created_by: Optional[int]

    model_config = ConfigDict(from_attributes=True)

class UpdateGroupIn(CreateGroupIn):
    """Same structure as CreateGroupIn but optional fields for PATCH."""
    name: Optional[str] = None
    base_currency: Optional[str] = None

class CreateMemberIn(BaseModel):
    user_id: int
    group_id: int

class MemberOut(BaseModel):
    user_id: Optional[int]
    display_name_snapshot: Optional[str]
    joined_at: Optional[str]
    left_at: Optional[str]
    is_admin: bool

    model_config = ConfigDict(from_attributes=True)

# ---------- TRANSACTIONS & SPLITS ----------

class SplitIn(BaseModel):
    """Input representation of a split: who pays which share (in cents)."""
    user_id: int
    share_cents: Cents


class CreateTransactionIn(BaseModel):
    """
    Request to create a transaction.

    - payer_id: the user who fronted the payment
    - total_amount_cents: integer cents in transaction currency
    - currency: currency code for this transaction
    - exchange_rate_to_group: optional historical rate (transaction -> group base)
    - splits: list of SplitIn; server will validate they are non-empty and sums are checked in service layer
    """
    payer_id: int
    total_amount_cents: Cents
    currency: CurrencyCode = "USD"
    exchange_rate_to_group: Optional[float] = None
    title: Optional[Annotated[str, Field(max_length=300)]] = None
    memo: Optional[str] = None
    splits: List[SplitIn]

    # Pydantic v2 validator for 'splits' ensures not empty
    @field_validator("splits")
    @classmethod
    def _validate_splits_nonempty(cls, v: List[SplitIn]) -> List[SplitIn]:
        if not v:
            raise ValueError("At least one split is required")
        return v


class UpdateTransactionIn(BaseModel):
    """
    Partial update payload for transactions.
    Only include fields that should change.
    """
    title: Optional[Annotated[str, Field(max_length=300)]] = None
    memo: Optional[str] = None
    total_amount_cents: Optional[Cents] = None
    splits: Optional[List[SplitIn]] = None

    @field_validator("splits")
    @classmethod
    def _validate_splits_if_provided(cls, v: Optional[List[SplitIn]]) -> Optional[List[SplitIn]]:
        if v is None:
            return v
        if not v:
            raise ValueError("splits, if provided, must contain at least one item")
        return v


class SplitOut(BaseModel):
    """Output representation for a split row."""
    user_id: int
    share_cents: int

    model_config = ConfigDict(from_attributes=True)


class TransactionOut(BaseModel):
    """Output representation for a transaction (includes splits)."""
    id: int
    group_id: int
    payer_id: int
    total_amount_cents: int
    currency: str
    exchange_rate_to_group: Optional[float]
    title: Optional[str]
    memo: Optional[str]
    splits: Optional[List[SplitOut]] = None

    model_config = ConfigDict(from_attributes=True)


# ---------- BALANCES ----------

class BalanceItem(BaseModel):
    """Net owed amount between requester and another member.
    Positive -> other_user owes requester.
    Negative -> requester owes other_user.
    """
    other_user_id: int
    net_cents: int


class BalancesOut(BaseModel):
    """Balances summary for a user within a group (returned by balances endpoint)."""
    group_id: int
    base_currency: str
    user_id: int
    balances: List[BalanceItem]

    model_config = ConfigDict(from_attributes=True)