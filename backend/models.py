from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.sql import func
import enum
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)  # Clerk user ID
    email = Column(String, unique=True, index=True)
    credits = Column(Integer, default=3)
    is_admin = Column(Integer, default=0)  # 1 = admin, 0 = regular user
    stripe_customer_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    amount = Column(Integer)  # Amount in cents
    credits_added = Column(Integer)
    stripe_payment_id = Column(String, nullable=True)
    status = Column(String, default=TransactionStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)  # Clerk user ID
    status = Column(String, default=JobStatus.PENDING)
    input_key = Column(String)
    output_key = Column(String, nullable=True)
    quality = Column(String, default="lama")
    cost = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# Credit cost by quality mode
CREDIT_COSTS = {
    "lama": 1,      # Fast mode
    "e2fgvi": 2,    # HQ mode (costs more GPU time)
}


class CreditPack(Base):
    __tablename__ = "credit_packs"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)  # "Starter", "Pro", "Business"
    credits = Column(Integer)
    price_usd = Column(Integer)  # In cents (e.g., 499 = $4.99)
    price_cny = Column(Integer)  # In fen (e.g., 2900 = ¥29)
    is_active = Column(Integer, default=1)  # 1 = active, 0 = disabled


class RedemptionCode(Base):
    __tablename__ = "redemption_codes"

    code = Column(String, primary_key=True, index=True)
    credits = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    redeemed_by = Column(String, nullable=True)  # User ID who redeemed
    redeemed_at = Column(DateTime(timezone=True), nullable=True)
