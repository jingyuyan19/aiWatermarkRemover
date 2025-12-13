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
    
    for idx, frame in enumerate(tqdm(video_loader, total=total_frames, desc="Detecting (Subprocess)")):
        detection_result = detector.detect(frame)
        
        if detection_result["detected"]:
            frame_bboxes[idx] = {"bbox": detection_result["bbox"]}
            x1, y1, x2, y2 = detection_result["bbox"]
            bbox_centers.append((int((x1 + x2) / 2), int((y1 + y2) / 2)))
            bboxes.append((x1, y1, x2, y2))
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

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video_path", required=True)
    parser.add_argument("--output_path", required=True)
    args = parser.parse_args()
    
    run_detection(args.video_path, args.output_path)
