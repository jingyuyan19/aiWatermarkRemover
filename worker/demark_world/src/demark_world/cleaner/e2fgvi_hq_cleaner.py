import os
# [CRITICAL] Set this BEFORE any other torch code/imports to fix fragmentation
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:128"

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




    def get_union_bbox(self, masks, pad=128):
        """Returns (h, w, y1, y2, x1, x2) of the union bbox for a stack of masks with padding."""
        if len(masks) == 0: return 0, 0, 0, 0, 0, 0
        
        # Optimization: Use numpy to project masks to 1D axes
        union_mask = np.max(masks, axis=0) # Collapse Time
        rows = np.any(union_mask, axis=1)
        cols = np.any(union_mask, axis=0)
        
        if not np.any(rows): return 0, 0, 0, 0, 0, 0
        
        y_min, y_max = np.where(rows)[0][[0, -1]]
        x_min, x_max = np.where(cols)[0][[0, -1]]
        
        h_frame, w_frame = masks.shape[1], masks.shape[2]
        
        y1 = max(0, y_min - pad)
        y2 = min(h_frame, y_max + 1 + pad)
        x1 = max(0, x_min - pad)
        x2 = min(w_frame, x_max + 1 + pad)
        
        # Ensure dimensions are even (mod 8 for safety)
        dh = y2 - y1
        dw = x2 - x1
        y2 -= dh % 8
        x2 -= dw % 8
        
        return (y2-y1), (x2-x1), y1, y2, x1, x2

    def clean(self, frames: np.ndarray, masks: np.ndarray, progress_callback=None) -> List[np.ndarray]:
        video_length = len(frames)
        h, w = frames[0].shape[:2]
        
        # v1.21 Self-Healing Loop
        # Budget limit for 24GB VRAM (Safe Zone)
        VOXEL_BUDGET = 45_000_000 
        PAD = 72
        MAX_T = 60
        MIN_T = 5
        
        # Prepare binary masks for compositing
        binary_masks = np.expand_dims(masks > 0, axis=-1).astype(np.uint8)  # (T, H, W, 1)
        comp_frames = [None] * video_length
        
        logger.info(f"Starting Self-Healing Cleaning (v1.21): {video_length} frames, Budget={VOXEL_BUDGET/1e6:.1f}M, Pad={PAD}")

        import gc
        torch.cuda.empty_cache()
        gc.collect()
        
        cursor = 0
        pbar = tqdm(total=video_length, desc="Self-Healing Progress", position=0, leave=True)
        
        while cursor < video_length:
            # 1. Optimistic Proposal
            proposal_t = min(MAX_T, video_length - cursor)
            
            # 2. Budget Negotiation Loop
            final_t = proposal_t
            final_h, final_w = 0, 0
            y1, y2, x1, x2 = 0, 0, 0, 0
            
            # Find largest safe T based on Budget
            while True:
                masks_slice = masks[cursor : cursor + final_t]
                
                # v1.22 Optimization B: Spatial Clustering (Fix "Static Bloat")
                final_rois = self.optimize_roi_strategy(masks_slice, PAD)
                
                # Calculate total cost of all ROIs
                total_cost = 0
                max_h, max_w = 0, 0
                
                for roi_params in final_rois:
                     # h, w, y1, y2, x1, x2
                     h_r, w_r, _, _, _, _ = roi_params
                     total_cost += final_t * h_r * w_r
                     if h_r > max_h: max_h = h_r
                     if w_r > max_w: max_w = w_r
                
                # If no mask (empty rois), cost is 0
                if total_cost == 0:
                    final_h, final_w = 0, 0
                    break
                
                if total_cost <= VOXEL_BUDGET:
                    # ACCEPT
                    final_h, final_w = max_h, max_w # Just for log
                    break
                else:
                    area = 1
                    for roi_params in final_rois:
                         h_r, w_r, _, _, _, _ = roi_params
                         area += h_r * w_r
                         
                    ideal_t = int(VOXEL_BUDGET / area)
                    next_t = min(final_t - 1, ideal_t)
                    
                    if next_t < MIN_T:
                        final_t = MIN_T
                        final_rois = self.optimize_roi_strategy(masks[cursor:cursor+final_t], PAD)
                        break
                    
                    final_t = next_t

            # 3. REACTIVE EXECUTION (Safety Net)
            success = False
            attempt_t = final_t
            
            while not success:
                try:
                    # If retrying, recalculate ROIs for smaller T
                    if attempt_t != final_t:
                        masks_slice = masks[cursor : cursor + attempt_t]
                        final_rois = self.optimize_roi_strategy(masks_slice, PAD)
                    
                    end_idx = cursor + attempt_t
                    actual_chunk_size = attempt_t
                    
                    if progress_callback:
                        progress_callback(cursor / video_length)

                    if len(final_rois) > 0 and final_rois[0][0] > 0:
                        # Process each ROI
                        comp_frames_chunk = [frames[i].copy() for i in range(cursor, end_idx)]
                        
                        frames_np_chunk = frames[cursor:end_idx]
                        masks_np_chunk = masks[cursor:end_idx]
                        binary_masks_chunk = binary_masks[cursor:end_idx]

                        roi_idx = 0
                        for (h_crop, w_crop, y1, y2, x1, x2) in final_rois:
                            roi_idx += 1
                            if h_crop == 0 or w_crop == 0: continue
                            
                            frames_crop = frames_np_chunk[:, y1:y2, x1:x2, :]
                            masks_crop = masks_np_chunk[:, y1:y2, x1:x2]
                            binary_masks_crop = binary_masks_chunk[:, y1:y2, x1:x2, :]
                            
                            imgs_chunk_t, masks_chunk_t = numpy_to_tensor(frames_crop, masks_crop)
                            imgs_chunk = imgs_chunk_t.to(device)
                            masks_chunk = masks_chunk_t.to(device)
                            
                            msg = f"Proc {cursor}-{end_idx} (T={attempt_t}, ROI#{roi_idx}={w_crop}x{h_crop})"
                            pbar.set_description(msg)
                            
                            with torch.cuda.amp.autocast():
                                cleaned_crops = self.process_frames_chunk(
                                    actual_chunk_size,
                                    self.config.neighbor_stride,
                                    imgs_chunk,
                                    masks_chunk,
                                    binary_masks_crop,
                                    frames_crop,
                                    h_crop,
                                    w_crop,
                                )
                            
                            # Paste back onto the compositing frames
                            for i in range(actual_chunk_size):
                                if cleaned_crops[i] is not None:
                                    comp_frames_chunk[i][y1:y2, x1:x2] = cleaned_crops[i]
                            
                            del imgs_chunk, masks_chunk, cleaned_crops
                        
                    else:
                        # No mask
                         comp_frames_chunk = [frames[i].copy() for i in range(cursor, end_idx)]

                    success = True

                except RuntimeError as e:
                    if "out of memory" in str(e):
                        logger.warning(f"!!! OOM at T={attempt_t}. Retrying with T={attempt_t//2} !!!")
                        torch.cuda.empty_cache()
                        gc.collect()
                        
                        new_t = attempt_t // 2
                        if new_t < MIN_T:
                             logger.error("CRITICAL: Segment too complex even for Min Chunk.")
                             raise e
                        attempt_t = new_t
                    else:
                        raise e

            # 4. Advance
            # Use attempt_t (the actual successful duration)
            overlap_size = 6 if attempt_t > 15 else 2
            
            comp_frames = merge_frames_with_overlap(
                result_frames=comp_frames,
                chunk_frames=comp_frames_chunk,
                start_idx=cursor,
                overlap_size=overlap_size,
                is_first_chunk=(cursor == 0),
            )
            
            step = max(1, attempt_t - overlap_size)
            cursor += step
            pbar.update(step)
            
            # Aggressive cleanup for v1.21
            try:
                gc.collect()
                torch.cuda.empty_cache()
            except:
                pass
        
        pbar.close()
        return comp_frames

    def optimize_roi_strategy(self, masks_slice, padding):
        """
        v1.22: Spatial Clustering to fix "Static Bloat".
        If the Union BBox is huge but mostly empty (two distant watermarks),
        split it into separate ROIs.
        """
        # 1. Standard Union BBox
        h_raw, w_raw, y1, y2, x1, x2 = self.get_union_bbox(masks_slice, pad=padding)
        if h_raw == 0: return []
        
        giant_area = h_raw * w_raw
        
        # 2. Try Clustering
        try:
            union_mask = np.max(masks_slice, axis=0)
            
            # Try cv2 first (fastest)
            try:
                import cv2
                num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(union_mask, connectivity=8)
                # stats: [x, y, w, h, area]
                # Label 0 is background
                clusters = []
                total_cluster_area = 0
                
                if num_labels > 2: # Background + at least 2 components
                    for i in range(1, num_labels):
                        x = stats[i, cv2.CC_STAT_LEFT]
                        y = stats[i, cv2.CC_STAT_TOP]
                        w = stats[i, cv2.CC_STAT_WIDTH]
                        h = stats[i, cv2.CC_STAT_HEIGHT]
                        
                        # Add padding
                        cx1 = max(0, x - padding)
                        cy1 = max(0, y - padding)
                        cx2 = min(union_mask.shape[1], x + w + padding)
                        cy2 = min(union_mask.shape[0], y + h + padding)
                        
                        ch = cy2 - cy1
                        cw = cx2 - cx1
                        
                        # Ensure divisible by 8 (model requirement)
                        ch = (ch // 8) * 8
                        cw = (cw // 8) * 8
                        if ch == 0 or cw == 0: continue
                        
                        clusters.append((ch, cw, cy1, cy1+ch, cx1, cx1+cw))
                        total_cluster_area += ch * cw
                        
                    # Decision: Is splitting cheaper?
                    # If clusters use < 70% of the giant box, SPLIT.
                    if total_cluster_area < 0.7 * giant_area:
                        # logger.info(f"Spatial Clustering: Split giant ROI ({giant_area} px) into {len(clusters)} chunks ({total_cluster_area} px)")
                        return clusters

            except ImportError:
                 pass # Fallback to Single

        except Exception as e:
            logger.warning(f"Clustering failed: {e}. Using Single ROI.")
            
        # Default: Single Giant ROI
        return [(h_raw, w_raw, y1, y2, x1, x2)]


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
