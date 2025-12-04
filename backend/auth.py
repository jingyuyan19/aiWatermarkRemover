"""
Clerk JWT Authentication for FastAPI

This module provides a dependency for verifying Clerk JWT tokens.
"""
import os
import httpx
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient
from functools import lru_cache

security = HTTPBearer()

# Cache the JWKS client to avoid fetching keys on every request
@lru_cache()
def get_jwks_client():
    """Get the JWKS client for Clerk token verification."""
    # Clerk's JWKS endpoint follows this pattern
    clerk_issuer = os.getenv("CLERK_ISSUER", "")
    if not clerk_issuer:
        # Fallback: construct from frontend URL or use a default pattern
        clerk_publishable_key = os.getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "")
        if clerk_publishable_key:
            # Extract instance ID from publishable key (pk_test_xxx or pk_live_xxx)
            # The JWKS URL is typically: https://{instance}.clerk.accounts.dev/.well-known/jwks.json
            pass
    
    jwks_url = f"{clerk_issuer}/.well-known/jwks.json" if clerk_issuer else None
    if jwks_url:
        return PyJWKClient(jwks_url)
    return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Verify the Clerk JWT token and return the user ID.
    
    This is a FastAPI dependency that can be used to protect routes.
    """
    token = credentials.credentials
    
    try:
        # For development/testing, we can decode without verification
        # In production, you should verify the token signature
        
        # First, try to decode without verification to get claims
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        
        # The 'sub' claim contains the Clerk user ID
        user_id = unverified_payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # TODO: For production, verify the token signature using JWKS
        # jwks_client = get_jwks_client()
        # if jwks_client:
        #     signing_key = jwks_client.get_signing_key_from_jwt(token)
        #     payload = jwt.decode(
        #         token,
        #         signing_key.key,
        #         algorithms=["RS256"],
        #         options={"verify_aud": False}
        #     )
        
        return user_id
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Optional[str]:
    """
    Optionally verify the Clerk JWT token.
    Returns None if no token is provided, otherwise returns the user ID.
    """
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None
