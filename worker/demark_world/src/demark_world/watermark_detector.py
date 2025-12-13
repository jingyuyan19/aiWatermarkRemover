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
        # import cv2
        # # cv2.imshow("input_image", input_image)
        # cv2.imwrite("input_image.png", input_image)
        # raise RuntimeError()

        # Use stream=True to avoid accumulating results in memory (checks for OOM on 4K)
        box = None
        confidence = None
        center_x = None
        center_y = None
        
        # Generator - processes one item then discards tensors
        # v1.25 Optimization: Downscale to 640px + FP16 for speed (Detection < 3s)
        # YOLO auto-resizes internally and returns coords in original scale.
        t0 = time.time()
        results = self.model.predict(source=input_image, conf=0.05, verbose=False, stream=True, imgsz=640, half=True)
        t1 = time.time()
        if logger:
             logger.debug(f"Inference: {t1 - t0:.4f}s | Device: {self.model.device}")
        
        for result in results:
            if len(result.boxes) > 0:
                box_obj = result.boxes[0]
                xyxy = box_obj.xyxy[0].cpu().numpy()
                x1, y1, x2, y2 = float(xyxy[0]), float(xyxy[1]), float(xyxy[2]), float(xyxy[3])
                confidence = float(box_obj.conf[0].cpu().numpy())
                center_x = (x1 + x2) / 2
                center_y = (y1 + y2) / 2
                box = (int(x1), int(y1), int(x2), int(y2))
                break # Only need the first detection per frame

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
