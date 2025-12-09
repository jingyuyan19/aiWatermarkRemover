# R2 Bucket Lifecycle Rule Setup

To automatically delete video files after 24 hours, you need to configure an Object Lifecycle Management rule in your Cloudflare R2 dashboard. This is more reliable and cost-effective than a manual cron job.

## Instructions

1.  **Log in to Cloudflare Dashboard**.
2.  Go to **R2** and select your bucket (`ai-watermark-remover`).
3.  Click on the **Settings** tab.
4.  Scroll down to **Object Lifecycle Management**.
5.  Click **Add rule**.
6.  **Rule Configuration**:
    *   **Rule name**: `auto-delete-24h`
    *   **Rule status**: Enabled
    *   **Apply to**: Apply to all objects (or specify prefix if you only want to delete videos, e.g., `outputs/`)
    *   **Action**: Delete object
    *   **Days**: `1` (This means objects are deleted 24 hours after creation).
7.  Click **Create rule**.

> [!NOTE]
> Lifecycle rules typically run once a day. Objects might persist slightly longer than exactly 24 hours, but they will be deleted automatically. Our frontend logic will handle the exact "24-hour" enforcement visually.
