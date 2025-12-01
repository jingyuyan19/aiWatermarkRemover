# Local Testing Walkthrough

This guide walks you through testing the AI Watermark Remover platform locally, step by step.

## 📋 Prerequisites Checklist

Before starting, ensure you have:
- [ ] Docker installed and running
- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] Terminal open in project directory

Check versions:
```bash
docker --version    # Should be 20.10+
python3 --version   # Should be 3.11+
node --version      # Should be v18+
npm --version       # Should be 9+
```

## 🎯 What We'll Test

### ✅ Components We Can Test Without GPU
1. **Infrastructure** - PostgreSQL + Redis containers
2. **Backend API** - FastAPI server with database
3. **Frontend** - Next.js upload interface
4. **Integration** - Frontend → Backend communication

### ⏸️ What We'll Skip (Needs GPU)
- Worker video processing
- End-to-end watermark removal

---

## 🚀 Step-by-Step Testing

### Step 1: Start Infrastructure (PostgreSQL + Redis)

```bash
cd /Users/jimmyjing/Documents/learn-antigravity/aiWatermarkRemover

# Start containers
docker-compose up -d

# Verify they're running
docker-compose ps
```

**Expected Output:**
```
NAME                COMMAND                  SERVICE             STATUS
redis              "docker-entrypoint.s…"   redis               Up
postgres           "docker-entrypoint.s…"   postgres            Up
```

**✅ Test Passed If:** Both containers show "Up"

**❌ Troubleshooting:**
- If containers aren't running: `docker-compose logs`
- If port conflicts: Change ports in `docker-compose.yml`

---

### Step 2: Set Up Backend Environment

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Expected Output:**
```
Successfully installed fastapi-0.109.0 sqlalchemy-2.0.25 ...
```

**✅ Test Passed If:** All packages install without errors

**❌ Troubleshooting:**
- If Python version error: Use Python 3.11+
- If compilation errors: Install build tools (`xcode-select --install`)

---

### Step 3: Configure Backend Environment

```bash
# Still in backend/ directory
cp .env.example .env
```

Edit `.env` with temporary test values:
```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/watermark_remover
REDIS_URL=redis://localhost:6379/0

# Mock S3 credentials (won't work but won't crash)
S3_ENDPOINT_URL=https://mock.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=mock-key
AWS_SECRET_ACCESS_KEY=mock-secret
BUCKET_NAME=test-bucket
PUBLIC_URL_BASE=https://mock.r2.dev
```

**✅ Test Passed If:** File created successfully

---

### Step 4: Initialize Database

```bash
# Still in backend/ directory with venv activated
python init_db.py
```

**Expected Output:**
```
Database initialized!
```

**✅ Test Passed If:** No errors, message shows success

**❌ Troubleshooting:**
- If connection error: Check PostgreSQL is running (`docker-compose ps`)
- If auth error: Verify DATABASE_URL matches docker-compose.yml

---

### Step 5: Start Backend Server

```bash
# Still in backend/ directory with venv activated
uvicorn main:app --reload
```

**Expected Output:**
```
INFO: Uvicorn running on http://127.0.0.1:8000
INFO: Application startup complete.
```

**✅ Test Passed If:** Server starts without errors

**🔍 Test the API:**
Open http://localhost:8000/docs in your browser

You should see:
- Swagger UI with 3 endpoints
- `/api/upload-url` (GET)
- `/api/jobs` (POST)
- `/api/jobs/{job_id}` (GET)

**❌ Troubleshooting:**
- If port 8000 in use: `uvicorn main:app --reload --port 8001`
- If import errors: Check all files are in backend/

**⏸️ Keep this terminal running!**

---

### Step 6: Test Backend API (Manual)

Open a **new terminal** and test the endpoints:

#### Test 1: Health Check
```bash
curl http://localhost:8000/docs
# Should return HTML (Swagger UI)
```

#### Test 2: Get Upload URL
```bash
curl "http://localhost:8000/api/upload-url?filename=test.mp4&content_type=video/mp4"
```

**Expected Output:**
```json
{
  "upload_url": "https://mock.r2.cloudflarestorage.com/...",
  "key": "uploads/.../test.mp4"
}
```

**✅ Test Passed If:** JSON response with upload_url and key

#### Test 3: Create Job
```bash
curl -X POST "http://localhost:8000/api/jobs?input_key=test/input.mp4" \
  -H "Content-Type: application/json" \
  -d '{"quality": "lama"}'
```

**Expected Output:**
```json
{
  "id": "550e8400-...",
  "status": "pending",
  "input_url": null,
  "output_url": null,
  "created_at": "2025-11-28T..."
}
```

**✅ Test Passed If:** Job created with UUID, status is "pending"

#### Test 4: Get Job Status
```bash
# Replace JOB_ID with the id from previous response
curl "http://localhost:8000/api/jobs/550e8400-..."
```

**Expected Output:**
```json
{
  "id": "550e8400-...",
  "status": "pending",
  ...
}
```

