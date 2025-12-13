from pathlib import Path
from typing import List

import numpy as np
import torch
from loguru import logger
from pydantic import BaseModel
from tqdm import tqdm

from demark_world.configs import E2FGVI_HQ_CHECKPOINT_PATH, E2FGVI_HQ_CHECKPOINT_REMOTE_URL
from demark_world.models.model.e2fgvi_hq import InpaintGenerator
from demark_world.utils.devices_utils import get_device
from demark_world.utils.download_utils import ensure_model_downloaded
from demark_world.utils.video_utils import merge_frames_with_overlap
from demark_world.utils.mem_utils import memory_profiling
from demark_world.constants import CHUNK_SIZE_PER_GB_VRAM

# Monkey-patch grid_sample to force Float32 execution for stability in FP16
# Define this at module level to ensure it applies before ANY usage
import torch.nn.functional as F
original_grid_sample = F.grid_sample

def safe_grid_sample(input, grid, **kwargs):
    # Cast input and grid to float32 for the sensitive warping operation
    if input.dtype == torch.float16 or grid.dtype == torch.float16:
        out = original_grid_sample(input.float(), grid.float(), **kwargs)
        # Cast back to float16 for the next layer
        return out.half()
    return original_grid_sample(input, grid, **kwargs)

torch.nn.functional.grid_sample = safe_grid_sample
from demark_world.utils.mem_utils import memory_profiling
from demark_world.constants import CHUNK_SIZE_PER_GB_VRAM


