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
    
    # v1.27.1 Fix: Dynamic Watermark Support
    # We MUST process every frame (vid_stride=1) because Sora 2 watermarks move randomly.
    # We still use direct video inference (source=video_path) because it is faster than the Python loop.
    logger.info("Subprocess: Starting Detection (Every Frame)...")
    
    import time
    start_time = time.time()
    
    # We use the detector's model directly to leverage ultralytics' optimized video handling
    results_generator = detector.model.predict(
        source=video_path,
        imgsz=640,
        conf=0.10,
        stream=True,
        verbose=False,
        device=detector.model.device
    )
    
    for idx, result in enumerate(results_generator):
        # Report progress
        if idx % 5 == 0:
            percentage = min(100, int((idx / total_frames) * 100))
            elapsed = time.time() - start_time
            fps = (idx + 1) / elapsed if elapsed > 0 else 0
            # Adding [DETECTOR] prefix forces core.py to log this line!
            print(f"[DETECTOR] Detecting frame {idx}/{total_frames} ({percentage}%|) FPS: {fps:.1f}", flush=True)
        
        box = None
        if len(result.boxes) > 0:
            # Get best box
            box_obj = result.boxes[0]
            xyxy = box_obj.xyxy[0].cpu().numpy()
            x1, y1, x2, y2 = map(int, xyxy)
            box = (x1, y1, x2, y2)
            
        if box:
            frame_bboxes[idx] = {"bbox": box}
            # Add to lists for backup logic (though strictly we don't need backup if we detect every frame, core.py expects these)
            x1, y1, x2, y2 = box
            bbox_centers.append((int((x1+x2)/2), int((y1+y2)/2)))
            bboxes.append(box)
        else:
            frame_bboxes[idx] = {"bbox": None}
            detect_missed.append(idx)
            bbox_centers.append(None)
            bboxes.append(None)

    # v1.27.1: No interpolation needed (We processed every frame)
    total_time = time.time() - start_time
    logger.info(f"Subprocess: Detection complete. Missed {len(detect_missed)} frames. Total: {total_time:.2f}s ({total_frames/total_time:.1f} FPS)")

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
