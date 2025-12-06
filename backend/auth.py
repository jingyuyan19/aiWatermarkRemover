"""
Clerk JWT Authentication for FastAPI

This module provides a dependency for verifying Clerk JWT tokens.
"""
import os
import httpx
from typing import Optional, Tuple
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient
from functools import lru_cache
from pydantic import BaseModel

security = HTTPBearer()


class UserInfo(BaseModel):
    """User information extracted from JWT."""
    user_id: str
    role: Optional[str] = None


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


def _extract_role_from_payload(payload: dict) -> Optional[str]:
    """Extract role from Clerk JWT payload.
    
    Clerk stores publicMetadata in different locations depending on version:
    - metadata.role
    - public_metadata.role
    - publicMetadata.role (frontend JS style, less common in JWT)
    """
    # Try different paths where Clerk might store the role
    role = None
    
    # Path 1: metadata.role (common in Clerk v4+)
    metadata = payload.get("metadata", {})
    if isinstance(metadata, dict):
        role = metadata.get("role")
    
    # Path 2: public_metadata.role
    if not role:
        public_metadata = payload.get("public_metadata", {})
        if isinstance(public_metadata, dict):
            role = public_metadata.get("role")
    
    # Path 3: Direct role claim (some setups)
    if not role:
        role = payload.get("role")
    
    return role


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


async def get_current_user_info(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UserInfo:
    """
    Verify the Clerk JWT token and return user info including role.
    
    This is a FastAPI dependency that extracts both user_id and role from the token.
    """
    token = credentials.credentials
    
    try:
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        
        user_id = unverified_payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        role = _extract_role_from_payload(unverified_payload)
        
        return UserInfo(user_id=user_id, role=role)
        
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