def get_ref_index(
    frame_idx: int, neighbor_ids: List[int], length: int, ref_length: int, num_ref: int
) -> List[int]:
    # TODO: optimize the code later.
    ref_index = []
    if num_ref == -1:
        for i in range(0, length, ref_length):
            if i not in neighbor_ids:
                ref_index.append(i)
    else:
        start_idx = max(0, frame_idx - ref_length * (num_ref // 2))
        end_idx = min(length, frame_idx + ref_length * (num_ref // 2))
        for i in range(start_idx, end_idx + 1, ref_length):
            if i not in neighbor_ids:
                if len(ref_index) > num_ref:
                    break
                ref_index.append(i)
    return ref_index


def numpy_to_tensor(frames_np, masks_np):
    """
    Convert numpy arrays to tensors
    frames_np: (T, H, W, 3) uint8 [0, 255]
    masks_np: (T, H, W) uint8 [0, 255]
    Returns: frames tensor (1, T, 3, H, W) [-1, 1], masks tensor (1, T, 1, H, W) [0, 1]
    """
    # Frames: (T, H, W, 3) -> (T, 3, H, W) -> (1, T, 3, H, W)
    frames_tensor = torch.from_numpy(frames_np).permute(0, 3, 1, 2).unsqueeze(0).float()
    frames_tensor = frames_tensor / 255.0 * 2 - 1  # Normalize to [-1, 1]

    # Masks: (T, H, W) -> (T, 1, H, W) -> (1, T, 1, H, W)
    masks_tensor = torch.from_numpy(masks_np).unsqueeze(1).unsqueeze(0).float()
    masks_tensor = masks_tensor / 255.0  # Normalize to [0, 1]

    return frames_tensor, masks_tensor


# MODEL_DIR = Path("release_model")
# CKPT_PATH = MODEL_DIR / "E2FGVI-HQ-CVPR22.pth"

# TODO: RuntimeError: MPS: Unsupported Border padding mode
# mps doesn't work here.....
device = get_device()
if device.type == "mps":
    logger.warning(
        f"E2FGVI_HQ Cleaner doesn't support MPS, using CPU instead. But it is very very slow!!"
    )
    device = torch.device("cpu")


class E2FGVIHDConfig(BaseModel):
    ref_length: int = 10
    num_ref: int = -1
    neighbor_stride: int = 5
    chunk_size_ratio: float = 0.2  # TODO: this can be adjust as the VRAM
    overlap_ratio: int = 0.05


class E2FGVIHDCleaner:
    def __init__(
        self,
        ckpt_path: Path = E2FGVI_HQ_CHECKPOINT_PATH,
        config: E2FGVIHDConfig = E2FGVIHDConfig(),
    ):
        ensure_model_downloaded(ckpt_path, E2FGVI_HQ_CHECKPOINT_REMOTE_URL)
        self.model = InpaintGenerator().to(device)
        state = torch.load(ckpt_path, map_location=device)
        self.model.load_state_dict(state)
        self.model.eval()
        self.config = config
        self.profiling_chunk_size()

    def profiling_chunk_size(self):
        # memory_profiling
        # 1GB can process about 5 frames in chunk size
        memory_profiling_results = memory_profiling()
        adapted_chunk_size = int(
            memory_profiling_results.free_memory * CHUNK_SIZE_PER_GB_VRAM
        )
        self.adapted_chunk_size = adapted_chunk_size
        logger.debug(
            # keep two digit
            f"Chunk size is set to {self.adapted_chunk_size} based on the free VRAM {round(memory_profiling_results.free_memory, 2)}GB"
        )

    @property
    def chunk_size(self):
        return self.adapted_chunk_size

    def process_frames_chunk(
        self,
        chunk_length: int,
        neighbor_stride: int,
        imgs_chunk: torch.Tensor,
        masks_chunk: torch.Tensor,
        binary_masks_chunk: np.ndarray,
        frames_np_chunk: np.ndarray,
        h: int,
        w: int,
    ) -> List[np.ndarray]:
        comp_frames_chunk = [None] * chunk_length

        for f in tqdm(
            range(0, chunk_length, neighbor_stride),
            desc=f"  Frame progress",
            position=1,
            leave=False,
        ):
            neighbor_ids = [
                i
                for i in range(
                    max(0, f - neighbor_stride),
                    min(chunk_length, f + neighbor_stride + 1),
                )
            ]
            ref_ids = get_ref_index(
                f,
                neighbor_ids,
                chunk_length,
                self.config.ref_length,
                self.config.num_ref,
            )
            selected_imgs = imgs_chunk[:1, neighbor_ids + ref_ids, :, :, :]
            selected_masks = masks_chunk[:1, neighbor_ids + ref_ids, :, :, :]

            with torch.no_grad():
                masked_imgs = selected_imgs * (1 - selected_masks)
                mod_size_h = 60
                mod_size_w = 108
                h_pad = (mod_size_h - h % mod_size_h) % mod_size_h
                w_pad = (mod_size_w - w % mod_size_w) % mod_size_w
                masked_imgs = torch.cat([masked_imgs, torch.flip(masked_imgs, [3])], 3)[
                    :, :, :, : h + h_pad, :
                ]
                masked_imgs = torch.cat([masked_imgs, torch.flip(masked_imgs, [4])], 4)[
                    :, :, :, :, : w + w_pad
                ]
                pred_imgs, _ = self.model(masked_imgs, len(neighbor_ids))
                pred_imgs = pred_imgs[:, :, :h, :w]
                pred_imgs = (pred_imgs + 1) / 2
                pred_imgs = pred_imgs.cpu().permute(0, 2, 3, 1).numpy() * 255

                for i in range(len(neighbor_ids)):
                    idx = neighbor_ids[i]
                    img = np.array(pred_imgs[i]).astype(np.uint8) * binary_masks_chunk[
                        idx
                    ] + frames_np_chunk[idx] * (1 - binary_masks_chunk[idx])
                    if comp_frames_chunk[idx] is None:
                        comp_frames_chunk[idx] = img
                    else:
                        comp_frames_chunk[idx] = (
                            comp_frames_chunk[idx].astype(np.float32) * 0.5
                            + img.astype(np.float32) * 0.5
                        )

        return comp_frames_chunk




    def clean(self, frames: np.ndarray, masks: np.ndarray, progress_callback=None) -> List[np.ndarray]:
        video_length = len(frames)
        h, w = frames[0].shape[:2]
        
        # ROI Optimization allows us to use standard chunk sizes even for 4K.
        # We rely on specific crops to fit in VRAM.
        # Use a reasonably large chunk for temporal consistency.
        # "Chunk size 50" suggested by analysis.
        chunk_size = 50 
        
        # Respect memory profiling if valid, but ignore 4K penalty
        if self.adapted_chunk_size and self.adapted_chunk_size > 0:
             # Basic safety: reduce chunk size if calculated safe size is very small
             chunk_size = max(10, self.adapted_chunk_size)
        
        # Override for high-res: The 4K penalty is REMOVED because we process crops.
        # We cap at 60 to prevent too much temporal drift/memory usage if watermark is large.
        chunk_size = min(chunk_size, 60)
        
        overlap_size = int(self.config.overlap_ratio * video_length)
        
        # Standard overlap logic (ROI allows generous chunks again)
        max_overlap = max(0, int(chunk_size * 0.3))
        if overlap_size > max_overlap:
            overlap_size = max_overlap
        if chunk_size <= overlap_size:
             overlap_size = max(0, chunk_size - 1)
        
        step_size = max(1, chunk_size - overlap_size)
        num_chunks = int(np.ceil(video_length / step_size))
        
        # Prepare binary masks for compositing
        binary_masks = np.expand_dims(masks > 0, axis=-1).astype(np.uint8)  # (T, H, W, 1)
        comp_frames = [None] * video_length
        logger.debug(
            f"Processing {video_length} frames in {num_chunks} chunks (chunk_size={chunk_size}, overlap={overlap_size}, step={step_size}) with ROI Optimization"
        )

        import gc
        for chunk_idx in tqdm(range(num_chunks), desc="Chunk", position=0, leave=True):
            start_idx = chunk_idx * step_size
            end_idx = min(start_idx + chunk_size, video_length)
            actual_chunk_size = end_idx - start_idx
            
            # Report progress via callback if provided
            if progress_callback:
                progress_callback(chunk_idx / num_chunks)
            
            # Extract chunk data (Numpy slicing - remains in RAM)
            frames_np_chunk = frames[start_idx:end_idx]
            masks_np_chunk = masks[start_idx:end_idx]
            binary_masks_chunk = binary_masks[start_idx:end_idx]

            # --- ROI LOGIC START ---
            # 1. Calculate Union Bounding Box for the masks in this chunk
            # Collapsing T dimension to find spatial extent
            chunk_union_mask = np.max(masks_np_chunk, axis=0) # (H, W)
            y_ind, x_ind = np.where(chunk_union_mask > 0)
            
            if len(y_ind) > 0:
                y1_roi, y2_roi = y_ind.min(), y_ind.max() + 1
                x1_roi, x2_roi = x_ind.min(), x_ind.max() + 1
                
                # 2. Add Context Padding (256px)
                # "Expand this box by 256 pixels on all sides"
                padding = 256
                y1_crop = max(0, y1_roi - padding)
                y2_crop = min(h, y2_roi + padding)
                x1_crop = max(0, x1_roi - padding)
                x2_crop = min(w, x2_roi + padding)
                
                # Ensure even dimensions for model (mod 8 or 16 usually safer)
                # E2FGVI downsamples, so modulo 16 is good practice
                dh = y2_crop - y1_crop
                dw = x2_crop - x1_crop
                y2_crop -= dh % 8 # adjust to mod 8
                x2_crop -= dw % 8
                
                # logger.debug(f"Chunk {chunk_idx}: ROI Crop ({x1_crop},{y1_crop}) to ({x2_crop},{y2_crop}) size {x2_crop-x1_crop}x{y2_crop-y1_crop}")
                
                # 3. Crop Frames and Masks
                frames_crop = frames_np_chunk[:, y1_crop:y2_crop, x1_crop:x2_crop, :]
                masks_crop = masks_np_chunk[:, y1_crop:y2_crop, x1_crop:x2_crop]
                binary_masks_crop = binary_masks_chunk[:, y1_crop:y2_crop, x1_crop:x2_crop, :]
                
                # 4. Lazy load CROPS to GPU
                imgs_chunk_t, masks_chunk_t = numpy_to_tensor(frames_crop, masks_crop)
                imgs_chunk = imgs_chunk_t.to(device)
                masks_chunk = masks_chunk_t.to(device)
                
                # 5. Process Chunk (Inference on CROPS)
                with torch.cuda.amp.autocast():
                    cleaned_crops = self.process_frames_chunk(
                        actual_chunk_size,
                        self.config.neighbor_stride,
                        imgs_chunk,
                        masks_chunk,
                        binary_masks_crop,
                        frames_crop,
                        y2_crop - y1_crop, # h for crop
                        x2_crop - x1_crop, # w for crop
                    )
                
                # 6. Paste Results back to Full Frame Canvas
                # process_frames_chunk returns a list of numpy arrays (the cleaned crops)
                # We need to construct full frame results
                comp_frames_chunk = []
                for i in range(actual_chunk_size):
                    # Start with original frame
                    full_frame = frames_np_chunk[i].copy()
                    if cleaned_crops[i] is not None:
                         # Paste cleaned crop
                         full_frame[y1_crop:y2_crop, x1_crop:x2_crop] = cleaned_crops[i]
                    comp_frames_chunk.append(full_frame)
                    
                # Clean gpu memory for next chunk
                del imgs_chunk, masks_chunk, cleaned_crops
                
            else:
                # No mask in this chunk - skip inference
                comp_frames_chunk = [f.copy() for f in frames_np_chunk]

            # --- ROI LOGIC END ---

            # Merge results with blending in overlap region (using full frames)
            comp_frames = merge_frames_with_overlap(
                result_frames=comp_frames,
                chunk_frames=comp_frames_chunk,
                start_idx=start_idx,
                overlap_size=overlap_size,
                is_first_chunk=(chunk_idx == 0),
            )
            
            try:
                gc.collect()
                torch.cuda.empty_cache()
            except:
                pass
        return comp_frames


if __name__ == "__main__":
    #       --frames examples/extract_frame_and_mask_frames.npy \
    #   --masks examples/extract_frame_and_mask_masks.npy \
    import os

    import cv2

    frames_path = Path("examples/extract_frame_and_mask_frames.npy")
    masks_path = Path("examples/extract_frame_and_mask_masks.npy")
    frames_np = np.load(frames_path)
    masks_np = np.load(masks_path)
    # Convert BGR to RGB if frames are saved in BGR format
    frames_np = frames_np[:, :, :, ::-1].copy()
    cleaner = E2FGVIHDCleaner()
    comp_frames = cleaner.clean(frames_np, masks_np)

    # Save the result as video
    fps = 30
    output_video_path = "results/output.mp4"
    h, w = frames_np[0].shape[:2]

    os.makedirs("results", exist_ok=True)
    writer = cv2.VideoWriter(output_video_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    for frame in comp_frames:
        # Convert RGB to BGR for OpenCV
        writer.write(frame.astype(np.uint8)[:, :, ::-1])
    writer.release()
    logger.info(f"Video saved to: {output_video_path}")
