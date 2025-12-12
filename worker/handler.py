"""
RunPod Serverless Handler for Video Watermark Removal
Queue-based architecture for scale-to-zero deployment
"""
import runpod
import os
import boto3
import torch
import gc
from pathlib import Path
from demark_world.core import DeMarkWorld
from demark_world.schemas import CleanerType
import ffmpeg

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
        
        # 1b. Verify Metadata & Safety Fuse (V2.1)
        try:
            probe = ffmpeg.probe(str(local_input))
            video_stream = next((stream for stream in probe['streams'] if stream['codec_type'] == 'video'), None)
            if video_stream:
                width = int(video_stream['width'])
                height = int(video_stream['height'])
                # duration can be in stream or format. Try stream first, then format.
                duration = float(video_stream.get('duration', 0))
                if duration == 0:
                     duration = float(probe['format'].get('duration', 0))

                print(f"[{job_id}] Verified Metadata: {width}x{height}, {duration}s")
                
                # Safety Fuse Logic (User Provided)
                q_mult = 2 if quality == 'e2fgvi_hq' else 1
                r_mult = 2 if max(width, height) > 1920 else 1

                # Fuse Protection: If 4K + HQ (4x consumption mode)
                if q_mult == 2 and r_mult == 2:
                    if duration > 30: # Hard limit 30s
                        print(f"[{job_id}] REFUSED: 4K HQ > 30s ({duration}s)")
                        return {"status": "failed", "error": "4K HQ video is limited to 30s max to prevent server overload."}
        except Exception as e:
            print(f"[{job_id}] Metadata probe warning: {e}")

        # 2. Process video with DeMark-World
        print(f"[{job_id}] Processing video with quality: {quality}...")
        cleaner_type = CleanerType.LAMA if quality == "lama" else CleanerType.E2FGVI_HQ
        demarker = DeMarkWorld(cleaner_type=cleaner_type)
        
        def progress_callback(progress: int):
            # Report progress to RunPod
            # Note: RunPod expects progress updates as messages
            try:
                runpod.serverless.progress_update(job, f"{progress}%")
                print(f"[DEBUG-WORKER] Progress sent: {progress}%")
            except Exception as e:
                print(f"[DEBUG-WORKER] Failed to update progress: {e}")

        demarker.run(local_input, local_output, progress_callback=progress_callback)
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
    
    finally:
        # 5. Global Cleanup (Crucial for GPU persistence)
        # Ensure model is unloaded if possible and cache is cleared
        if 'demarker' in locals():
            del demarker
        
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

# Start the RunPod serverless handler
runpod.serverless.start({
    "handler": handler,
    "return_aggregate_stream": True
})
