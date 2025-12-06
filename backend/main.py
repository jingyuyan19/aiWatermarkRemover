from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, engine, Base
from models import Job, JobStatus, User
from schemas import JobCreate, JobResponse
from auth import get_current_user
import uuid
import os
import boto3
import runpod
from dotenv import load_dotenv

import models
import webhooks
import admin
import codes
import creem
import clerk_api

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    print("Backend Application Starting...")

# Include routers
app.include_router(webhooks.router)
app.include_router(admin.router)
app.include_router(codes.router)

from sqlalchemy import text

@app.get("/api/debug/fix_db")
async def fix_db():
    try:
        async with engine.begin() as conn:
            # Fix Users Table
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin INTEGER DEFAULT 0"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR"))
            
            # Fix Transactions Table
            await conn.execute(text("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS stripe_payment_id VARCHAR"))
            
            # Additional safety for defaults
            await conn.execute(text("ALTER TABLE users ALTER COLUMN credits SET DEFAULT 0"))
            
            return {"status": "success", "message": "Database schema patched successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/debug/fix_jobs_db")
async def fix_jobs_db():
    try:
        async with engine.begin() as conn:
            # Fix Jobs Table - Ensure ALL columns exist
            await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id VARCHAR"))
            await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending'"))
            await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS input_key VARCHAR"))
            await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS output_key VARCHAR"))
            await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS quality VARCHAR DEFAULT 'lama'"))
            await conn.execute(text("ALTER TABLE jobs ADD COLUMN IF NOT EXISTS cost INTEGER DEFAULT 1"))
            
            # Create index on user_id if possible (Postgres syntax)
            # await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_jobs_user_id ON jobs (user_id)"))
            
            # Data Cleanup: Fix potentially invalid status values (UPPERCASE to lowercase)
            await conn.execute(text("UPDATE jobs SET status = lower(status)"))
            # Ensure no null timestamps
            await conn.execute(text("UPDATE jobs SET created_at = NOW() WHERE created_at IS NULL"))
            
            return {"status": "success", "message": "Jobs table schema repair COMPLETE (user_id added)"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/debug/dump_jobs")
async def dump_jobs(db: AsyncSession = Depends(get_db)):
    """Dump raw jobs to check for validation errors."""
    try:
        result = await db.execute(text("SELECT * FROM jobs LIMIT 10"))
        rows = result.mappings().all()
        return [{"id": r.id, "status": r.status, "created_at": str(r.created_at), "quality": r.quality} for r in rows]
    except Exception as e:
        return {"error": str(e)}
app.include_router(creem.router)

# CORS Configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# RunPod Serverless Setup
RUNPOD_API_KEY = os.getenv("RUNPOD_API_KEY")
RUNPOD_ENDPOINT_ID = os.getenv("RUNPOD_ENDPOINT_ID")

if RUNPOD_API_KEY:
    runpod.api_key = RUNPOD_API_KEY

# S3/R2 Setup
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME")
PUBLIC_URL_BASE = os.getenv("PUBLIC_URL_BASE") # e.g. https://pub-xxx.r2.dev

s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT_URL,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    """Upload file directly through backend (requires auth)"""
    key = f"uploads/{user_id}/{uuid.uuid4()}/{file.filename}"
    try:
        # Read file content
        content = await file.read()
        
        # Upload to R2
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=content,
            ContentType=file.content_type
        )
        
        return {"key": key}
    except Exception as e:
        print(f"[ERROR] Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/jobs", response_model=JobResponse)
