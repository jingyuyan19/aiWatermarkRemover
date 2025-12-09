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
