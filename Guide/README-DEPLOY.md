# Deployment Guide

## Prerequisites

- Google Cloud SDK installed
- Docker installed
- Access to `gen-lang-client-0712182643` project
- Authenticated with gcloud: `gcloud auth login`

## Quick Start

### 1. Setup Secrets (First Time Only)
```bash
chmod +x setup-secrets.sh
./setup-secrets.sh
```

### 2. Deploy
```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. View Logs
```bash
chmod +x logs.sh
./logs.sh
```

### 4. Rollback (if needed)
```bash
chmod +x rollback.sh
./rollback.sh
```

## Manual Commands

### Build Locally
```bash
docker build -t lmsmath-app:test .
docker run -p 3000:3000 lmsmath-app:test
```

### View Service Info
```bash
gcloud run services describe lmsmath-app --region asia-east1
```

### Update Environment Variables
```bash
gcloud run services update lmsmath-app \
  --region asia-east1 \
  --set-env-vars KEY=VALUE
```

### Scale Service
```bash
gcloud run services update lmsmath-app \
  --region asia-east1 \
  --min-instances 1 \
  --max-instances 20
```

## Troubleshooting

### Health Check Failed
```bash
# Check logs
./logs.sh

# Test locally
docker build -t test .
docker run -p 3000:3000 test
curl http://localhost:3000/api/health
```

### Secrets Not Found
```bash
# List secrets
gcloud secrets list

# Re-run setup
./setup-secrets.sh
```

### Deployment Failed
```bash
# Check build logs
gcloud builds list --limit 5

# Check service status
gcloud run services describe lmsmath-app --region asia-east1
```

## Environment Variables

### Required (in Secret Manager)
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `DATABASE_URL`

### Set via Command
- `NEXTAUTH_URL` (https://inphysic.com)
- `NODE_ENV` (production)
- `COMMIT_SHA` (auto-set during deploy)

## URLs

- Production: https://inphysic.com
- Cloud Run: https://lmsmath-app-xxx-uc.a.run.app
- Health Check: /api/health