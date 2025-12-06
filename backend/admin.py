"""
Admin API endpoints for managing redemption codes, users, and jobs.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models import User, Job, JobStatus, RedemptionCode, CreditPack
from auth import get_current_user, get_current_user_info, UserInfo
import uuid
import secrets
import string
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ============ Pydantic Schemas ============

class CodeGenerateRequest(BaseModel):
    credits: int
    count: int = 1  # Number of codes to generate
    prefix: str = ""  # Optional prefix like "TB-" for Taobao


class CodeResponse(BaseModel):
    code: str
    credits: int
    created_at: datetime
    redeemed_by: Optional[str] = None
    redeemed_at: Optional[datetime] = None


class UserCreditUpdate(BaseModel):
    credits: int


class StatsResponse(BaseModel):
    total_users: int
    total_jobs: int
    completed_jobs: int
    pending_codes: int
    redeemed_codes: int


# ============ Helper Functions ============

def verify_admin_role(user_info: UserInfo) -> None:
    """Verify user has admin role from JWT, raise 403 if not."""
    if user_info.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


def generate_code(prefix: str = "", length: int = 8) -> str:
    """Generate a random redemption code."""
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(length))
    return f"{prefix}{random_part}" if prefix else random_part


# ============ Code Management ============

@router.post("/codes", response_model=list[CodeResponse])
async def generate_codes(
    request: CodeGenerateRequest,
    db: AsyncSession = Depends(get_db),
    user_info: UserInfo = Depends(get_current_user_info)
):
    """Generate redemption codes (admin only)."""
    verify_admin_role(user_info)
    
    codes = []
    for _ in range(request.count):
        code_str = generate_code(prefix=request.prefix)
        
        # Ensure uniqueness
        while True:
            existing = await db.execute(
                select(RedemptionCode).where(RedemptionCode.code == code_str)
            )
            if not existing.scalar_one_or_none():
                break
            code_str = generate_code(prefix=request.prefix)
        
        new_code = RedemptionCode(
            code=code_str,
            credits=request.credits
        )
        db.add(new_code)
        codes.append(new_code)
    
    await db.commit()
    
    return [
        CodeResponse(
            code=c.code,
            credits=c.credits,
            created_at=c.created_at,
            redeemed_by=c.redeemed_by,
            redeemed_at=c.redeemed_at
        )
        for c in codes
    ]


class PaginatedCodesResponse(BaseModel):
    codes: list[CodeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("/codes")
async def list_codes(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,  # "pending", "redeemed", or None for all
    credits: Optional[int] = None,  # Filter by credit amount
    search: Optional[str] = None,  # Search by code
    db: AsyncSession = Depends(get_db),
    user_info: UserInfo = Depends(get_current_user_info)
):
    """List redemption codes with pagination and filters (admin only)."""
    verify_admin_role(user_info)
    
    # Build base query
    query = select(RedemptionCode)
    count_query = select(func.count(RedemptionCode.code))
    
    # Apply filters
    if status == "pending":
        query = query.where(RedemptionCode.redeemed_by == None)
        count_query = count_query.where(RedemptionCode.redeemed_by == None)
    elif status == "redeemed":
        query = query.where(RedemptionCode.redeemed_by != None)
        count_query = count_query.where(RedemptionCode.redeemed_by != None)
    
    if credits:
        query = query.where(RedemptionCode.credits == credits)
        count_query = count_query.where(RedemptionCode.credits == credits)
    
    if search:
        query = query.where(RedemptionCode.code.ilike(f"%{search}%"))
        count_query = count_query.where(RedemptionCode.code.ilike(f"%{search}%"))
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.order_by(RedemptionCode.created_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    codes = result.scalars().all()
    
    total_pages = (total + page_size - 1) // page_size  # Ceiling division
    
    return {
        "codes": [
            {
                "code": c.code,
                "credits": c.credits,
                "created_at": c.created_at,
                "redeemed_by": c.redeemed_by,
                "redeemed_at": c.redeemed_at
            }
            for c in codes
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# ============ User Management ============

class UserResponse(BaseModel):
    id: str
    email: str
    credits: int
    is_admin: int
    created_at: datetime
    total_jobs: int = 0
    completed_jobs: int = 0


class PaginatedUsersResponse(BaseModel):
    users: list
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("/users")
async def list_users(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,  # Search by email
    role: Optional[str] = None,  # "admin" or "user"
    db: AsyncSession = Depends(get_db),
    user_info: UserInfo = Depends(get_current_user_info)
):
    """List all users with stats and pagination (admin only)."""
    verify_admin_role(user_info)
    
    # Build base query with optional filters
    base_query = select(User)
    
    if search:
        base_query = base_query.where(User.email.ilike(f"%{search}%"))
    
    if role == "admin":
        base_query = base_query.where(User.is_admin == 1)
    elif role == "user":
        base_query = base_query.where((User.is_admin == 0) | (User.is_admin == None))
    
    # Get total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Calculate pagination
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    offset = (page - 1) * page_size
    
    # Get paginated results
    result = await db.execute(
        base_query.order_by(User.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    users = result.scalars().all()
    
    # Get job stats for each user
    user_stats = []
    for u in users:
        total_jobs_result = await db.execute(
            select(func.count(Job.id)).where(Job.user_id == u.id)
        )
        total_jobs = total_jobs_result.scalar() or 0
        
        completed_jobs_result = await db.execute(
            select(func.count(Job.id)).where(
                Job.user_id == u.id,
                Job.status == JobStatus.COMPLETED
            )
        )
        completed_jobs = completed_jobs_result.scalar() or 0
        
        user_stats.append({
            "id": u.id,
            "email": u.email or "",
            "credits": u.credits,
            "is_admin": u.is_admin or 0,
            "created_at": u.created_at,
            "total_jobs": total_jobs,
            "completed_jobs": completed_jobs
        })
    
    return {
        "users": user_stats,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.patch("/users/{target_user_id}/credits")
async def update_user_credits(
    target_user_id: str,
    update: UserCreditUpdate,
    db: AsyncSession = Depends(get_db),
    user_info: UserInfo = Depends(get_current_user_info)
):
    """Update a user's credits (admin only)."""
    verify_admin_role(user_info)
    
    result = await db.execute(select(User).where(User.id == target_user_id))
    target_user = result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    target_user.credits = update.credits
    await db.commit()
    
    return {"message": "Credits updated", "new_credits": update.credits}


