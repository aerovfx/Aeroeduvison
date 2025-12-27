# Cloud Run Configuration Checklist

## ✅ Step 1: Verify Environment Variables in Cloud Run

1. Go to **Cloud Run** → Select your service
2. Click **Edit & Deploy New Revision**
3. Go to **Runtime settings** → **Environment variables**
4. Verify these are set:
   ```
   NEXTAUTH_URL=https://inphysic.com
   NEXTAUTH_SECRET=<your-secret>
   NODE_ENV=production
   ```

## ✅ Step 2: Check Logs for Errors

```bash
# View Cloud Run logs
gcloud run logs read <SERVICE_NAME> --limit 50

# Or in Cloud Console:
# Cloud Run → Select service → Logs
```

Look for:
- ❌ `NEXTAUTH_URL is undefined` 
- ❌ `localhost` in any URLs
- ✅ `Health check: NEXTAUTH_URL=https://inphysic.com`

## ✅ Step 3: Test Health Endpoint

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe <SERVICE_NAME> --format='value(status.url)')

# Test health check
curl ${SERVICE_URL}/api/health

# Should return:
# {
#   "status": "ok",
#   "NEXTAUTH_URL": "https://inphysic.com",
#   "NODE_ENV": "production"
# }
```

## ✅ Step 4: Debug NextAuth Routes

```bash
# Test auth callback
curl -v ${SERVICE_URL}/api/auth/callback/credentials

# Check if NextAuth is recognizing the correct URL
```

## ✅ Step 5: Update next.config.js

Ensure your config has:
```javascript
env: {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
},

serverRuntimeConfig: {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
},
```

## ✅ Step 6: Check Dockerfile Build

```bash
# Build locally with Cloud Run env vars
docker build \
  --build-arg NEXTAUTH_URL=https://inphysic.com \
  -t inphysic:latest .

# Run locally to test
docker run -e NEXTAUTH_URL=https://inphysic.com \
  -e NEXTAUTH_SECRET=test-secret \
  -p 3000:3000 \
  inphysic:latest
```

## ✅ Step 7: If Still Not Working

Run gcloud command with debug:

```bash
gcloud run deploy inphysic \
  --source . \
  --platform managed \
  --region us-central1 \
  --set-env-vars NEXTAUTH_URL=https://inphysic.com,NEXTAUTH_SECRET=<secret>,NODE_ENV=production \
  --allow-unauthenticated
```

Then check logs immediately after deployment.