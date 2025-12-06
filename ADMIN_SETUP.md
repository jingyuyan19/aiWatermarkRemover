# Admin User Setup

This guide explains how to grant admin privileges to a user in the Vanishly platform.

## Overview

Admin status is managed through **Clerk's User Metadata**. When a user logs in, their role is read from the JWT token issued by Clerk. There is no database flag to set—everything is controlled via the Clerk Dashboard.

## Setting Up an Admin User

### Step 1: Log in to Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your Vanishly application
3. Navigate to **Users** in the left sidebar

### Step 2: Find the User

1. Search for the user by email address
2. Click on the user to open their profile

### Step 3: Edit Public Metadata

1. Scroll down to the **Metadata** section
2. Click **Edit** next to **Public Metadata**
3. Add the following JSON:

```json
{
  "role": "admin"
}
```

4. Click **Save**

### Step 4: Verify

1. Have the user log out and log back in (to get a fresh JWT token)
2. They should now see the **Admin** link in the navigation bar
3. They should have access to all `/admin/*` API endpoints

## How It Works

### Frontend (Navbar)

The `Navbar` component uses Clerk's `useUser()` hook to check:

```tsx
if (user.publicMetadata?.role === 'admin') {
  // Show Admin link
}
```

### Backend (API)

The backend extracts the role from the JWT token claims:

```python
# In auth.py
def _extract_role_from_payload(payload: dict) -> Optional[str]:
    metadata = payload.get("metadata", {})
    return metadata.get("role")

# In admin.py
def verify_admin_role(user_info: UserInfo) -> None:
    if user_info.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
```

## Troubleshooting

### "Admin access required" (403) error

1. **Check Clerk Metadata**: Ensure `publicMetadata.role` is exactly `"admin"` (case-sensitive)
2. **Refresh Token**: Log out and log back in to get a new JWT
3. **Check JWT Contents**: Decode your token at [jwt.io](https://jwt.io) and verify the `metadata` or `public_metadata` claim contains `{"role": "admin"}`

### Admin link not showing in Navbar

1. Check browser console for errors
2. Ensure you're using the latest deployed frontend
3. Clear browser cache and hard refresh

### Clerk doesn't include metadata in JWT

By default, Clerk includes `publicMetadata` in session tokens. If it's missing:

1. Go to Clerk Dashboard → **Sessions** → **Customize session token**
2. Ensure `publicMetadata` is included in the claims

## Removing Admin Privileges

1. Go to Clerk Dashboard → Users → Select user
2. Edit **Public Metadata**
3. Remove the `role` field or set it to something other than `"admin"`
4. Have the user log out and back in