# ============ Jobs Management ============

@router.get("/jobs")
async def list_all_jobs(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_info: UserInfo = Depends(get_current_user_info)
):
    """List all jobs with pagination (admin only)."""
    verify_admin_role(user_info)
    
    # Build base query
    base_query = select(Job)
    
    if status:
        base_query = base_query.where(Job.status == status)
    
    # Get total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Calculate pagination
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    offset = (page - 1) * page_size
    
    # Get paginated results
    result = await db.execute(
        base_query.order_by(Job.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    jobs = result.scalars().all()
    
    return {
        "jobs": [
            {
                "id": j.id,
                "user_id": j.user_id,
                "status": j.status,
                "quality": j.quality,
                "cost": j.cost,
                "created_at": j.created_at
            }
            for j in jobs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# ============ Dashboard Stats ============

@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user_info: UserInfo = Depends(get_current_user_info)
):
    """Get dashboard statistics (admin only)."""
    verify_admin_role(user_info)
    
    # Total users
    total_users = await db.execute(select(func.count(User.id)))
    total_users = total_users.scalar() or 0
    
    # Total jobs
    total_jobs = await db.execute(select(func.count(Job.id)))
    total_jobs = total_jobs.scalar() or 0
    
    # Completed jobs
    completed_jobs = await db.execute(
        select(func.count(Job.id)).where(Job.status == JobStatus.COMPLETED)
    )
    completed_jobs = completed_jobs.scalar() or 0
    
    # Pending codes (not redeemed)
    pending_codes = await db.execute(
        select(func.count(RedemptionCode.code)).where(RedemptionCode.redeemed_by == None)
    )
    pending_codes = pending_codes.scalar() or 0
    
    # Redeemed codes
    redeemed_codes = await db.execute(
        select(func.count(RedemptionCode.code)).where(RedemptionCode.redeemed_by != None)
    )
    redeemed_codes = redeemed_codes.scalar() or 0
    
    return StatsResponse(
        total_users=total_users,
        total_jobs=total_jobs,
        completed_jobs=completed_jobs,
        pending_codes=pending_codes,
        redeemed_codes=redeemed_codes
    )
