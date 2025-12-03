"""
RunPod Serverless Handler for Video Watermark Removal
Queue-based architecture for scale-to-zero deployment
"""
import runpod
import os
import boto3
from pathlib import Path
from demark_world.core import DeMarkWorld
from demark_world.schemas import CleanerType

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

def handler(job):
    """
    Main entry point for RunPod Serverless worker.
    
    Expected input format:
    {
        "input": {
            "job_id": "uuid",
            "input_key": "uploads/uuid/video.mp4",
            "output_key": "outputs/uuid.mp4",
            "quality": "lama"  # or "e2fgvi_hq"
        }
    }
    """
    job_input = job["input"]
    job_id = job_input["job_id"]
    input_key = job_input["input_key"]
    output_key = job_input["output_key"]
    quality = job_input.get("quality", "lama")
    
    # Local file paths
    local_input = Path(f"/tmp/{job_id}_input.mp4")
    local_output = Path(f"/tmp/{job_id}_output.mp4")
    
    try:
        # 1. Download video from R2
        print(f"[{job_id}] Downloading {input_key}...")
        s3_client.download_file(BUCKET_NAME, input_key, str(local_input))
        print(f"[{job_id}] Download complete. File size: {local_input.stat().st_size / 1024 / 1024:.2f} MB")
        
        # 2. Process video with DeMark-World
        print(f"[{job_id}] Processing video with quality: {quality}...")
        cleaner_type = CleanerType.LAMA if quality == "lama" else CleanerType.E2FGVI_HQ
        demarker = DeMarkWorld(cleaner_type=cleaner_type)
        demarker.run(local_input, local_output)
        print(f"[{job_id}] Processing complete. Output size: {local_output.stat().st_size / 1024 / 1024:.2f} MB")
        
        # 3. Upload result to R2
        print(f"[{job_id}] Uploading result to {output_key}...")
        s3_client.upload_file(str(local_output), BUCKET_NAME, output_key)
        print(f"[{job_id}] Upload complete.")
        
        # 4. Cleanup
        if local_input.exists():
            local_input.unlink()
        if local_output.exists():
            local_output.unlink()
        
        # Return success
        return {
            "status": "completed",
            "job_id": job_id,
            "output_key": output_key
        }
        
    except Exception as e:
        print(f"[{job_id}] Error: {str(e)}")
        
        # Cleanup on error
        if local_input.exists():
            local_input.unlink()
        if local_output.exists():
            local_output.unlink()
        
        # Return error (RunPod will mark job as FAILED)
        return {
            "status": "failed",
            "job_id": job_id,
            "error": str(e)
        }

# Start the RunPod serverless handler
runpod.serverless.start({"handler": handler})
