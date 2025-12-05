"""
User-facing API endpoints for code redemption and credits.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, RedemptionCode
from auth import get_current_user
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/api/codes", tags=["codes"])


class RedeemRequest(BaseModel):
    code: str


class RedeemResponse(BaseModel):
    message: str
    credits_added: int
    new_balance: int


class CreditsResponse(BaseModel):
    credits: int


@router.post("/redeem", response_model=RedeemResponse)
async def redeem_code(
    request: RedeemRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """Redeem a code to add credits to user's account."""
    
    # Find the code
    code_query = await db.execute(
        select(RedemptionCode).where(RedemptionCode.code == request.code.strip().upper())
    )
    code = code_query.scalar_one_or_none()
    
    if not code:
        raise HTTPException(status_code=404, detail="Invalid code")
    
    if code.redeemed_by:
        raise HTTPException(status_code=400, detail="Code has already been redeemed")
    
    # Find or create user
    user_query = await db.execute(select(User).where(User.id == user_id))
    user = user_query.scalar_one_or_none()
    
    if not user:
        # Create user if doesn't exist (Clerk user first time)
        user = User(id=user_id, credits=3)  # Default 3 credits
        db.add(user)
        await db.flush()
    
    # Add credits and mark code as redeemed
    old_balance = user.credits
    user.credits += code.credits
    code.redeemed_by = user_id
    code.redeemed_at = datetime.utcnow()
    
    await db.commit()
    
    return RedeemResponse(
        message=f"Successfully redeemed {code.credits} credits!",
        credits_added=code.credits,
        new_balance=user.credits
    )


@router.get("/balance", response_model=CreditsResponse)
async def get_credits(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """Get current credit balance for the user."""
    print(f"[DEBUG] get_credits called for user_id: {user_id}")
    
    user_query = await db.execute(select(User).where(User.id == user_id))
    user = user_query.scalar_one_or_none()
    
    if not user:
        print(f"[DEBUG] User not found, returning default 3 credits")
        return CreditsResponse(credits=3)  # Default for new users
    
    print(f"[DEBUG] User found with credits: {user.credits}")
    return CreditsResponse(credits=user.credits)
