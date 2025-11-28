# API Documentation

## Base URL

- **Local**: `http://localhost:8000`
- **Production**: `https://your-app.railway.app`

## Interactive API Docs

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Endpoints

### 1. Get Upload URL

Generate a presigned URL for uploading videos directly to S3/R2.

**Endpoint**: `GET /api/upload-url`

**Query Parameters**:
- `filename` (string, required): Original filename
- `content_type` (string, required): MIME type (e.g., `video/mp4`)

**Response**:
```json
{
  "upload_url": "https://...",
  "key": "uploads/uuid/filename.mp4"
}
```

**Example**:
```bash
curl "http://localhost:8000/api/upload-url?filename=test.mp4&content_type=video/mp4"
```

---

### 2. Create Job

Create a new watermark removal job.

**Endpoint**: `POST /api/jobs`

**Query Parameters**:
- `input_key` (string, required): S3 key from upload step

**Request Body**:
```json
{
  "quality": "lama"  // or "e2fgvi_hq"
}
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "input_url": null,
  "output_url": null,
  "created_at": "2025-11-28T15:00:00Z"
}
```

**Example**:
```bash
curl -X POST "http://localhost:8000/api/jobs?input_key=uploads/uuid/test.mp4" \
  -H "Content-Type: application/json" \
  -d '{"quality": "lama"}'
```

---

### 3. Get Job Status

Get the current status and result of a job.

**Endpoint**: `GET /api/jobs/{job_id}`

**Path Parameters**:
- `job_id` (string, required): Job UUID

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",  // pending, processing, completed, failed
  "input_url": "https://pub-xxx.r2.dev/uploads/uuid/test.mp4",
  "output_url": "https://pub-xxx.r2.dev/outputs/job-id.mp4",
  "created_at": "2025-11-28T15:00:00Z"
}
```

**Example**:
```bash
curl "http://localhost:8000/api/jobs/550e8400-e29b-41d4-a716-446655440000"
```

---

## Full Upload Flow

### Step 1: Request Upload URL

```javascript
const response = await fetch(
  `${API_URL}/api/upload-url?filename=${file.name}&content_type=${file.type}`
);
const { upload_url, key } = await response.json();
```

### Step 2: Upload File Directly to S3/R2

```javascript
await fetch(upload_url, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': file.type,
  },
});
```

### Step 3: Create Processing Job

```javascript
const jobResponse = await fetch(
  `${API_URL}/api/jobs?input_key=${encodeURIComponent(key)}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ quality: 'lama' }),
  }
);
const job = await jobResponse.json();
```

### Step 4: Poll for Status

```javascript
const pollStatus = async (jobId) => {
  const response = await fetch(`${API_URL}/api/jobs/${jobId}`);
  const job = await response.json();
  
  if (job.status === 'completed') {
    console.log('Download:', job.output_url);
  } else if (job.status === 'failed') {
    console.error('Job failed');
  } else {
    // Poll again in 3 seconds
    setTimeout(() => pollStatus(jobId), 3000);
  }
};

pollStatus(job.id);
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid input"
}
```

### 404 Not Found
```json
{
  "detail": "Job not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Rate Limiting

> **Note**: Rate limiting is not implemented yet. Consider adding it before going to production.

Recommended implementation:
- Free tier: 5 jobs/hour
- Paid tier: 100 jobs/hour

---

## Quality Options

### `lama` (Fast)
- Processing time: 1-2 minutes
- Quality: Good for most use cases
- GPU memory: ~4GB

### `e2fgvi_hq` (High Quality)
- Processing time: 5-10 minutes
- Quality: Best for professional use
- GPU memory: ~12GB

---

## Job Lifecycle

```
[pending] → User submits job
    ↓
[processing] → Worker picks up task
    ↓
[completed] → Result uploaded to S3/R2
    or
[failed] → Error during processing
```

---

## Database Schema

### `jobs` Table

| Column      | Type      | Description                      |
|-------------|-----------|----------------------------------|
| id          | String    | UUID primary key                 |
| status      | String    | pending, processing, completed, failed |
| input_key   | String    | S3 key for input video           |
| output_key  | String    | S3 key for output video          |
| quality     | String    | lama or e2fgvi_hq                |
| created_at  | DateTime  | Job creation timestamp           |
| updated_at  | DateTime  | Last update timestamp            |

---

## WebSocket Support (Future)

For real-time updates instead of polling, consider adding WebSocket support:

```python
from fastapi import WebSocket

@app.websocket("/ws/jobs/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    # Send updates when job status changes
```

This would eliminate the need for polling on the frontend.
