# Updating the Worker (DeMark-World)

Guide for updating the AI watermark removal worker and rebuilding the Docker image.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ linkedlist771/DeMark-World (Original Upstream)                  │
│   ↓ fork                                                        │
│ jingyuyan19/DeMark-World (Your Fork - with custom modifications)│
│   ↓ copy                                                        │
│ worker/demark_world/ (Embedded in your project)                 │
│   ↓ docker build                                                │
│ Docker Hub: <username>/watermark-worker:latest                  │
│   ↓ pull                                                        │
│ RunPod Serverless (GPU Worker)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- DigitalOcean VPS access (for Docker builds from China)
- Docker Hub account with push access
- GitHub fork of DeMark-World
- RunPod Serverless endpoint configured

---

## One-Time Setup: Create Your Fork

### Step 1: Fork DeMark-World

1. Go to https://github.com/linkedlist771/DeMark-World
2. Click **Fork** → Create fork under your account
3. Your fork: `https://github.com/<your-username>/DeMark-World`

### Step 2: Add Upstream Remote (on your fork)

```bash
git clone https://github.com/<your-username>/DeMark-World.git
cd DeMark-World
git remote add upstream https://github.com/linkedlist771/DeMark-World.git
git remote -v
# Should show:
# origin    https://github.com/<your-username>/DeMark-World.git
# upstream  https://github.com/linkedlist771/DeMark-World.git
```

### Step 3: Apply Your Custom Modifications

Your project has custom modifications in these files:
- `src/demark_world/iopaint/model/anytext/cldm/ddim_hacked.py`
- `src/demark_world/iopaint/model/anytext/cldm/embedding_manager.py`
- `src/demark_world/iopaint/model/anytext/cldm/hack.py`
- `src/demark_world/iopaint/model/anytext/cldm/model.py`

Copy these from your current `worker/demark_world/` to your fork and commit:

```bash
# Copy modified files to fork, then:
git add .
git commit -m "feat: custom modifications for Vanishly"
git push origin main
```

---

## Regular Update Process

### When Upstream Has New Features

#### Step 1: Sync Your Fork with Upstream

```bash
cd /path/to/your/DeMark-World-fork
git fetch upstream
git checkout main
git merge upstream/main
```

**If conflicts:**
```bash
# Resolve conflicts in modified files
git add .
git commit -m "merge: sync with upstream + preserve custom mods"
```

```bash
git push origin main
```

#### Step 2: Update Worker Directory (on DO VPS)

```bash
ssh root@<your-do-ip>
cd /root/aiWatermarkRemover/worker

# Backup current
cp -r demark_world demark_world_backup

# Fresh copy from your fork
rm -rf demark_world
git clone --depth 1 https://github.com/<your-username>/DeMark-World.git demark_world
```

#### Step 3: Rebuild Docker Image

```bash
docker build -t <your-dockerhub-username>/watermark-worker:latest .
```

**⏱️ Takes: 10-15 minutes**

#### Step 4: Push to Docker Hub

```bash
docker login  # If not already logged in
docker push <your-dockerhub-username>/watermark-worker:latest
```

**⏱️ Takes: 5-10 minutes**

#### Step 5: RunPod Updates Automatically

RunPod Serverless pulls new image on next cold start.

To force immediate update:
1. RunPod → Serverless → Your Endpoint
2. Click **Restart** or wait for scale-to-zero + new job

---

## Quick Reference Commands

```bash
# === SYNC FORK ===
cd DeMark-World-fork
git fetch upstream && git merge upstream/main && git push origin main

# === UPDATE WORKER ===
ssh root@<do-ip>
cd /root/aiWatermarkRemover/worker
rm -rf demark_world
git clone --depth 1 https://github.com/<user>/DeMark-World.git demark_world
docker build -t <user>/watermark-worker:latest .
docker push <user>/watermark-worker:latest
```

---

## What Gets Updated

| Component | Source | Description |
|-----------|--------|-------------|
| AI Models | `demark_world/src/` | Core removal algorithms |
| Video Processing | `demark_world/src/` | Frame extraction, merging |
| Memory Optimization | `demark_world/src/` | GPU memory handling |

**Recent Upstream Updates (Dec 2025):**
- ✅ Memory-aware chunksize (better large video handling)
- ✅ Cached PhyNet (faster processing)

---

## Version Tracking

After updating, record the commit hash:

```bash
cd demark_world
git log -1 --oneline
# Example: e923cdc Feature: add memory-aware chunksize
```

Add to deployment notes or `.env`:
```
DEMARK_VERSION=e923cdc
```

---

## Troubleshooting

### Merge Conflicts During Sync

```bash
# See conflicting files
git status

# For each conflict, manually edit to keep both upstream + your changes
git add <resolved-file>
git commit -m "merge: resolve conflicts"
```

### Build Fails After Update

```bash
# Clear Docker cache
docker build --no-cache -t <user>/watermark-worker:latest .
```

### Rollback to Previous Version

```bash
# On DO VPS
rm -rf demark_world
mv demark_world_backup demark_world
docker build -t <user>/watermark-worker:latest .
docker push <user>/watermark-worker:latest
```

---

## When to Update

| Scenario | Action |
|----------|--------|
| **Upstream has bug fix** | Update immediately |
| **Upstream has new feature** | Evaluate, then update |
| **Your worker is working fine** | No rush to update |
| **Processing errors appear** | Check if upstream has fix |

---

## Files You've Modified

These files have custom modifications - be careful during merges:

```
src/demark_world/iopaint/model/anytext/cldm/
├── ddim_hacked.py       ← Modified
├── embedding_manager.py ← Modified
├── hack.py              ← Modified
└── model.py             ← Modified
```

When merging upstream, always check these files for conflicts.

