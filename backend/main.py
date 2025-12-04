from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, engine, Base
from models import Job, JobStatus
from schemas import JobCreate, JobResponse
from auth import get_current_user
import uuid
import os
import boto3
import runpod
from dotenv import load_dotenv

from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, engine, Base
import models
import webhooks

app = FastAPI()

# Include routers
app.include_router(webhooks.router)

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
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/jobs", response_model=JobResponse)
async def create_job(
    job_data: JobCreate,
    input_key: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """Create a processing job (requires auth)"""
    job_id = str(uuid.uuid4())
    output_key = f"outputs/{user_id}/{job_id}.mp4"
    
    new_job = Job(
        id=job_id,
        user_id=user_id,
        input_key=input_key,
        output_key=output_key,
        quality=job_data.quality,
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
        except Exception as e:
            print(f"Error starting RunPod job: {e}")
            # Job will stay in PENDING status - can be retried later
    
    return JobResponse(
        id=new_job.id,
        status=new_job.status,
        created_at=new_job.created_at
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
        created_at=job.created_at
    )

@app.get("/api/jobs", response_model=list[JobResponse])
async def list_user_jobs(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    """List all jobs for the authenticated user"""
    result = await db.execute(
        select(Job).where(Job.user_id == user_id).order_by(Job.created_at.desc())
    )
    jobs = result.scalars().all()
    
    return [
        JobResponse(
            id=job.id,
            status=job.status,
            input_url=f"{PUBLIC_URL_BASE}/{job.input_key}" if job.input_key else None,
            output_url=f"{PUBLIC_URL_BASE}/{job.output_key}" if job.output_key and job.status == JobStatus.COMPLETED else None,
            created_at=job.created_at
        )
        for job in jobs
    ]
