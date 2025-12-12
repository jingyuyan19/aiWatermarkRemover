# Upstream Patches & Modifications

This document tracks conflicting changes or critical bug fixes applied to the upstream `demark_world` library.
If appropriate, these changes should be reapplied if the `worker/demark_world` directory is ever updated or replaced from the source.

## 1. ZeroDivisionError Fix (E2FGVI_HQ Cleaner)

**Issue:**
When processing short videos or when VRAM-based chunking results in small chunks, `chunk_size` could be calculated as less than or equal to `overlap_size`. This causes a division by zero in the loop logic.

**Files Modified:**
- `worker/demark_world/src/demark_world/cleaner/e2fgvi_hq_cleaner.py`
- `worker/demark_world/src/demark_world/utils/video_utils.py`

**The Fix:**
Added guardrails to ensure `chunk_size` is always larger than `overlap_size`.

```python
# e2fgvi_hq_cleaner.py
chunk_size = max(1, int(self.config.chunk_size_ratio * video_length))
# ...
if chunk_size <= overlap_size:
    overlap_size = max(1, int(chunk_size * 0.5))
    if overlap_size >= chunk_size:
        overlap_size = 0
```

And added a safe check for alpha blending:

```python
# video_utils.py
if overlap_end > 0:
    alpha = i / overlap_end
else:
    alpha = 1.0
```

## 2. Dependency Pinning (Intel XPU Error)

**Issue:**
`diffusers>=0.30.0` introduced code that attempts to access `torch.xpu` properties, which do not exist in the standard CUDA PyTorch build used on RunPod, causing an `AttributeError`.

**Files Modified:**
- `worker/requirements.txt`

**The Fix:**
Pinned `diffusers` to version `0.29.2`.

```text
diffusers==0.29.2
accelerate>=0.26.0
```

## 3. Import Path Correction (Remove `src.`)

**Issue:**
The upstream repository structure uses a `src/` directory, so internal imports often look like `from src.demark_world...`. When used as a subdirectory in our worker, these absolute imports fail.

**Files Modified:**
- Multiple files in `worker/demark_world/src/demark_world/**`

**The Fix:**
Run the following command to strip the `src.` prefix from all imports:

```bash
# MacOS / Linux
find worker/demark_world -name "*.py" -exec sed -i 's/from src.demark_world/from demark_world/g' {} +
```

## 4. Python 3.10 Compatibility (`StrEnum`)

**Issue:**
The upstream repository uses `StrEnum` (introduced in Python 3.11) in `schemas.py`. Our RunPod environment runs Python 3.10 (to maintain compatibility with stable PyTorch 2.1 + MMCV builds), where `StrEnum` does not exist.

**Files Modified:**
- `worker/demark_world/src/demark_world/schemas.py`

**The Fix:**
Change the `CleanerType` class inheritance from `StrEnum` back to standard `str, Enum`.

```python
# Change this (Upstream/Py3.11+):
from enum import StrEnum
class CleanerType(StrEnum):

# To this (Py3.10 Compatible):
from enum import Enum
class CleanerType(str, Enum):
```

## 5. OOM Fix (E2FGVI_HQ Dynamic Chunking)

**Issue:**
The upstream code used a hardcoded `chunk_size_ratio` (0.2) to determine chunk size, ignoring the dynamic VRAM-based `adapted_chunk_size` calculation. This caused frequent Out-Of-Memory (OOM) errors on 24GB GPUs when processing longer videos (e.g., >100 frames), as it attempted to load too many frames at once.

**Files Modified:**
- `worker/demark_world/src/demark_world/cleaner/e2fgvi_hq_cleaner.py`

**The Fix:**
Updated the `clean` method to respect the dynamically calculated `self.chunk_size` (based on free VRAM), ensuring chunks fit within memory limits.

```python
# Change this:
# chunk_size = max(1, int(self.config.chunk_size_ratio * video_length))

# To this:

## 6. OOM Fix for 4K Video (Resolution Scaling)

**Issue:**
The standard OOM fix (Section 5) assumes memory usage is roughly constant per frame (based on ~1080p). 4K videos have 4x pixels, so they consume ~4x more memory per frame. The original chunk size calculation would overestimate capacity for 4K videos, causing OOM.

**Files Modified:**
- `worker/demark_world/src/demark_world/cleaner/e2fgvi_hq_cleaner.py`

**The Fix:**
Scale the `chunk_size` limit inversely by resolution. If resolution is 4x 1080p, the chunk limit is divided by 4.

```python
h, w = frames[0].shape[:2]

# Adjust chunk size based on resolution (base: 1080p)
resolution_scale = (h * w) / (1920 * 1080)

# Add safety margin for high-res videos (fragmentation/overhead)
if resolution_scale > 1.0:
    resolution_scale *= 12.0  # Drastic penalty for 4K to avoid Activation OOM

scaled_chunk_limit = int(self.chunk_size / max(1, resolution_scale))

chunk_size = max(1, min(video_length, scaled_chunk_limit))

# CRITICAL FIX for small chunks: Cap overlap to ensure we advance by at least 1 frame
max_overlap = max(0, int(chunk_size * 0.5))
if overlap_size > max_overlap:
    overlap_size = max_overlap

if chunk_size <= overlap_size:
    overlap_size = max(0, chunk_size - 1)
```

## 7. Lazy Tensor Loading & Progress Reporting
**Issue 1:** The upstream code performs "Eager Loading", converting the *entire* video into GPU tensors at the start.
**Issue 2:** The cleaning process is a blocking call that can take minutes for high-res video, with no progress updates.

**Files Modified:**
- `worker/demark_world/src/demark_world/cleaner/e2fgvi_hq_cleaner.py`

**The Fix:**
1. Refactored `clean()` to keep frames in system RAM (NumPy) and only convert the *current chunk* to GPU tensors.
2. Added `progress_callback` argument to `clean()` and called it inside the loop.

```python
# REMOVED:
# imgs_all, masks_all = numpy_to_tensor(frames, masks)

# ADDED inside chunk loop:
frames_np_chunk = frames[start_idx:end_idx]
masks_np_chunk = masks[start_idx:end_idx]

# Lazy load to GPU: Convert only this chunk to tensor
imgs_chunk_t, masks_chunk_t = numpy_to_tensor(frames_np_chunk, masks_np_chunk)
imgs_chunk = imgs_chunk_t.to(device)
masks_chunk = masks_chunk_t.to(device)
```

## 8. Detector Process Isolation (OOM Fix)

**Issue:**
The YOLO detector accumulates massive VRAM usage (~100MB/frame, ~19GB for 4K video) that is **not** released by PyTorch's garbage collector or `empty_cache()`, even with `stream=True`. This unkillable "leak" causes OOM when the Cleaner subsequently tries to load.

**Files Modified:**
- `worker/demark_world/src/demark_world/core.py`: Refactored to run detection in a **subprocess**.
- `worker/demark_world/run_detection.py`: New standalone script for the subprocess.

**The Fix:**
Moved detection to a separate process. When `run_detection.py` exits, the Operating System enforces a hard reclamation of all GPU resources, guaranteeing a clean slate for the Cleaner.

```python
# core.py
subprocess.run([sys.executable, "run_detection.py", ...], check=True)
# Results loaded from pickle file
```
