# Cloudflare R2 Setup Guide

This guide will walk you through setting up Cloudflare R2 for the AI Watermark Remover project.

## 🎯 Why Cloudflare R2?

- **Cheaper Storage**: $0.015/GB (vs AWS $0.023/GB)
- **Free Egress**: No cost for downloading files (AWS charges $0.09/GB)
- **S3 Compatible**: Works with existing AWS tools and libraries

---

## Step 1: Create R2 Bucket

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **R2** from the sidebar.
3. Click **Create Bucket**.
4. Name the bucket: `ai-watermark-remover` (or a unique name).
5. Click **Create Bucket**.
6. In the bucket settings, find the **Location** (e.g., `WNAM` or `ENAM`) - usually auto-selected.

---

## Step 2: Enable Public Access (for Downloads)

1. Go to your bucket's **Settings** tab.
2. Scroll to **Public Access**.
3. Click **Connect Domain** (if you have a custom domain) OR **Allow Access** under "R2.dev subdomain".
   - *Recommendation*: Use the **R2.dev subdomain** for testing.
   - *Production*: Connect a custom domain (e.g., `cdn.yourdomain.com`) for better branding.
4. Copy the **Public Bucket URL** (e.g., `https://pub-xxxxxxxx.r2.dev`).
   - This will be your `PUBLIC_URL_BASE`.

---

## Step 3: Configure CORS (Critical for Frontend Uploads)

1. In the bucket **Settings** tab, scroll to **CORS Policy**.
2. Click **Add CORS Policy**.
3. Paste the following JSON:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-vercel-app.vercel.app"
    ],
    "AllowedMethods": [
      "PUT",
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```
*Note: Replace `https://your-vercel-app.vercel.app` with your actual production frontend URL later.*

4. Click **Save**.

---

## Step 4: Generate Access Keys

1. Go back to the main **R2 Overview** page (click "R2" in sidebar).
2. On the right side, click **Manage R2 API Tokens**.
3. Click **Create API Token**.
4. Configure the token:
   - **Token name**: `ai-watermark-remover-app`
   - **Permissions**: **Object Read & Write** (Important!)
   - **TTL**: Forever (or as needed)
5. Click **Create API Token**.

**⚠️ IMPORTANT: Copy these values immediately! You won't see them again.**

You need:
- **Access Key ID**
- **Secret Access Key**
- **Endpoint** (Use the one ending in `.r2.cloudflarestorage.com`)

---

## Step 5: Update Environment Variables

Update your `.env` files with the new credentials.

### Backend (`backend/.env`)

```bash
# R2 Configuration
S3_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY>
BUCKET_NAME=ai-watermark-remover
PUBLIC_URL_BASE=https://pub-xxxxxxxx.r2.dev
```

### Worker (`worker/.env`)

```bash
# R2 Configuration (Same as backend)
S3_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID>
AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_ACCESS_KEY>
BUCKET_NAME=ai-watermark-remover
```

---

## Step 6: Verify Setup

1. Restart your backend server:
   ```bash
   # In backend terminal
   Ctrl+C
   uvicorn main:app --reload
   ```

2. Test the upload flow in the frontend:
   - Go to http://localhost:3000
   - Upload a video
   - If it works, you'll see the job status page!

---

## Troubleshooting

- **403 Forbidden on Upload**: Check CORS settings. Ensure `AllowedOrigins` includes `http://localhost:3000`.
- **SignatureDoesNotMatch**: Check Access Key and Secret Key. Ensure `S3_ENDPOINT_URL` is correct (should be `https://<account_id>.r2.cloudflarestorage.com`).
- **Public URL not working**: Ensure Public Access is enabled in R2 bucket settings.
