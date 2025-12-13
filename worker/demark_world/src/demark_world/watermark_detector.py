from pathlib import Path

import time
import numpy as np
from loguru import logger
from ultralytics import YOLO
from loguru import logger
from demark_world.configs import WATER_MARK_DETECT_YOLO_WEIGHTS, WATER_MARK_DETECT_YOLO_WEIGHTS_REMOTE_URL
from demark_world.utils.devices_utils import get_device

from demark_world.utils.download_utils import ensure_model_downloaded     
from demark_world.utils.video_utils import VideoLoader

# based on the sora tempalte to detect the whole, and then got the icon part area.


class DeMarkWorldDetector:
    def __init__(self):
        # download_detector_weights()
        ensure_model_downloaded(WATER_MARK_DETECT_YOLO_WEIGHTS, WATER_MARK_DETECT_YOLO_WEIGHTS_REMOTE_URL)
        logger.debug(f"Begin to load yolo water mark detet model.")
        self.model = YOLO(WATER_MARK_DETECT_YOLO_WEIGHTS)
        self.model.to(str(get_device()))
        self.model.eval()
        logger.debug(f"Yolo water mark detet model loaded from {WATER_MARK_DETECT_YOLO_WEIGHTS}.")

        self.model.eval()

    def detect(self, input_image: np.ndarray):
        import cv2
        
        box = None
        confidence = None
        center_x = None
        center_y = None
        
        # v1.26.9 Optimization: Manual Downscaling to 640px
        # Passing 4K images to YOLO.predict() causes massive overhead (CPU resize + transfer).
        # We resize manually with cv2 (fast) and scale boxes back.
        
        t0 = time.time()
        
        # 1. Resize input to max_dim=640 (maintaining aspect ratio)
        h_orig, w_orig = input_image.shape[:2]
        target_size = 640
        scale = target_size / max(h_orig, w_orig)
        
        if scale < 1.0:
            new_w = int(w_orig * scale)
            new_h = int(h_orig * scale)
            resized_img = cv2.resize(input_image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        else:
            resized_img = input_image
            scale = 1.0 # No resize needed

        # 2. Predict on small image
        device = str(get_device())
        # Remove stream=True (not needed for single image), remove half=True (let YOLO decide based on device capabilities or default)
        # We already resized, so imgsz=640 is redundant but safe.
        results = self.model.predict(source=resized_img, conf=0.05, verbose=False, device=device)
        
        for result in results:
            if len(result.boxes) > 0:
                box_obj = result.boxes[0]
                xyxy = box_obj.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = float(xyxy[0]), float(xyxy[1]), float(xyxy[2]), float(xyxy[3])
                
                # 3. Scale boxes back to original resolution
                x1 /= scale
                y1 /= scale
                x2 /= scale
                y2 /= scale
                
                confidence = float(box_obj.conf[0].cpu().numpy())
                center_x = (x1 + x2) / 2
                center_y = (y1 + y2) / 2
                box = (int(x1), int(y1), int(x2), int(y2))
                break # Only need the first detection per frame
        
        t1 = time.time()
        # Use print to ensure core.py catches it (stdout)
        print(f"Inference: {t1 - t0:.4f}s | Device: {self.model.device}", flush=True)

        if box is None:
            return {"detected": False, "bbox": None, "confidence": None, "center": None}

        return {
            "detected": True,
            "bbox": box,
            "confidence": confidence,
            "center": (int(center_x), int(center_y)),
        }


if __name__ == "__main__":
    pass
