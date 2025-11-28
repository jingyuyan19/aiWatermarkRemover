# AI Video Watermark Removal SaaS

A full-stack SaaS platform for removing watermarks from AI-generated videos using [DeMark-World](https://github.com/linkedlist771/DeMark-World).

## 🌟 Features

- **Universal Watermark Removal**: Supports Sora 2, Veo 3, Runway Gen-4, Kling 1.5/1.6, Luma Dream Machine, Pika 2, and more
- **Multiple Quality Options**: Fast (LaMa) and High Quality (E2FGVI_HQ) processing modes
- **Modern UI**: Beautiful drag-and-drop interface built with Next.js 15 and Tailwind CSS
- **Scalable Architecture**: FastAPI backend with Celery workers on GPU instances
- **Cloud Storage**: Direct uploads to Cloudflare R2 (S3-compatible)

## 📚 Documentation

- **[Deployment Guide](DEPLOYMENT.md)** - Step-by-step production deployment
- **[API Documentation](API.md)** - Complete API reference
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project

## 🏗️ Architecture

```
Frontend (Next.js 15)
    ↓ Upload Request
Backend (FastAPI)
    ↓ Job Queue (Redis)
Worker (Celery on GPU)
    ↓ DeMark-World Processing
Storage (Cloudflare R2)
```

## 📁 Project Structure

```
/
├── frontend/         # Next.js application
├── backend/          # FastAPI server
│   ├── main.py       # API endpoints
│   ├── database.py   # SQLAlchemy setup
│   ├── models.py     # Database models
│   └── schemas.py    # Pydantic schemas
├── worker/           # GPU worker
│   ├── demark_world/ # Cloned DeMark-World repo
│   ├── tasks.py      # Celery tasks
│   └── Dockerfile    # GPU Docker image
└── docker-compose.yml
```

## 🚀 Quick Start (Local Development)

### Prerequisites

- Python 3.12
- Node.js 18+
- Docker & Docker Compose
- FFmpeg

### Quick Start

```bash
# Run the setup script
./start-dev.sh

# This will start Redis and PostgreSQL
# Follow the printed instructions to start backend and frontend
```

### Manual Setup

### 1. Clone the Repository

```bash
cd aiWatermarkRemover
```

### 2. Set Up Environment Variables

Copy `.env.template` and fill in your values:

```bash
cp .env.template .env
```

You'll need:
- **PostgreSQL** database URL (or use local Docker)
- **Redis** URL (or use local Docker)
- **Cloudflare R2** credentials (or AWS S3)

### 3. Start Backend Services (Local)

```bash
# Start Redis & PostgreSQL
docker-compose up redis postgres -d

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Run backend
uvicorn main:app --reload
```

Backend will be available at `http://localhost:8000`

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:3000`

### 5. Start Worker (GPU Required)

The worker requires a GPU for processing. For local development without GPU, you can skip this step.

```bash
cd worker
pip install -r requirements.txt

# Make sure REDIS_URL and S3 credentials are set
celery -A tasks worker --loglevel=info
```

## 📦 Production Deployment

### Backend + Database + Redis (Railway)

1. **Create a new project on [Railway](https://railway.app)**
2. **Add PostgreSQL and Redis services** from Railway's marketplace
3. **Deploy backend**:
   ```bash
   cd backend
   railway up
   ```
4. **Set environment variables** in Railway dashboard (see `.env.template`)

### Frontend (Vercel)

1. **Connect your repo to [Vercel](https://vercel.com)**
2. **Set root directory to `frontend/`**
3. **Add environment variable**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```
4. Deploy

### Worker (RunPod / Vast.ai)

Since Railway doesn't support GPU instances, deploy the worker separately:

#### Option 1: RunPod

1. Go to [RunPod](https://www.runpod.io/)
2. Create a new pod with **A100 40GB** or **RTX 4090**
3. Use the custom Docker image:
   ```bash
   cd worker
   docker build -t your-username/watermark-worker .
   docker push your-username/watermark-worker
   ```
4. Deploy the image on RunPod
5. Set environment variables (REDIS_URL, S3 credentials)

#### Option 2: Vast.ai (Cheaper)

1. Go to [Vast.ai](https://vast.ai/)
2. Select a GPU instance (RTX 3090/4090 recommended)
3. Use the same Docker image as above
4. Configure environment variables

### Storage (Cloudflare R2)

1. **Create an R2 bucket** on Cloudflare
2. **Enable public access** for the bucket (so users can download results)
3. **Get credentials**:
   - Account ID
   - Access Key ID
   - Secret Access Key
4. **Set in environment**:
   ```
   S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
   AWS_ACCESS_KEY_ID=<your-key>
   AWS_SECRET_ACCESS_KEY=<your-secret>
   BUCKET_NAME=<your-bucket>
   PUBLIC_URL_BASE=https://pub-xxx.r2.dev
   ```

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React, Tailwind CSS, TypeScript
- **Backend**: FastAPI, SQLAlchemy (AsyncPG), Pydantic
- **Worker**: Celery, PyTorch, DeMark-World
- **Database**: PostgreSQL
- **Queue**: Redis
- **Storage**: Cloudflare R2 (S3-compatible)
- **Deployment**: Vercel (Frontend), Railway (Backend), RunPod/Vast.ai (Worker)

## 💰 Estimated Costs (50k minutes/month)

| Service       | Provider      | Cost          |
|---------------|---------------|---------------|
| GPU Workers   | RunPod/Lava   | $1,200-$1,800 |
| Backend+DB    | Railway       | $80-$150      |
| Frontend      | Vercel        | Free-$20      |
| Storage       | Cloudflare R2 | $30           |
| **Total**     |               | **~$1,500-$2,200** |

## ⚖️ Legal Notice

This tool is intended **only** for removing watermarks from videos that you generated yourself. Using this tool on copyrighted or third-party content may violate laws including:
- DMCA §1202 (US)
- EU Copyright Directive Article 7
- China Copyright Law Article 48

By using this service, you confirm that you have the legal right to remove the watermark from the video.

## 📝 License

This project uses [DeMark-World](https://github.com/linkedlist771/DeMark-World) which is licensed under Apache 2.0, allowing commercial use.

## 🙏 Acknowledgments

- [DeMark-World](https://github.com/linkedlist771/DeMark-World) - The core watermark removal engine
- [SoraWatermarkCleaner](https://github.com/linkedlist771/SoraWatermarkCleaner) - The predecessor project

## 📧 Support

For questions or issues, please open an issue on GitHub.
