# RunPod Serverless Deployment Guide
## Scale-to-Zero Video Processing with Queue-Based Architecture

This guide shows you how to deploy the GPU worker using **RunPod Serverless** with true scale-to-zero billing.

## 📊 Why RunPod Serverless?

**Cost Comparison:**

| Scenario | Traditional GPU Pod | RunPod Serverless (Flex) |
|----------|---------------------|--------------------------|
| 0 jobs/day | $500+/month | **$0.00/month** |
| 10 jobs/month | $500+/month | **~$1.15/month** |
| 100 jobs/day | $500+/month | **~$346/month** |

**Key Benefits:**
- ✅ **True Scale-to-Zero**: Pay $0 when idle (`min_workers=0`)
- ✅ **Queue-Based**: Handles long video processing (30+ minutes) without timeouts
- ✅ **Pay Per Second**: Only pay for actual GPU time + cold start (~30s)
- ✅ **Auto-Scaling**: Handles traffic spikes automatically

---

## Prerequisites

1. **Docker Hub Account**: [Sign up here](https://hub.docker.com/signup)
2. **RunPod Account**: [Sign up here](https://www.runpod.io/)
3. **Funds**: Add $10 minimum to RunPod account

---

## Step 1: Build & Push Docker Image

### 1.1 Login to Docker Hub

```bash
docker login
```

### 1.2 Build the Image

```bash
cd worker
docker build -t <your-dockerhub-username>/watermark-worker:latest .
```

**⚠️ Note**: This takes 10-15 minutes. The image will be ~8GB (includes PyTorch + CUDA + AI models).

**Replace `<your-dockerhub-username>`** with your Docker Hub username.

### 1.3 Push to Docker Hub

```bash
docker push <your-dockerhub-username>/watermark-worker:latest
```

This uploads the image to Docker Hub (~5-10 minutes depending on internet speed).

---

## Step 2: Create RunPod Serverless Endpoint

### 2.1 Navigate to Serverless

1. Log in to [RunPod.io](https://www.runpod.io/)
2. Click **Serverless** in the sidebar (not "GPU Pods")
3. Click **+ New Endpoint**

### 2.2 Configure Endpoint

**Basic Settings:**
- **Name**: `watermark-remover-production`
- **Select GPU**: **RTX 4090** (recommended - 24GB VRAM, $0.00035/sec)
  - Alternative: RTX 3090 (cheaper but slower)
  - Alternative: A100 (faster but 3x more expensive)

**Container Configuration:**
- **Container Image**: `<your-dockerhub-username>/watermark-worker:latest`
- **Container Disk**: `50 GB`
- **Docker Command**: Leave blank (will use CMD from Dockerfile)

**Scaling Configuration (CRITICAL):**
- **Workers**: Select **"Queue Workers"** tab
- **Min Workers**: `0` (this enables scale-to-zero!)
- **Max Workers**: `3` (adjust based on expected traffic)
- **Idle Timeout**: `5` seconds (worker terminates if no jobs for 5s)
- **Execution Timeout**: `1800` seconds (30 minutes max per job)
- **GPU IDs**: Leave empty (RunPod auto-selects)

### 2.3 Add Environment Variables

Click **Environment Variables** and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `S3_ENDPOINT_URL` | `https://5cdcff95d2d0c5cb7c2166b52add03d6.r2.cloudflarestorage.com` | Your R2 endpoint |
| `AWS_ACCESS_KEY_ID` | `f7bc7adf99c36f6ae7a9af594a1e46f1` | Your R2 access key |
| `AWS_SECRET_ACCESS_KEY` | `53e42ac20840e2d3b36727fe2ff7dc104555e0f66a60d469db697358d293c67e` | Your R2 secret key |
| `BUCKET_NAME` | `ai-watermark-remover` | Your bucket name |

### 2.4 Deploy Endpoint

1. Click **Deploy**
2. Wait ~1 minute for endpoint to initialize
3. Copy the **Endpoint ID** (e.g., `abc123-xyz789-endpoint`)
4. Copy the **API Key** (click "Show" to reveal)

**Save these values - you'll need them for the backend integration!**

---

## Step 3: Update Backend to Use RunPod Serverless

Now we need to update your FastAPI backend to send jobs to RunPod instead of Redis/Celery.

### 3.1 Install RunPod SDK in Backend

```bash
cd backend
source venv/bin/activate
pip install runpod
pip freeze > requirements.txt
```

### 3.2 Add RunPod Configuration to Backend

Add these environment variables to Railway:

1. Go to Railway → Your Backend Service → Variables
2. Add:

| Variable | Value |
|----------|-------|
| `RUNPOD_API_KEY` | `<your-runpod-api-key>` |
| `RUNPOD_ENDPOINT_ID` | `<your-endpoint-id>` |

---

## Step 4: Test the Deployment

### 4.1 Verify Endpoint is Active

1. Go to RunPod → Serverless → Your Endpoint
2. Check status shows **"Active"**
3. Confirm **"Queue Workers: 0/3"** (0 means scale-to-zero is working!)

### 4.2 Test with a Video

1. Go to your Vercel frontend: `https://ai-watermark-remover-phi.vercel.app`
2. Upload a small test video (< 50MB recommended for first test)
3. Watch the job status page

**Expected Behavior:**
1. Status: "PENDING" → "IN_QUEUE" (job sent to RunPod)
2. Cold start happens (~30-60 seconds)
3. Status: "IN_PROGRESS" (worker processing)
4. Status: "COMPLETED" (after 2-10 minutes depending on video)

### 4.3 Monitor RunPod Dashboard

While the job runs, watch RunPod dashboard:
1. **Queue Workers**: Should show `1/3` (worker spun up)
2. **Logs**: Click endpoint → View logs to see processing output
3. After job completes + 5s idle → Workers scale back to `0/3`

---

## Cost Breakdown

### Actual Cost Example (1 Job):
- **Video Length**: 5 minutes
- **Processing Time**: 5 minutes (1:1 realtime)
- **Cold Start**: 30 seconds
- **Total Billable Time**: 330 seconds
- **Rate**: $0.00035/second (RTX 4090)
- **Cost**: `330 * $0.00035 = $0.12` per video

### Monthly Projections:

| Jobs/Month | Total Cost | Cost If Using Dedicated GPU |
|------------|------------|----------------------------|
| 0 | **$0.00** | $500+ |
| 10 | **$1.20** | $500+ |
| 100 | **$12.00** | $500+ |
| 1000 | **$120.00** | $500+ |
| 3000 | **$360.00** | $500+ |

**Break-even**: You only pay more with serverless if you process >70-80 hours of video per month.

---

## Troubleshooting

### Worker Not Starting
- **Check**: Docker image is public on Docker Hub
- **Check**: Endpoint ID and API Key are correct in Railway
- **Check**: Environment variables are set in RunPod endpoint

### Jobs Stay in Queue
- **Check**: `min_workers` is set to 0 (not disabled)
- **Check**: Account has sufficient RunPod funds
- **Check**: GPU quota allows at least 1 RTX 4090

### Cold Start Too Slow (>60s)
- **Solution**: Enable FlashBoot in RunPod settings (caches container state)
- **Solution**: Optimize Docker image size (remove unused dependencies)

### Job Times Out
- **Check**: `execution_timeout` is set to 1800+ seconds
- **Check**: Video length is within limits

---

## Production Checklist

- [ ] Docker image built and pushed to Docker Hub
- [ ] RunPod serverless endpoint created with queue workers
- [ ] `min_workers` = 0 confirmed (scale-to-zero enabled)
- [ ] Environment variables configured in RunPod
- [ ] Backend updated with RunPod API key
- [ ] Railway redeployed with new environment variables
- [ ] Test upload successful
- [ ] Workers scale to zero after idle period
- [ ] Monitoring enabled (RunPod dashboard)

---

## Scaling Strategy

As your platform grows:

**0-100 jobs/day**: 
- Keep `max_workers = 3`
- Scale-to-zero handles traffic perfectly

**100-500 jobs/day**:
- Increase `max_workers = 10`
- Consider reducing `idle_timeout` to 2s

**500+ jobs/day**:
- Set `min_workers = 1` (keep one worker warm)
- Increase `max_workers = 20+`
- Use FlashBoot for faster cold starts

---

## Next Steps

Once serverless is running:
1. Monitor costs in RunPod dashboard
2. Optimize cold start time (bake models into Docker image)
3. Set up alerts for failed jobs
4. Implement auto-retry logic for transient failures
