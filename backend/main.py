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

import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        print(f"[DEBUG] RUNPOD_ENDPOINT_ID is set: {RUNPOD_ENDPOINT_ID[:4]}***")
        try:
            payload = {
                "input": {
                    "job_id": job_id,
                    "input_key": input_key,
                    "output_key": output_key,
                    "quality": job_data.quality
                }
            }
            print(f"[DEBUG] Sending payload to RunPod: {payload}")
            
            runpod_job = runpod.Endpoint(RUNPOD_ENDPOINT_ID).run(payload)
            
            print(f"[DEBUG] RunPod Raw Response Type: {type(runpod_job)}")
            print(f"[DEBUG] RunPod Raw Response Content: {runpod_job}")

            # Robust ID extraction
            rp_id = None
            if isinstance(runpod_job, dict):
                rp_id = runpod_job.get("id") or runpod_job.get("job_id")
            elif hasattr(runpod_job, "id"):
                rp_id = runpod_job.id
            elif hasattr(runpod_job, "job_id"):
                rp_id = runpod_job.job_id
            
            if rp_id:
                new_job.runpod_job_id = rp_id
                print(f"[DEBUG] RunPod job started successfully with ID: {rp_id}")
            else:
                # CRITICAL: Log the raw response if ID is missing so we can debug
                # Print ALL attributes to find where the ID is hiding
                try:
                    debug_attrs = dir(runpod_job)
                    print(f"[ERROR] ID missing. Available attributes: {debug_attrs}")
                    # Try to dump dict if possible
                    if hasattr(runpod_job, "__dict__"):
                         print(f"[ERROR] Object __dict__: {runpod_job.__dict__}")
                except Exception as e:
                    print(f"[ERROR] Failed to inspect object: {e}")
                
                print(f"[ERROR] RunPod job started but ID unknown.")
            
            # Mark as PROCESSING immediately so frontend shows progress
            new_job.status = JobStatus.PROCESSING
            db.add(new_job)
            await db.commit()
            
        except Exception as e:
            print(f"[ERROR] starting RunPod job: {e}")
            import traceback
            traceback.print_exc()
            # Job will stay in PENDING status - can be retried later
    else:
        print("[WARNING] RUNPOD_ENDPOINT_ID is NOT set. Skipping RunPod trigger.")
    
    return JobResponse(
        id=new_job.id,
        status=new_job.status,
        created_at=new_job.created_at,
        quality=new_job.quality or "lama",
        cost=new_job.cost or 1,
        progress=new_job.progress or 0
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
    
    # If job is pending/processing, check for completion or failure
    if job.status in [JobStatus.PENDING, JobStatus.PROCESSING]:
        # 1. Check for progress from RunPod API if we have an ID
        if job.runpod_job_id and RUNPOD_ENDPOINT_ID:
            try:
                # Poll RunPod for status/progress
                # Note: This requires the runpod library to be configured with API key
                endpoint = runpod.Endpoint(RUNPOD_ENDPOINT_ID)
                # Currently SDK doesn't have a direct "get_job" on endpoint?
                # User's guide says GET /status/{id}
                # We'll use the low-level api_request if SDK wrappers don't fit, 
                # OR assume we can check status via standard SDK calls if available.
                # Actually, standard RunPod SDK usage:
                # job = endpoint.run(...) returns a Job object.
                # But here we are in a new request, so we don't have the job object.
                
                # We'll rely on our stored ID and manual requests or assume SDK helper.
                # Since SDK documentation is scarce, let's implement the HTTP request manually as user suggested
                # to be safe and precise.
                import httpx
                async with httpx.AsyncClient() as client:
                    rp_resp = await client.get(
                        f"https://api.runpod.ai/v2/{RUNPOD_ENDPOINT_ID}/status/{job.runpod_job_id}",
                        headers={"Authorization": f"Bearer {RUNPOD_API_KEY}"}
                    )
                    if rp_resp.status_code == 200:
                        data = rp_resp.json()
                        # Use logger to ensure output appears
                        logger.info(f"[DEBUG-POLL] RunPod Status for {job.runpod_job_id}: {data.get('status')}")
                        logger.info(f"[DEBUG-POLL] Messages: {data.get('messages')}")
                        
                        messages = data.get("messages", [])
                        if messages and len(messages) > 0:
                            latest = messages[-1]
                            if isinstance(latest, str) and "%" in latest:
                                try:
                                    pct = int(latest.strip().replace("%", ""))
                                    # Only update if progress has increased
                                    if pct > (job.progress or 0):
                                        job.progress = pct
                                        await db.commit() # Commit progress updates
                                except:
                                    pass

            except Exception as e:
                print(f"[Job {job_id}] Error polling RunPod progress: {e}")

        # 2. Check for completion (Output file exists in R2)
        if job.output_key:
            try:
                # Check if output file exists in R2
                s3_client.head_object(Bucket=BUCKET_NAME, Key=job.output_key)
                # File exists! Job is complete
                job.status = JobStatus.COMPLETED
                job.progress = 100
                await db.commit()
                await db.refresh(job)
                print(f"[Job {job_id}] Marked as COMPLETED - output file exists")
            except Exception as e:
                # File doesn't exist yet
                # Check if job is too old (> 30 min) - likely failed
                from datetime import datetime, timedelta, timezone
                job_age = datetime.now(timezone.utc) - job.created_at.replace(tzinfo=timezone.utc)
                if job_age > timedelta(minutes=30):
                    # Job is stale, mark as failed
                    job.status = JobStatus.FAILED
                    await db.commit()
                    await db.refresh(job)
                    print(f"[Job {job_id}] Marked as FAILED - stale job (age: {job_age})")
    
    # If job failed and not yet refunded, refund credits
    if job.status == JobStatus.FAILED and not job.refunded:
        try:
            # Get user and refund credits
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if user:
                user.credits += job.cost
                job.refunded = 1
                await db.commit()
                await db.refresh(job)
                print(f"[Job {job_id}] Refunded {job.cost} credits to user {user_id}")
        except Exception as e:
            print(f"[Job {job_id}] Error refunding credits: {e}")
        
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
        cost=job.cost or 1,
        progress=job.progress or 0
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
                "cost": job.cost or 1,
                "progress": job.progress or 0
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


@app.get("/api/debug/job/{job_id}")
async def debug_job_status(job_id: str, db: AsyncSession = Depends(get_db)):
    """
    Debug endpoint to see raw RunPod status
    """
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if not job.runpod_job_id:
        return {"error": "No RunPod ID for this job", "local_job": {"id": job.id, "status": job.status}}
        
    import httpx
    async with httpx.AsyncClient() as client:
        rp_resp = await client.get(
            f"https://api.runpod.ai/v2/{RUNPOD_ENDPOINT_ID}/status/{job.runpod_job_id}",
            headers={"Authorization": f"Bearer {RUNPOD_API_KEY}"}
        )
        return {
            "runpod_status": rp_resp.status_code,
            "runpod_body": rp_resp.json(),
            "local_job": {
                "id": job.id,
                "status": job.status,
                "progress": job.progress,
                "runpod_id": job.runpod_job_id
            }
        }
