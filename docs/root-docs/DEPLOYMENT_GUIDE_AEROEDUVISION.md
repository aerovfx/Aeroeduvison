# 🚀 AeroeduVision Deployment Guide

## Overview
This guide explains how to deploy the AeroeduVision application to Google Cloud Run using the automated deployment script.

## Prerequisites

1. **Google Cloud SDK** installed and authenticated
2. **Docker** installed and running
3. **Project Access** to `gen-lang-client-0712182643` project
4. **Service Account** permissions for deployment

## Deployment Script

The main deployment script is located at: `deploy-aeroeduvision.sh`

### Configuration
- **Project ID**: `gen-lang-client-0712182643`
- **Region**: `asia-southeast1`
- **Service Name**: `aeroeduvision`
- **Service Account**: `ci-deployer@gen-lang-client-0712182643.iam.gserviceaccount.com`

### Environment Variables Managed

The script automatically manages the following secrets:

- `DATABASE_URL` - PostgreSQL database connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret for authentication
- `REDIS_URL` - Redis connection string for caching and sessions
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GEMINI_API_KEY` - Google Gemini AI API key
- `OPENAI_API_KEY` - OpenAI API key (or Ollama configuration)
- `OPENAI_BASE_URL` - OpenAI-compatible API base URL
- `AI_PREFERRED_PROVIDER` - Preferred AI provider (ollama/openai)
- `NEXT_PUBLIC_TRACKING_SERVER_URL` - Vision tracking server URL

## Usage

### 1. Prepare Environment
```bash
# Ensure you have the latest .env.local file with all required variables
cp .env.local.example .env.local
# Edit .env.local with your actual values
```

### 2. Run Deployment
```bash
./deploy-aeroeduvision.sh
```

### 3. Monitor Deployment
```bash
# Check service status
gcloud run services describe aeroeduvision --region=asia-southeast1

# View logs
gcloud run services logs tail aeroeduvision --region=asia-southeast1
```

## What the Script Does

1. **Build Docker Image** - Creates a production-ready Docker image
2. **Push to Container Registry** - Uploads image to Google Container Registry
3. **Sync Secrets** - Updates Google Secret Manager with environment variables
4. **Deploy to Cloud Run** - Deploys the application with proper configuration

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure you have the `roles/run.admin` and `roles/secretmanager.admin` roles
2. **Build Failures**: Check Dockerfile syntax and dependencies
3. **Secret Issues**: Verify `.env.local` contains all required variables

### Manual Deployment Commands

If the script fails, you can run the steps manually:

```bash
# Build and push image
docker build --platform linux/amd64 -t gcr.io/gen-lang-client-0712182643/aeroeduvision:latest .
docker push gcr.io/gen-lang-client-0712182643/aeroeduvision:latest

# Deploy manually
gcloud run deploy aeroeduvision \
    --image gcr.io/gen-lang-client-0712182643/aeroeduvision:latest \
    --platform managed \
    --region asia-southeast1 \
    --allow-unauthenticated \
    --port 3000 \
    --memory 2Gi \
    --cpu 2 \
    --min-instances 0 \
    --max-instances 10 \
    --timeout 300 \
    --concurrency 80 \
    --set-env-vars "NODE_ENV=production" \
    --set-env-vars "NEXT_TELEMETRY_DISABLED=1"
```

## Post-Deployment

After successful deployment:

1. Test the application at the provided URL
2. Check database connections
3. Verify authentication flow
4. Test AI integration features

## Support

For deployment issues, check:
- Cloud Run logs
- Container Registry build logs
- Secret Manager configuration