# RunPod Worker Deployment Guide

This guide will help you deploy the GPU worker to RunPod to process watermark removal jobs.

## Prerequisites

- Docker Desktop installed and running
- Docker Hub account ([sign up](https://hub.docker.com/signup))
- RunPod account ([sign up](https://www.runpod.io/))
- Railway Redis URL (from Railway dashboard)

---

## Step 1: Build and Push Docker Image

### 1.1 Login to Docker Hub

```bash
docker login
```

Enter your Docker Hub username and password when prompted.

### 1.2 Build the Worker Image

```bash
cd worker
docker build -t <your-dockerhub-username>/watermark-worker:latest .
```

**Replace `<your-dockerhub-username>`** with your actual Docker Hub username.

**⚠️ Note**: This build will take 10-15 minutes because it:
- Downloads AI model weights (~4GB)
- Installs PyTorch with CUDA support
- Sets up video processing libraries

### 1.3 Push to Docker Hub

```bash
docker push <your-dockerhub-username>/watermark-worker:latest
```

This will upload the image (~8GB) to Docker Hub.

---

## Step 2: Get Railway Redis URL

1. Go to [Railway](https://railway.app) → Your Project
2. Click on the **Redis** service
3. Go to the **Connect** tab
4. Copy the **Private URL** (it should look like: `redis://default:password@hostname:6379`)

**Save this URL** - you'll need it in Step 4.

---

## Step 3: Create RunPod GPU Pod

### 3.1 Login to RunPod

1. Go to [RunPod.io](https://www.runpod.io/) and log in
2. Add funds to your account (minimum $10 recommended)

### 3.2 Deploy Pod

1. Click **Deploy** → **GPU Pod**
2. Select a GPU:
   - **Recommended**: RTX 4090 (24GB VRAM, ~$0.34/hour)
   - **Budget**: RTX 3090 (24GB VRAM, ~$0.24/hour)
   - **High-end**: A100 80GB (~$1.10/hour)

3. Choose deployment type:
   - Select **On-Demand** (more expensive but always available)
   - OR **Spot** (50% cheaper but can be interrupted)

4. Configure template:
   - Click **Custom** or **Docker Image**
   - In "Docker Image" field, enter: `<your-dockerhub-username>/watermark-worker:latest`
   - Set **Container Disk**: 50 GB
   - Enable **Expose HTTP Ports**: No (not needed)
   - Enable **Expose TCP Ports**: No (not needed)

---

## Step 4: Configure Environment Variables

In the RunPod pod configuration, add these environment variables:

| Variable | Value | Where to Get It |
|----------|-------|-----------------|
| `REDIS_URL` | `redis://...` | Railway → Redis → Connect → Private URL |
| `S3_ENDPOINT_URL` | `https://5cdcff95d2d0c5cb7c2166b52add03d6.r2.cloudflarestorage.com` | Your R2 endpoint |
| `AWS_ACCESS_KEY_ID` | `f7bc7adf99c36f6ae7a9af594a1e46f1` | Your R2 access key |
| `AWS_SECRET_ACCESS_KEY` | `53e42ac20840e2d3b36727fe2ff7dc104555e0f66a60d469db697358d293c67e` | Your R2 secret key |
| `BUCKET_NAME` | `ai-watermark-remover` | Your bucket name |

**Important**: Make sure the `REDIS_URL` includes the **full connection string** with password.

---

## Step 5: Deploy and Verify

1. Click **Deploy** on RunPod
2. Wait 2-3 minutes for the pod to start
3. Once running, click on the pod to view logs
4. Look for this message in the logs:

```
celery@... ready.
```

This means the worker is running and listening for jobs!

---

## Step 6: Test End-to-End

1. Go to your Vercel frontend: `https://ai-watermark-remover-phi.vercel.app`
2. Upload a small test video
3. Watch the job status page
4. The status should change from "PENDING" → "PROCESSING" → "COMPLETED"
5. Download the processed video!

---

## Cost Estimates

| GPU | Cost/Hour | Monthly (24/7) | Recommended Usage |
|-----|-----------|----------------|-------------------|
| RTX 3090 | $0.24 | ~$175 | Development/Testing |
| RTX 4090 | $0.34 | ~$250 | Production (Small) |
| A100 80GB | $1.10 | ~$800 | Production (High Volume) |

**Tip**: For development, use **On-Demand** and **stop the pod** when not in use to save money.

---

## Troubleshooting

### Worker not connecting to Redis

- Verify `REDIS_URL` is correct
- Railway Redis might need external network access enabled
- Check RunPod logs for connection errors

### Worker crashes on startup

- Check RunPod logs for error messages
- Common issues:
  - Out of disk space (increase Container Disk)
  - Out of memory (use larger GPU)
  - CUDA errors (ensure you selected a CUDA-compatible GPU)

### Jobs stay in PENDING

- Check if worker pod is running
- Check worker logs for errors
- Verify `REDIS_URL` matches between backend and worker

---

## Scaling

To handle more concurrent jobs:

1. **Option A**: Deploy multiple worker pods
   - Each pod will pick up jobs from the same Redis queue
   - Celery automatically distributes work

2. **Option B**: Use a larger GPU
   - A100 can process videos faster than RTX 3090

---

## Next Steps

Once the worker is running successfully:

- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Implement auto-scaling based on queue depth
- [ ] Add webhook notifications for job completion
- [ ] Set up automated backups for database
