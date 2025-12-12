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
chunk_size = max(1, min(video_length, self.chunk_size))
```
