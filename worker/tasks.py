import os
import celery
from pathlib import Path
import boto3
from demark_world.core import DeMarkWorld
from demark_world.schemas import CleanerType
from dotenv import load_dotenv

load_dotenv()

# Celery Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
app = celery.Celery('tasks', broker=REDIS_URL, backend=REDIS_URL)

# S3/R2 Configuration
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME")

s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT_URL,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

@app.task(bind=True)
def process_video(self, job_id: str, input_key: str, output_key: str, quality: str = "lama"):
    """
    Process a video to remove watermark.
    
    Args:
        job_id: Unique job identifier
        input_key: S3 key for input video
        output_key: S3 key for output video
        quality: 'lama' or 'e2fgvi_hq'
    """
    try:
        # Create temporary directories
        local_input = Path(f"/tmp/{job_id}_input.mp4")
        local_output = Path(f"/tmp/{job_id}_output.mp4")
        
        # Download video
        print(f"Downloading {input_key} to {local_input}...")
        s3_client.download_file(BUCKET_NAME, input_key, str(local_input))
        
        # Run DeMark-World
        print(f"Processing video with quality: {quality}...")
        cleaner_type = CleanerType.LAMA if quality == "lama" else CleanerType.E2FGVI_HQ
        demarker = DeMarkWorld(cleaner_type=cleaner_type)
        demarker.run(local_input, local_output)
        
        # Upload result
        print(f"Uploading result to {output_key}...")
        s3_client.upload_file(str(local_output), BUCKET_NAME, output_key)
        
        # Cleanup
        if local_input.exists():
            local_input.unlink()
        if local_output.exists():
            local_output.unlink()
            
        return {"status": "completed", "job_id": job_id}
        
    except Exception as e:
        print(f"Error processing job {job_id}: {str(e)}")
        # Cleanup on error
        if local_input.exists():
            local_input.unlink()
        if local_output.exists():
            local_output.unlink()
        raise e
