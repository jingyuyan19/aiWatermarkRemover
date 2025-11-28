# Storage Comparison: Cloudflare R2 vs AWS S3

## 🎯 Recommendation: **Use Cloudflare R2**

For this project, **Cloudflare R2 is the better choice** for the following reasons:

## 📊 Detailed Comparison

| Feature | Cloudflare R2 | AWS S3 |
|---------|---------------|---------|
| **Storage Cost** | $0.015/GB/month | $0.023/GB/month |
| **Egress (Downloads)** | **✅ FREE** | $0.09/GB |
| **API Calls (Class A)** | $4.50/million | $5.00/million |
| **API Calls (Class B)** | $0.36/million | $0.40/million |
| **S3 API Compatible** | ✅ Yes | ✅ Yes (native) |
| **Global Distribution** | Yes (CF network) | Yes (regions) |
| **Free Tier** | 10 GB storage | 5 GB storage (1 year) |

## 💰 Cost Analysis (Example: 50k videos/month)

### Assumptions
- Average video size: 50MB
- Total storage: 2,500 GB (50k × 50MB)
- Each video downloaded once
- Total egress: 2,500 GB/month

### Cloudflare R2
```
Storage:  2,500 GB × $0.015 = $37.50
Egress:   2,500 GB × $0     = $0
Uploads:  50k × $0.0000045  = $0.23
Downloads: 50k × $0.00000036 = $0.02
-----------------------------------------
Total:                        ~$38/month
```

### AWS S3
```
Storage:  2,500 GB × $0.023 = $57.50
Egress:   2,500 GB × $0.09  = $225
Uploads:  50k × $0.000005   = $0.25
Downloads: 50k × $0.0000004 = $0.02
-----------------------------------------
Total:                        ~$283/month
```

## ✅ Why Cloudflare R2 Wins

### 1. **Zero Egress Fees** 🎉
This is the **biggest advantage**. Users downloading processed videos = zero cost for you.

With AWS S3, each download costs money. At scale, egress fees can be **10x your storage cost**.

### 2. **Cheaper Storage**
- R2: $0.015/GB
- S3: $0.023/GB
- **35% cheaper** storage

### 3. **S3 API Compatible**
The code is **identical**! We're already using boto3 which works with both:
```python
# Works with both R2 and S3
s3_client = boto3.client(
    's3',
    endpoint_url=S3_ENDPOINT_URL,  # Just change this
    aws_access_key_id=...,
    aws_secret_access_key=...
)
```

### 4. **Cloudflare Global Network**
R2 uses Cloudflare's edge network = **faster downloads worldwide**

### 5. **Simple Pricing**
No complex pricing tiers or transfer acceleration fees

## ⚠️ When to Consider AWS S3

Use S3 if you:
1. Already have AWS infrastructure (Lambda, EC2, etc.)
2. Need advanced features like:
   - S3 Select (query data without downloading)
   - S3 Transfer Acceleration
   - S3 Object Lock (compliance)
   - Glacier (long-term archival)
3. Have enterprise AWS credits
4. Need specific AWS region compliance

## 🚀 Our Project Setup (Already R2-Ready!)

The code is already configured for **both R2 and S3**:

### For Cloudflare R2:
```bash
S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=<r2-access-key>
AWS_SECRET_ACCESS_KEY=<r2-secret-key>
BUCKET_NAME=ai-watermark-remover
PUBLIC_URL_BASE=https://pub-xxx.r2.dev
```

### For AWS S3:
```bash
S3_ENDPOINT_URL=https://s3.amazonaws.com
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
BUCKET_NAME=ai-watermark-remover
PUBLIC_URL_BASE=https://ai-watermark-remover.s3.amazonaws.com
```

## 📈 Cost Projection

### Cloudflare R2

| Users/Month | Storage | Egress | Total Cost |
|-------------|---------|--------|------------|
| 1,000       | $7.50   | $0     | **$8**     |
| 10,000      | $75     | $0     | **$75**    |
| 50,000      | $375    | $0     | **$375**   |

### AWS S3

| Users/Month | Storage | Egress | Total Cost |
|-------------|---------|--------|------------|
| 1,000       | $11.50  | $45    | **$57**    |
| 10,000      | $115    | $450   | **$565**   |
| 50,000      | $575    | $2,250 | **$2,825** |

## 🎯 Final Recommendation

**Use Cloudflare R2** unless you have a specific reason not to.

### Migration is Easy
If you later need S3, just:
1. Change `S3_ENDPOINT_URL`
2. Update credentials
3. Copy data (using `rclone` or AWS CLI)

## 📚 Setup Guides

### Cloudflare R2 Setup
See [DEPLOYMENT.md](DEPLOYMENT.md#step-1-cloudflare-r2-setup)

### AWS S3 Setup (Alternative)

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://ai-watermark-remover
   ```

2. **Enable Public Access** (for download URLs)
   - Go to S3 Console → Bucket → Permissions
   - Edit Bucket Policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Sid": "PublicReadGetObject",
       "Effect": "Allow",
       "Principal": "*",
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::ai-watermark-remover/outputs/*"
     }]
   }
   ```

3. **Create IAM User**
   - IAM → Users → Add User
   - Permissions: `AmazonS3FullAccess` (or custom policy)
   - Save Access Key ID and Secret

4. **Update Environment**
   ```bash
   S3_ENDPOINT_URL=https://s3.amazonaws.com
   AWS_ACCESS_KEY_ID=<your-access-key>
   AWS_SECRET_ACCESS_KEY=<your-secret-key>
   BUCKET_NAME=ai-watermark-remover
   PUBLIC_URL_BASE=https://ai-watermark-remover.s3.amazonaws.com
   ```

## 🔍 Real-World Impact

For a SaaS with **10,000 videos processed per month**:

- **R2**: $75/month → Could charge $9/month and be profitable
- **S3**: $565/month → Need to charge $60+/month to be profitable

**R2 gives you 7.5x better margins!** 🚀

---

**Bottom line**: Start with Cloudflare R2. You can always migrate to S3 later if needed, but you probably won't need to.
