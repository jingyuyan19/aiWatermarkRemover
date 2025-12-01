from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, engine, Base
from models import Job, JobStatus
from schemas import JobCreate, JobResponse
import uuid
import os
import boto3
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS Configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Celery Setup
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery_app = Celery('tasks', broker=REDIS_URL, backend=REDIS_URL)

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
async def upload_file(file: UploadFile = File(...)):
    """Upload file directly through backend (bypasses CORS)"""
    key = f"uploads/{uuid.uuid4()}/{file.filename}"
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
async def create_job(job_data: JobCreate, input_key: str, db: AsyncSession = Depends(get_db)):
    """Create a processing job"""
    job_id = str(uuid.uuid4())
    output_key = f"outputs/{job_id}.mp4"
    
    new_job = Job(
        id=job_id,
        input_key=input_key,
        output_key=output_key,
        quality=job_data.quality,
        status=JobStatus.PENDING
    )
    
    db.add(new_job)
    await db.commit()
    await db.refresh(new_job)
    
    # Trigger Celery Task
    celery_app.send_task(
        "tasks.process_video",
        args=[job_id, input_key, output_key, job_data.quality],
        queue="video_processing"
    )
    
    return JobResponse(
        id=new_job.id,
        status=new_job.status,
        created_at=new_job.created_at
    )

@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
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
