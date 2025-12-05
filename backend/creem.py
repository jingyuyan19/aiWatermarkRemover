"""
Creem.io Payment Integration

API client and checkout endpoints for Creem payments.
Docs: https://docs.creem.io
"""
import os
import httpx
import hmac
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, Transaction, TransactionStatus
from auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/checkout", tags=["checkout"])

# Creem API Configuration
CREEM_API_KEY = os.getenv("CREEM_API_KEY", "")
CREEM_WEBHOOK_SECRET = os.getenv("CREEM_WEBHOOK_SECRET", "")

# Auto-detect mode from API key (test keys start with "creem_test_")
IS_TEST_MODE = CREEM_API_KEY.startswith("creem_test_")
CREEM_API_BASE = "https://test-api.creem.io" if IS_TEST_MODE else "https://api.creem.io"

# Product IDs for test mode
# Product IDs for test mode
TEST_PRODUCTS = {
    "starter": "prod_25ZRAEkjfifH9r0WqeMde0",
    "pro": "prod_5euy2kShfEXksFG95N38D7",
    "business": "prod_5IG21BXTdZBPPiyRG8YiIj",
}

# Product IDs for production mode
PROD_PRODUCTS = {
    "starter": "prod_4Td5DJ6bdEJinPqMMfzNwv",
    "pro": "prod_1KzJcjxSHC65ltt5k1APGf",
    "business": "prod_3ZwG5TN8ch8gprp2lyQhYz",
}

# Select based on mode
PRODUCT_IDS = TEST_PRODUCTS if IS_TEST_MODE else PROD_PRODUCTS

# Credit packs configuration
CREDIT_PACKS = {
    "starter": {
        "credits": 10,
        "price_usd": 499,  # in cents
    },
    "pro": {
        "credits": 50,
        "price_usd": 1999,
    },
    "business": {
        "credits": 200,
        "price_usd": 5999,
    },
}


class CreemCheckoutRequest(BaseModel):
    pack: str  # "starter", "pro", "business"


class CreemCheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


@router.post("/creem", response_model=CreemCheckoutResponse)
async def create_creem_checkout(
    request: CreemCheckoutRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """Create a Creem checkout session for credit purchase."""
    
    if request.pack not in CREDIT_PACKS:
        raise HTTPException(status_code=400, detail="Invalid pack")
    
    pack = CREDIT_PACKS[request.pack]
    product_id = PRODUCT_IDS.get(request.pack)
    
    if not product_id:
        raise HTTPException(status_code=500, detail="Creem product not configured")
    
    if not CREEM_API_KEY:
        raise HTTPException(status_code=500, detail="Creem API key not configured")
    
    print(f"[Creem] Mode: {'TEST' if IS_TEST_MODE else 'PRODUCTION'}, API: {CREEM_API_BASE}")
    print(f"[Creem] Creating checkout for pack: {request.pack}, product: {product_id}")
    
    # Get user email for pre-filling checkout
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    user_email = user.email if user else None
    
    # Create transaction record
    transaction_id = str(uuid.uuid4())
    transaction = Transaction(
        id=transaction_id,
        user_id=user_id,
        amount=pack["price_usd"],
        credits_added=pack["credits"],
        status=TransactionStatus.PENDING
    )
    db.add(transaction)
    await db.commit()
    
    # Get frontend URL for success redirect
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    success_url = f"{frontend_url}/en/dashboard?payment=success&credits={pack['credits']}"
    
    # Create Creem checkout session
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{CREEM_API_BASE}/v1/checkouts",
                headers={
                    "x-api-key": CREEM_API_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "product_id": product_id,
                    "success_url": success_url,
                    "metadata": {
                        "user_id": user_id,
                        "transaction_id": transaction_id,
                        "pack": request.pack,
                        "credits": pack["credits"]
                    },
                    "customer": {
                        "email": user_email
                    } if user_email else None
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                print(f"Creem API error: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to create checkout session")
            
            data = response.json()
            
            return CreemCheckoutResponse(
                checkout_url=data["checkout_url"],
                session_id=data["id"]
            )
            
        except httpx.RequestError as e:
            print(f"Creem request error: {e}")
            raise HTTPException(status_code=500, detail="Payment service unavailable")


def verify_creem_webhook(payload: bytes, signature: str) -> bool:
    """Verify Creem webhook signature."""
    if not CREEM_WEBHOOK_SECRET:
        return False
    
    secret = CREEM_WEBHOOK_SECRET.strip()
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)


@router.post("/creem/webhook")
async def handle_creem_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Creem webhook events."""
    
    body = await request.body()
    
    signature = request.headers.get("creem-signature", "")
    
    # Verify signature (skip in development if no secret configured)
    if CREEM_WEBHOOK_SECRET:
        if not verify_creem_webhook(body, signature):
            print(f"[Creem Webhook] Invalid signature")
            raise HTTPException(status_code=400, detail="Invalid signature")
    
    try:
        event = await request.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    
    event_type = event.get("eventType")
    
    print(f"[Creem Webhook] Received event: {event_type}")
    
    if event_type == "checkout.completed":
        await handle_checkout_completed(event, db)
    elif event_type == "order.paid":
        await handle_order_paid(event, db)
    
    return {"received": True}


async def handle_checkout_completed(event: dict, db: AsyncSession):
    """Handle successful checkout completion."""
    
    data = event.get("object", {})
    metadata = data.get("metadata", {})
    
    user_id = metadata.get("user_id")
    transaction_id = metadata.get("transaction_id")
    credits_to_add = metadata.get("credits")
    
    if not all([user_id, transaction_id, credits_to_add]):
        print(f"[Creem Webhook] Missing metadata: {metadata}")
        return
    
    # Update transaction status
    result = await db.execute(
        select(Transaction).where(Transaction.id == transaction_id)
    )
    transaction = result.scalar_one_or_none()
    
    if transaction:
        transaction.status = TransactionStatus.SUCCEEDED
        transaction.stripe_payment_id = data.get("id")  # Store Creem checkout ID
    
    # Add credits to user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user:
        user.credits += int(credits_to_add)
        print(f"[Creem Webhook] Added {credits_to_add} credits to user {user_id}")
    else:
        # Create user if doesn't exist
        user = User(id=user_id, credits=int(credits_to_add))
        db.add(user)
        print(f"[Creem Webhook] Created user {user_id} with {credits_to_add} credits")
    
    await db.commit()


async def handle_order_paid(event: dict, db: AsyncSession):
    """Handle order paid event (alternative to checkout.completed)."""
    # Similar logic to checkout.completed
    await handle_checkout_completed(event, db)