async def create_job(
    job_data: JobCreate,
    input_key: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """Create a processing job (requires auth)"""
    # 1. Get or create user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        # First time user? Create with default credits and fetch email from Clerk
        email = None
        clerk_user = await clerk_api.get_clerk_user(user_id)
        if clerk_user:
            email = clerk_api.get_primary_email(clerk_user)
        
        user = User(id=user_id, email=email, credits=3)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    # 2. Check credits
    cost = 1
    if user.credits < cost:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient credits. You have {user.credits}, but this job costs {cost}."
        )
    
    # 3. Deduct credits
    user.credits -= cost
    db.add(user) # Mark as modified
    # We will commit this along with the new job to ensure atomicity
    
    job_id = str(uuid.uuid4())
    output_key = f"outputs/{user_id}/{job_id}.mp4"
    
    new_job = Job(
        id=job_id,
        user_id=user_id,
        input_key=input_key,
        output_key=output_key,
        quality=job_data.quality,
        cost=cost,
        status=JobStatus.PENDING
    )
    
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)
    
    # Trigger RunPod Serverless Job
    if RUNPOD_ENDPOINT_ID:
        try:
            runpod_job = runpod.Endpoint(RUNPOD_ENDPOINT_ID).run({
                "input": {
                    "job_id": job_id,
                    "input_key": input_key,
                    "output_key": output_key,
                    "quality": job_data.quality
                }
            })
            print(f"RunPod job started: {runpod_job()}")
            
            # Mark as PROCESSING immediately so frontend shows progress
            new_job.status = JobStatus.PROCESSING
            db.add(new_job)
            await db.commit()
            
        except Exception as e:
            print(f"Error starting RunPod job: {e}")
            # Job will stay in PENDING status - can be retried later
    
    return JobResponse(
        id=new_job.id,
        status=new_job.status,
        created_at=new_job.created_at,
        quality=new_job.quality or "lama",
        cost=new_job.cost or 1
    )

@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def get_job_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """Get job status (requires auth, only returns user's own jobs)"""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == user_id)
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # If job is still pending, check RunPod for updates
    if job.status == JobStatus.PENDING and RUNPOD_ENDPOINT_ID:
        try:
            endpoint = runpod.Endpoint(RUNPOD_ENDPOINT_ID)
            # RunPod stores job ID as the UUID we passed
            runpod_status = endpoint.health()  # This will get all jobs
            # Since we don't store the RunPod job ID, we check if output_key exists in R2
            # If the file exists, the job completed successfully
            try:
                s3_client.head_object(Bucket=BUCKET_NAME, Key=job.output_key)
                # File exists! Job is complete
                job.status = JobStatus.COMPLETED
                await db.commit()
                await db.refresh(job)
            except:
                # File doesn't exist yet, job still processing
                pass
        except Exception as e:
            print(f"Error checking RunPod status: {e}")
        
    # Construct public URLs
    input_url = f"{PUBLIC_URL_BASE}/{job.input_key}" if job.input_key else None
    output_url = f"{PUBLIC_URL_BASE}/{job.output_key}" if job.output_key and job.status == JobStatus.COMPLETED else None
    
    return JobResponse(
        id=job.id,
        status=job.status,
        input_url=input_url,
        output_url=output_url,
        created_at=job.created_at,
        quality=job.quality or "lama",
        cost=job.cost or 1
    )

@app.get("/api/jobs")
async def list_user_jobs(
    page: int = 1,
    page_size: int = 20,
    status: str = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """List all jobs for the authenticated user with pagination"""
    from sqlalchemy import func
    try:
        print(f"[DEBUG] list_jobs called for user {user_id}")
        
        # Build base query
        base_query = select(Job).where(Job.user_id == user_id)
        
        if status and status != 'all':
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
        print(f"[DEBUG] Found {len(jobs)} jobs (page {page}/{total_pages})")
        
        response_data = [
            {
                "id": job.id,
                "status": job.status,
                "input_url": f"{PUBLIC_URL_BASE}/{job.input_key}" if job.input_key else None,
                "output_url": f"{PUBLIC_URL_BASE}/{job.output_key}" if job.output_key and job.status == JobStatus.COMPLETED else None,
                "created_at": job.created_at.isoformat(),
                "quality": job.quality or "lama",
                "cost": job.cost or 1
            }
            for job in jobs
        ]
        return {
            "jobs": response_data,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }
    except Exception as e:
        print(f"[ERROR] list_jobs failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"List Jobs Error: {str(e)}")

