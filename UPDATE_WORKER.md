# Updating the Worker (DeMark-World)

Guide for updating the AI watermark removal worker and rebuilding the Docker image.

## Prerequisites

- DigitalOcean VPS access (for building Docker from China)
- Docker Hub account with push access
- RunPod Serverless endpoint configured

---

## Quick Update Process

### 1. SSH into DigitalOcean VPS

```bash
ssh root@<your-do-ip>
```

### 2. Navigate to Project

```bash
cd /root/aiWatermarkRemover/worker
# Or wherever the project is cloned
```

### 3. Update DeMark-World

```bash
cd demark_world
git pull origin main
cd ..
```

### 4. Build Docker Image

```bash
docker build -t <your-dockerhub-username>/watermark-worker:latest .
```

**⏱️ Takes: 10-15 minutes** (image is ~8GB with PyTorch + CUDA + models)

### 5. Push to Docker Hub

```bash
docker login  # If not already logged in
docker push <your-dockerhub-username>/watermark-worker:latest
```

**⏱️ Takes: 5-10 minutes** (upload ~8GB)

### 6. RunPod Auto-Updates

RunPod Serverless will automatically pull the new image on the **next cold start**.

To force an immediate update:
1. Go to RunPod → Serverless → Your Endpoint
2. Click **Restart** (or wait for workers to scale to zero + new job)

---

## What Gets Updated

When you pull `demark_world` changes:

| Component | Location | Description |
|-----------|----------|-------------|
| AI Models | `demark_world/src/` | Core removal algorithms |
| Video Processing | `demark_world/src/` | Frame extraction, merging |
| Dependencies | `requirements.txt` | Python packages |

Recent updates (Dec 2025):
- **Memory-aware chunksize**: Better large video handling
- **Cached PhyNet**: Faster processing (model stays in memory)

---

## First-Time Setup on DO VPS

If your VPS doesn't have the project yet:

```bash
# Clone the project
git clone https://github.com/<your-username>/aiWatermarkRemover.git
cd aiWatermarkRemover/worker

# Ensure demark_world is cloned
git clone https://github.com/linkedlist771/DeMark-World.git demark_world

# Install Docker if needed
apt update && apt install -y docker.io

# Login to Docker Hub
docker login
```

---

## Troubleshooting

### Build fails with "pip install" errors
```bash
# Clear Docker cache and rebuild
docker build --no-cache -t <username>/watermark-worker:latest .
```

### Push fails (timeout)
```bash
# Use smaller layer uploads
docker push --disable-content-trust <username>/watermark-worker:latest
```

### RunPod not picking up new image
1. Delete all workers: RunPod → Endpoint → Scale to 0
2. Submit a test job to trigger new image pull

---

## Version Tracking

After updating, note the commit hash:

```bash
cd demark_world
git log -1 --oneline
# Example: e923cdc Feature: add memory-aware chunksize
```

Record this in your deployment notes.
