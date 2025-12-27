# Cloud Run Authentication Troubleshooting Guide

## 🔴 Problem: 401 Error on `/api/auth/callback/credentials`

You're seeing this error when trying to log in after deploying to Cloud Run:
```
/api/auth/callback/credentials:1 Failed to load resource: the server responded with a status of 401
Login result: Object
```

## 📋 Root Causes

### 1. **Missing NEXTAUTH_URL Environment Variable**
NextAuth.js uses `NEXTAUTH_URL` to generate callback URLs for OAuth providers. Without this set correctly, the authentication callbacks fail with 401 errors.

**Impact:** Credentials provider cannot complete the authentication flow.

### 2. **Missing Secrets from Google Secret Manager**
The deployment doesn't automatically mount secrets from Google Secret Manager. These are required:
- `DATABASE_URL` - Database connection string
- `NEXTAUTH_SECRET` - Secret key for NextAuth.js
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### 3. **Incorrect Database Connection**
If DATABASE_URL is not set or incorrect, the authorize function in CredentialsProvider cannot query the database to validate credentials.

## ✅ Solutions

### Solution 1: Update the Deployment Script (Already Fixed)

The deployment script has been updated to:
1. Mount secrets from Google Secret Manager
2. Set `NEXTAUTH_URL` to the actual Cloud Run service URL after deployment

### Solution 2: Update Your Secrets

Before testing authentication, update the secrets with actual values:

#### Update DATABASE_URL:
```bash
# Get your database connection string from your .env.local or Prisma
# For example: postgresql://username:password@host:5432/dbname
echo "postgresql://username:password@host:5432/lmsmath" | \
  gcloud secrets versions add database-url --data-file=- \
  --project=gen-lang-client-0712182643
```

#### Update NEXTAUTH_SECRET:
```bash
# Generate a new secret
openssl rand -base64 32 | \
  gcloud secrets versions add nextauth-secret --data-file=- \
  --project=gen-lang-client-0712182643
```

#### Update Google OAuth Credentials:
```bash
# Update Google Client ID
echo "your-actual-google-client-id" | \
  gcloud secrets versions add google-client-id --data-file=- \
  --project=gen-lang-client-0712182643

# Update Google Client Secret
echo "your-actual-google-client-secret" | \
  gcloud secrets versions add google-client-secret --data-file=- \
  --project=gen-lang-client-0712182643
```

#### Update the Cloud Run Service:
After updating secrets, redeploy with the updated secrets:

```bash
gcloud run services update lmsmath-app \
  --region asia-east1 \
  --set-secrets DATABASE_URL=database-url:latest,NEXTAUTH_SECRET=nextauth-secret:latest,GOOGLE_CLIENT_ID=google-client-id:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest
```

### Solution 3: Verify Environment Variables

Check if environment variables are correctly set in your Cloud Run service:

```bash
# List all environment variables
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)"
```

### Solution 4: Test Database Connection

Test if your database is accessible from Cloud Run:

```bash
# Get your service URL
SERVICE_URL=$(gcloud run services describe lmsmath-app --region asia-east1 --format="value(status.url)")

# Test database connection via API endpoint
curl "$SERVICE_URL/api/test-db"
```

### Solution 5: Check Cloud Run Logs

View logs to see detailed error messages:

```bash
gcloud run services logs read lmsmath-app \
  --region asia-east1 \
  --limit 50
```

Look for errors like:
- "Database connection failed"
- "NEXTAUTH_SECRET not set"
- "Credentials provider error"

## 🔍 Verification Steps

1. **Check NEXTAUTH_URL is set correctly:**
```bash
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env[?(@.name=='NEXTAUTH_URL')].value)"
```

Should match your service URL: `https://lmsmath-app-xxxxx-xx.a.run.app`

2. **Check if secrets are mounted:**
```bash
gcloud run services describe lmsmath-app \
  --region asia-east1 \
  --format="get(spec.template.spec.containers[0].env)"
```

Should show environment variables from secrets.

3. **Test authentication endpoint:**
```bash
curl -X POST "https://your-service-url/api/auth/callback/credentials" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## 🚀 Quick Fix Command

Run this complete fix script:

```bash
#!/bin/bash
PROJECT_ID="gen-lang-client-0712182643"
SERVICE_NAME="lmsmath-app"
REGION="asia-east1"

# 1. Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)")

# 2. Update NEXTAUTH_URL
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars NEXTAUTH_URL=$SERVICE_URL

# 3. Redeploy with secrets (update these values with your actual secrets)
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --set-secrets \
    DATABASE_URL=database-url:latest,\
    NEXTAUTH_SECRET=nextauth-secret:latest,\
    GOOGLE_CLIENT_ID=google-client-id:latest,\
    GOOGLE_CLIENT_SECRET=google-client-secret:latest

echo "✅ Fixed! Service URL: $SERVICE_URL"
```

## 📝 Environment Variables Checklist

Make sure these environment variables are set in Cloud Run:

- ✅ `NODE_ENV=production`
- ✅ `NEXTAUTH_URL=https://your-service-url.run.app` (must be HTTPS)
- ✅ `DATABASE_URL` (from secret)
- ✅ `NEXTAUTH_SECRET` (from secret)
- ✅ `GOOGLE_CLIENT_ID` (from secret, if using Google OAuth)
- ✅ `GOOGLE_CLIENT_SECRET` (from secret, if using Google OAuth)

## 🔐 Security Notes

1. **Never** store secrets in environment variables directly. Always use Google Secret Manager.
2. **Always** use HTTPS for production deployments.
3. **Rotate** secrets regularly, especially NEXTAUTH_SECRET.
4. **Verify** that database connections use SSL/TLS in production.

## 💡 Common Mistakes

1. ❌ Forgetting to update secrets after first deployment
2. ❌ Using HTTP instead of HTTPS for NEXTAUTH_URL
3. ❌ Not setting NEXTAUTH_URL dynamically based on service URL
4. ❌ Not mounting secrets during deployment
5. ❌ Using development database credentials in production

## 🎯 Next Steps After Fixing

1. Test login with credentials provider
2. Test Google OAuth login
3. Verify session persistence
4. Check database connection logs
5. Monitor authentication success/failure rates


