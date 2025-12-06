"""
Clerk API Helper

This module provides functions to interact with Clerk's Backend API
to fetch user information.
"""
import os
import httpx
from typing import Optional

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")


async def get_clerk_user(user_id: str) -> Optional[dict]:
    """
    Fetch user details from Clerk Backend API.
    
    Args:
        user_id: The Clerk user ID (e.g., "user_xxx")
        
    Returns:
        User data dict or None if not found
    """
    if not CLERK_SECRET_KEY:
        print("Warning: CLERK_SECRET_KEY not set, cannot fetch user from Clerk")
        return None
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"https://api.clerk.com/v1/users/{user_id}",
                headers={
                    "Authorization": f"Bearer {CLERK_SECRET_KEY}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Failed to fetch Clerk user {user_id}: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Error fetching Clerk user {user_id}: {e}")
            return None


def get_primary_email(clerk_user: dict) -> Optional[str]:
    """
    Extract primary email from Clerk user data.
    
    Args:
        clerk_user: User data from Clerk API
        
    Returns:
        Primary email address or None
    """
    if not clerk_user:
        return None
    
    email_addresses = clerk_user.get("email_addresses", [])
    if email_addresses:
        # Find primary email or use first one
        for email in email_addresses:
            if email.get("id") == clerk_user.get("primary_email_address_id"):
                return email.get("email_address")
        # Fallback to first email
        return email_addresses[0].get("email_address")
    
    return None
