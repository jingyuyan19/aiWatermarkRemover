from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User
from svix.webhooks import Webhook, WebhookVerificationError
import os
import json

router = APIRouter()

@router.post("/api/webhooks/clerk")
async def clerk_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    WEBHOOK_SECRET = os.environ.get("CLERK_WEBHOOK_SECRET")
    if not WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Missing CLERK_WEBHOOK_SECRET")

    headers = request.headers
    payload = await request.body()

    try:
        wh = Webhook(WEBHOOK_SECRET)
        evt = wh.verify(payload, headers)
    except WebhookVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = evt["type"]
    data = evt["data"]

    if event_type == "user.created":
        user_id = data["id"]
        email = data["email_addresses"][0]["email_address"]
        
        # Check if user exists
        result = await db.execute(select(User).where(User.id == user_id))
        existing_user = result.scalar_one_or_none()
        
        if not existing_user:
            new_user = User(id=user_id, email=email)
            db.add(new_user)
            await db.commit()
            print(f"User created: {user_id}")

    elif event_type == "user.updated":
        user_id = data["id"]
        email = data["email_addresses"][0]["email_address"]
        
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if user:
            user.email = email
            await db.commit()
            print(f"User updated: {user_id}")

    elif event_type == "user.deleted":
        user_id = data["id"]
        
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if user:
            await db.delete(user)
            await db.commit()
            print(f"User deleted: {user_id}")

    return {"status": "success"}