**✅ Test Passed If:** Job details returned

**❌ If all API tests pass, backend is working! 🎉**

---

### Step 7: Set Up Frontend

Open a **new terminal**:

```bash
cd /Users/jimmyjing/Documents/learn-antigravity/aiWatermarkRemover/frontend

# Install dependencies
npm install
```

**Expected Output:**
```
added 358 packages in 30s
```

**✅ Test Passed If:** No errors during installation

---

### Step 8: Configure Frontend Environment

```bash
# Still in frontend/ directory
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

**✅ Test Passed If:** File created

---

### Step 9: Start Frontend

```bash
# Still in frontend/ directory
npm run dev
```

**Expected Output:**
```
▲ Next.js 15.0.0
- Local:        http://localhost:3000
- Ready in 2.3s
```

**✅ Test Passed If:** Server starts on port 3000

**⏸️ Keep this terminal running!**

---

### Step 10: Test Frontend UI

1. **Open Browser:** http://localhost:3000

**Expected:** Beautiful gradient UI with:
- Purple/blue background
- "AI Watermark Remover" title
- Upload area with drag-and-drop
- Quality selection buttons
- Legal disclaimer

**✅ Test Passed If:** Page loads with full UI

---

### Step 11: Test Frontend → Backend Integration

#### Test 1: Upload Flow (Will Fail at S3 - Expected)

1. On http://localhost:3000
2. Click upload area or drag a small video file
3. Select quality: "Fast"
4. Click "Remove Watermark"

**Expected Behavior:**
- File name appears
- Upload button becomes active
- Clicking triggers upload

**Expected Error (in browser console):**
```
Failed to upload video. Please try again.
```

This is **EXPECTED** because we don't have real S3 credentials.

**✅ Test Passed If:**
- UI responds to file selection
- Upload button works
- Error is graceful (not a crash)

#### Test 2: Check Backend Logs

In the backend terminal, you should see:
```
INFO: POST /api/upload-url
INFO: POST /api/jobs
```

**✅ Test Passed If:** Backend receives API calls

---

### Step 12: Test Database

```bash
# New terminal
docker exec -it <postgres-container-name> psql -U postgres -d watermark_remover
```

```sql
-- Check jobs table
SELECT * FROM jobs;
```

**Expected Output:**
```
 id | status | input_key | ...
----+--------+-----------+----
 550e8400... | pending | test/input.mp4 | ...
```

**✅ Test Passed If:** Jobs appear in database

Exit psql: `\q`

---

## 📊 Test Results Summary

### ✅ What Should Work
- [x] Infrastructure (PostgreSQL + Redis)
- [x] Backend API starts
- [x] Database initialization
- [x] API endpoints respond
- [x] Frontend UI loads
- [x] Frontend → Backend communication
- [x] Job creation in database

### ⏸️ What Won't Work (Expected)
- [ ] Actual file upload to S3 (need real credentials)
- [ ] Worker processing (need GPU + setup)
- [ ] Complete end-to-end flow

---

## 🎯 Validation Checklist

After completing all steps, verify:

- [ ] Three terminals running:
  - Docker Compose (or running in background)
  - Backend (uvicorn)
  - Frontend (npm run dev)

- [ ] No errors in any terminal

- [ ] Can access:
  - http://localhost:8000/docs (Backend API docs)
  - http://localhost:3000 (Frontend UI)

- [ ] Database has `jobs` table with test entries

---

## 🧹 Clean Up After Testing

```bash
# Stop frontend (Ctrl+C in frontend terminal)
# Stop backend (Ctrl+C in backend terminal)

# Stop infrastructure
cd /Users/jimmyjing/Documents/learn-antigravity/aiWatermarkRemover
docker-compose down

# Deactivate Python virtual environment
deactivate
```

---

## 🚀 Next Steps After Local Testing

1. **If tests passed:**
   - Push to GitHub
   - Set up Cloudflare R2
   - Deploy to Railway + Vercel
   - Deploy worker to RunPod

2. **If tests failed:**
   - Review error messages
   - Check troubleshooting sections
   - Ask for help with specific errors

---

## 📝 Common Issues & Solutions

### Issue: Port 3000 already in use
```bash
# Use different port
npm run dev -- -p 3001
```

### Issue: Port 8000 already in use
```bash
# Use different port
uvicorn main:app --reload --port 8001

# Update frontend .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8001" > .env.local
```

### Issue: CORS errors in browser
Check backend terminal - CORS middleware should be configured. If not:
```python
# In backend/main.py, verify CORS middleware exists
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    ...
)
```

### Issue: Database connection errors
```bash
# Check PostgreSQL is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Restart if needed
docker-compose restart postgres
```

---

## 🎓 What You Learned

By completing this walkthrough, you've verified:
- ✅ Docker setup works
- ✅ Python backend works
- ✅ Database migrations work
- ✅ Next.js frontend works
- ✅ Frontend-Backend integration works
- ✅ API endpoints are functional

You're ready for production deployment! 🚀
