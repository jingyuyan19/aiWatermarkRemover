import sys
import pickle
import argparse
from pathlib import Path
from loguru import logger
from tqdm import tqdm
import numpy as np

# Add src to python path to allow imports
sys.path.append(str(Path(__file__).parent / "src"))

from demark_world.watermark_detector import DeMarkWorldDetector
from demark_world.utils.video_utils import VideoLoader

def run_detection(video_path: str, output_path: str):
    logger.info(f"Subprocess: Starting detection for {video_path}")
    
    video_loader = VideoLoader(Path(video_path))
    detector = DeMarkWorldDetector()
    
    frame_bboxes = {}
    detect_missed = []
    bbox_centers = []
    bboxes = []
    
    total_frames = len(video_loader)
    
    # v1.27 Stroboscopic Detection (Stride=5)
    # Direct YOLO inference on video file is much faster than loop
    logger.info("Subprocess: Starting Fast Detection (Stride=5)...")
    
    # We use the detector's model directly to leverage ultralytics' optimized video handling
    # vid_stride=5 means we only process 20% of frames (0, 5, 10...)
    # stream=True returns a generator for memory efficiency
    results_generator = detector.model.predict(
        source=video_path,
        imgsz=640,
        conf=0.10, # Lower confidence slightly as we are skipping frames
        vid_stride=5,
        stream=True,
        verbose=False,
        device=detector.model.device
    )
    
    # Store keyframes first
    keyframe_bboxes = {}
    last_keyframe_idx = 0
    
    for i, result in enumerate(results_generator):
        frame_idx = i * 5
        last_keyframe_idx = frame_idx
        
        # Report progress
        if i % 10 == 0:
            percentage = min(100, int((frame_idx / total_frames) * 100))
            # Format to match the tqdm pattern expected by core.py
            print(f"Detecting (Subprocess): {percentage}%|", flush=True)
        
        box = None
        if len(result.boxes) > 0:
            # Get best box
            # Note: The boxes are already scaled to the original image size by YOLO automatically!
            # (No need for manual scaling here since we passed the video path directly)
            box_obj = result.boxes[0]
            xyxy = box_obj.xyxy[0].cpu().numpy()
            x1, y1, x2, y2 = map(int, xyxy)
            box = (x1, y1, x2, y2)
            
        keyframe_bboxes[frame_idx] = box

    # Interpolate for all frames
    logger.info("Subprocess: Interpolating skipped frames...")
    
    for idx in range(total_frames):
        # Find prev and next keyframes
        # Keyframes are at 0, 5, 10...
        prev_k = (idx // 5) * 5
        next_k = prev_k + 5
        
        # Exact Hit
        if idx == prev_k:
            box = keyframe_bboxes.get(idx)
        else:
            # Interpolate
            box_prev = keyframe_bboxes.get(prev_k)
            box_next = keyframe_bboxes.get(next_k)
            
            # Case 1: Both exist -> Linear Interpolation
            if box_prev and box_next:
                alpha = (idx - prev_k) / 5.0
                x1 = int(box_prev[0] * (1-alpha) + box_next[0] * alpha)
                y1 = int(box_prev[1] * (1-alpha) + box_next[1] * alpha)
                x2 = int(box_prev[2] * (1-alpha) + box_next[2] * alpha)
                y2 = int(box_prev[3] * (1-alpha) + box_next[3] * alpha)
                box = (x1, y1, x2, y2)
            # Case 2: Only Prev (Gap or End of video) -> Hold
            elif box_prev:
                box = box_prev
            # Case 3: Only Next (Start of video gap) -> Hold
            elif box_next:
                box = box_next
            # Case 4: None -> None
            else:
                box = None

        if box:
            frame_bboxes[idx] = {"bbox": box}
            x1, y1, x2, y2 = box
            bbox_centers.append((int((x1+x2)/2), int((y1+y2)/2)))
            bboxes.append(box)
        else:
            frame_bboxes[idx] = {"bbox": None}
            detect_missed.append(idx)
            bbox_centers.append(None)
            bboxes.append(None)

    results = {
        "frame_bboxes": frame_bboxes,
        "detect_missed": detect_missed,
        "bbox_centers": bbox_centers,
        "bboxes": bboxes
    }
    
    import time
    t0 = time.time()
    logger.info(f"Subprocess: Saving results to {output_path}")
    with open(output_path, 'wb') as f:
        pickle.dump(results, f)
    t1 = time.time()
    logger.info(f"Subprocess: Results saved in {t1-t0:.2f}s. Terminating.")
    
    # Explicitly clean up detector to free VRAM immediately (v1.25 optimization: check for hang)
    del detector
    import gc
    gc.collect()
    
    logger.info("Subprocess: Exiting now.")
    sys.exit(0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video_path", required=True)
    parser.add_argument("--output_path", required=True)
    args = parser.parse_args()
    
    run_detection(args.video_path, args.output_path)
