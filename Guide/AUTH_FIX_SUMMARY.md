# 🔧 Cloud Run Authentication Fix Summary

## Problem Analysis

Your authentication was failing on Cloud Run with a 401 error on `/api/auth/callback/credentials` due to:

### 1. **Missing NEXTAUTH_URL**
- NextAuth.js couldn't generate proper callback URLs
- The service URL wasn't being set as environment variable

### 2. **Secrets Not Mounted**
- DATABASE_URL wasn't accessible from Cloud Run
- NEXTAUTH_SECRET wasn't set
- Google OAuth credentials were missing

### 3. **Deployment Script Issues**
- Only NODE_ENV was being set
- No secrets were being mounted
- No NEXTAUTH_URL configuration

## Fixes Applied

### ✅ Updated `scripts/deploy-cloud-run.sh`

1. **Added secret mounting:**
```bash
--set-secrets DATABASE_URL=database-url:latest,NEXTAUTH_SECRET=nextauth-secret:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest
```

2. **Added NEXTAUTH_URL configuration:**
```bash
# After deployment, update with actual service URL
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars NEXTAUTH_URL=$SERVICE_URL
```

3. **Added Google OAuth secret creation:**
- Created separate secrets for `google-client-id` and `google-client-secret`

4. **Added post-deployment instructions:**
- Clear steps to update secrets with actual values

## What You Need to Do

### Step 1: Update Secrets in Google Cloud

Before redeploying, you need to update the secrets with your actual values:

#### Update DATABASE_URL:
```bash
# Replace with your actual database connection string
echo "postgresql://username:password@host:5432/lmsmath" | \
  gcloud secrets versions add database-url --data-file=- \
  --project=gen-lang-client-0712182643
```

#### Update NEXTAUTH_SECRET:
```bash
# Generate a secure secret
openssl rand -base64 32 | \
  gcloud secrets versions add nextauth-secret --data-file=- \
  --project=gen-lang-client-0712182643
```

#### Update Google OAuth (if using):
```bash
# Get from Google Cloud Console -> APIs & Services -> Credentials
echo "your-google-client-id" | \
  gcloud secrets versions add google-client-id --data-file=- \
  --project=gen-lang-client-0712182643

echo "your-google-client-secret" | \
  gcloud secrets versions add google-client-secret --data-file=- \
  --project=gen-lang-client-0712182643
```

### Step 2: Run the Updated Deployment Script

```bash
cd /Users/vietchung/lmsmath
bash scripts/deploy-cloud-run.sh
```

The script will now:
1. Build and push the Docker image
2. Deploy to Cloud Run with secrets mounted
3. Set NEXTAUTH_URL to your service URL automatically

### Step 3: Verify the Fix

```bash
# Get your service URL
SERVICE_URL=$(gcloud run services describe lmsmath-app --region asia-east1 --format="value(status.url)")

# Check NEXTAUTH_URL is set correctly
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env[?(@.name=='NEXTAUTH_URL')].value)"

# Should output: https://lmsmath-app-xxxxx-xx.a.run.app

# Test the authentication endpoint
curl "$SERVICE_URL/api/auth/check"
```

### Step 4: Test Login

Try logging in with your credentials:
- Visit `https://your-service-url/auth/login`
- Enter your email and password
- Should successfully authenticate without 401 error

## Key Changes Made

### File: `scripts/deploy-cloud-run.sh`

**Before:**
```bash
gcloud run deploy $SERVICE_NAME \
  --set-env-vars NODE_ENV=production \
  --allow-unauthenticated
```

**After:**
```bash
gcloud run deploy $SERVICE_NAME \
  --set-env-vars NODE_ENV=production \
  --set-secrets DATABASE_URL=database-url:latest,NEXTAUTH_SECRET=nextauth-secret:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest \
  --allow-unauthenticated

# Then update NEXTAUTH_URL with actual service URL
gcloud run services update $SERVICE_NAME \
  --update-env-vars NEXTAUTH_URL=$SERVICE_URL
```

## Additional Resources

- See `CLOUD_RUN_AUTH_TROUBLESHOOTING.md` for detailed troubleshooting
- See `scripts/deploy-cloud-run.sh` for the complete deployment script
- Check Cloud Run logs: `gcloud run services logs read lmsmath-app --region asia-east1`

## Expected Result

After applying these fixes:
- ✅ No more 401 errors on `/api/auth/callback/credentials`
- ✅ Successful login with email/password
- ✅ Session cookies properly set
- ✅ Database queries work correctly
- ✅ OAuth (if configured) works properly

## Still Having Issues?

1. Check Cloud Run logs for detailed errors
2. Verify all secrets are updated with actual values
3. Ensure NEXTAUTH_URL is set to HTTPS (not HTTP)
4. Verify database is accessible from Cloud Run
5. Check that Prisma client is generated in the Docker image

