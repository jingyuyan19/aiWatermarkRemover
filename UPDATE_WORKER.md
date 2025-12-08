# Updating the Worker (DeMark-World)

Complete guide for updating the AI watermark removal worker when the upstream DeMark-World repository receives updates.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites & VPS Access](#prerequisites--vps-access)
3. [Complete Update Workflow (Copy-Paste)](#complete-update-workflow-copy-paste)
4. [Detailed Step-by-Step Guide](#detailed-step-by-step-guide)
5. [Handling Merge Conflicts](#handling-merge-conflicts)
6. [Your Custom Modifications](#your-custom-modifications)
7. [Troubleshooting](#troubleshooting)
8. [Version History](#version-history)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     THE UPDATE PIPELINE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. linkedlist771/DeMark-World  (Original Upstream)                 │
│        ↓ git fetch upstream                                         │
│                                                                      │
│  2. jingyuyan19/DeMark-World    (Your GitHub Fork)                  │
│        ↓ git merge + fix imports + push                             │
│                                                                      │
│  3. DigitalOcean VPS            (Build Machine - bypasses GFW)      │
│        ↓ git pull + docker build                                    │
│                                                                      │
│  4. Docker Hub                   (Image Registry)                   │
│        ↓ docker push                                                │
│                                                                      │
│  5. RunPod Serverless           (GPU Worker pulls new image)        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites & VPS Access

### Your DigitalOcean VPS

| Field | Value |
|-------|-------|
| **IP Address** | `YOUR_VPS_IP` (update this!) |
| **SSH User** | `root` |
| **SSH Key** | Located at `~/.ssh/id_rsa` |
| **Project Path** | `/root/aiWatermarkRemover` |

### Required Tools Installed on VPS

- ✅ Docker (with buildx)
- ✅ Git
- ✅ Docker Hub login saved

### First-Time VPS Setup

```bash
# 1. SSH into VPS
ssh root@YOUR_VPS_IP

# 2. Install Docker (if not already)
curl -fsSL https://get.docker.com | sh

# 3. Login to Docker Hub (one-time)
docker login
# Enter: your Docker Hub username and password/token

# 4. Clone your project
git clone https://github.com/jingyuyan19/aiWatermarkRemover.git
cd aiWatermarkRemover

# 5. Clone DeMark-World into worker directory
cd worker
git clone https://github.com/jingyuyan19/DeMark-World.git demark_world
```

---

## Complete Update Workflow (Copy-Paste)

**When upstream has updates, run these commands in order:**

### On Your Local Machine (Mac)

```bash
# Step 1: Sync your DeMark-World fork with upstream
cd ~/path/to/DeMark-World  # Your local clone of your fork
git fetch upstream
git checkout main
git merge upstream/main

# Step 2: Fix import paths (required after every merge!)
find src -type f -name "*.py" -exec sed -i '' 's/from src\.demark_world/from demark_world/g' {} \;
find src -type f -name "*.py" -exec sed -i '' 's/import src\.demark_world/import demark_world/g' {} \;

# Step 3: Commit and push
git add .
git commit -m "sync: merge upstream + fix import paths"
git push origin main
```

### On DigitalOcean VPS

```bash
# Step 4: SSH into VPS
ssh root@YOUR_VPS_IP

# Step 5: Update and rebuild
cd /root/aiWatermarkRemover/worker

# Backup current (just in case)
cp -r demark_world demark_world_backup_$(date +%Y%m%d)

# Pull latest from your fork
cd demark_world
git pull origin main
cd ..

# Build new Docker image
docker build -t jingyuyan19/watermark-worker:latest .

# Push to Docker Hub
docker push jingyuyan19/watermark-worker:latest

# Clean up old backups (keep last 3)
ls -dt demark_world_backup_* | tail -n +4 | xargs rm -rf

echo "✅ Update complete! RunPod will pull new image on next cold start."
```

### Force RunPod to Use New Image

1. Go to [RunPod Console](https://www.runpod.io/console/serverless)
2. Open your endpoint
3. Click **Restart Workers** or wait for auto-scale to 0 + new job

---

## Detailed Step-by-Step Guide

### Step 1: Check for Upstream Updates

```bash
# On your local machine
cd ~/path/to/DeMark-World
git fetch upstream
git log upstream/main --oneline -5
```

Compare with your current version:
```bash
git log main --oneline -5
```

### Step 2: Merge Upstream Changes

```bash
git checkout main
git merge upstream/main
```

**Common outcomes:**
- ✅ `Already up to date.` → No updates available
- ✅ `Fast-forward` → Clean merge, no conflicts
- ⚠️ `CONFLICT` → Manual resolution needed (see section below)

### Step 3: Fix Import Paths (CRITICAL!)

Your Docker setup uses `PYTHONPATH=/app/demark_world_code/src`, which means all imports must be:
- ✅ `from demark_world.xxx`
- ❌ ~~`from src.demark_world.xxx`~~

Run this after every merge:

```bash
# macOS
find src -type f -name "*.py" -exec sed -i '' 's/from src\.demark_world/from demark_world/g' {} \;
find src -type f -name "*.py" -exec sed -i '' 's/import src\.demark_world/import demark_world/g' {} \;

# Linux (on VPS)
find src -type f -name "*.py" -exec sed -i 's/from src\.demark_world/from demark_world/g' {} \;
find src -type f -name "*.py" -exec sed -i 's/import src\.demark_world/import demark_world/g' {} \;
```

### Step 4: Test Locally (Optional)

```bash
# Quick import test
cd src
python -c "from demark_world import DeMarkWorld; print('✅ Imports OK')"
```

### Step 5: Push to Your Fork

```bash
git add .
git commit -m "sync: merge upstream $(git log upstream/main --oneline -1 | cut -d' ' -f1)"
git push origin main
```

### Step 6: Build on VPS

```bash
ssh root@YOUR_VPS_IP
cd /root/aiWatermarkRemover/worker/demark_world
git pull origin main
cd ..
docker build -t jingyuyan19/watermark-worker:latest .
# ⏱️ Takes: 10-15 minutes
```

### Step 7: Push to Docker Hub

```bash
docker push jingyuyan19/watermark-worker:latest
# ⏱️ Takes: 5-10 minutes
```

---

## Handling Merge Conflicts

### Most Common Conflicts

| File | Reason | Resolution |
|------|--------|------------|
| `*.py` with imports | Your import path fixes | Keep YOUR version (with `from demark_world`) |
| `requirements.txt` | Dependency updates | Merge both (upstream deps + yours) |
| New files | Upstream added new features | Accept ALL upstream changes, then run sed fix |

### Step-by-Step Conflict Resolution

```bash
# 1. See what's conflicted
git status

# 2. Open conflicted file
# Look for conflict markers:
# <<<<<<< HEAD
# (your changes)
# =======
# (upstream changes)
# >>>>>>> upstream/main

# 3. For import-related conflicts, keep your version:
# Keep: from demark_world.xxx
# Remove: from src.demark_world.xxx

# 4. Mark as resolved
git add <conflicted-file>

# 5. After all conflicts resolved
git commit -m "merge: resolve conflicts with upstream"
```

### Using VS Code for Conflicts

```bash
code .  # Opens in VS Code
# Click "Accept Current Change" for import-related conflicts
# Click "Accept Incoming Change" for new features/fixes
# Click "Accept Both Changes" when both are needed
```

---

## Your Custom Modifications

### What You Changed (And Why)

**All ~101 modified files have the SAME change:**

```python
# Original (upstream):
from src.demark_world.xxx import yyy

# Your version:
from demark_world.xxx import yyy
```

This is required because your Dockerfile sets:
```dockerfile
ENV PYTHONPATH=/app/demark_world_code/src
```

### Files Most Likely to Conflict

```
src/demark_world/
├── watermark_cleaner.py     # Core - many imports
├── watermark_detector.py    # Core - many imports
├── cleaner/lama_cleaner.py  # Model loader
├── cleaner/e2fgvi_hq_cleaner.py  # Model loader
└── iopaint/**/             # Many submodules
```

### Automation Script (Save This!)

Create `~/scripts/fix-demark-imports.sh`:

```bash
#!/bin/bash
# Fixes DeMark-World imports after upstream merge
# Usage: ./fix-demark-imports.sh /path/to/DeMark-World

if [ -z "$1" ]; then
    echo "Usage: $0 /path/to/DeMark-World"
    exit 1
fi

cd "$1" || exit 1

echo "Fixing import paths..."
find src -type f -name "*.py" -exec sed -i '' 's/from src\.demark_world/from demark_world/g' {} \;
find src -type f -name "*.py" -exec sed -i '' 's/import src\.demark_world/import demark_world/g' {} \;

echo "Checking for remaining bad imports..."
grep -r "from src.demark_world" src --include="*.py" | wc -l
grep -r "import src.demark_world" src --include="*.py" | wc -l

echo "✅ Done! Check counts above should be 0."
```

```bash
chmod +x ~/scripts/fix-demark-imports.sh
```

---

## Troubleshooting

### Build Fails After Update

```bash
# Clear Docker cache and rebuild
docker build --no-cache -t jingyuyan19/watermark-worker:latest .
```

### Import Errors in Logs

```
ModuleNotFoundError: No module named 'src.demark_world'
```

**Fix:** You missed running the sed command. Re-run import fixes:

```bash
cd demark_world
find src -type f -name "*.py" -exec sed -i 's/from src\.demark_world/from demark_world/g' {} \;
find src -type f -name "*.py" -exec sed -i 's/import src\.demark_world/import demark_world/g' {} \;
```

### Rollback to Previous Version

```bash
# On VPS
cd /root/aiWatermarkRemover/worker
ls demark_world_backup_*  # See available backups

rm -rf demark_world
cp -r demark_world_backup_YYYYMMDD demark_world

docker build -t jingyuyan19/watermark-worker:latest .
docker push jingyuyan19/watermark-worker:latest
```

### VPS Disk Full

```bash
# Clean up Docker
docker system prune -a -f

# Remove old backups
ls -dt demark_world_backup_* | tail -n +2 | xargs rm -rf
```

### Docker Hub Push Fails

```bash
# Re-login
docker logout
docker login

# Or use token instead of password
# Get token: https://hub.docker.com/settings/security
```

---

## Version History

Track your updates here after each sync:

| Date | Upstream Commit | Notes |
|------|-----------------|-------|
| 2025-12-08 | `e923cdc` | Memory-aware chunksize, PhyNet cache |
| _next_ | `_______` | _description_ |

---

## Quick Reference Card

```
╔══════════════════════════════════════════════════════════════╗
║                    DEMARK-WORLD UPDATE                       ║
╠══════════════════════════════════════════════════════════════╣
║ 1. LOCAL:  cd DeMark-World && git fetch upstream            ║
║ 2. LOCAL:  git merge upstream/main                           ║
║ 3. LOCAL:  find src ... sed (fix imports)                    ║
║ 4. LOCAL:  git push origin main                              ║
║ 5. VPS:    ssh root@YOUR_VPS_IP                              ║
║ 6. VPS:    cd /root/aiWatermarkRemover/worker/demark_world  ║
║ 7. VPS:    git pull && cd .. && docker build && docker push ║
║ 8. RUNPOD: Restart workers or wait for cold start           ║
╚══════════════════════════════════════════════════════════════╝
```
