# ⚡ Deploy Gen-Lang-Client Quick Start

## 🎯 Minimal Steps (Copy & Paste)

### First Time Setup
```bash
# 1. Authenticate with service account key
gcloud auth activate-service-account --key-file=gen-lang-client-0712182643-47b71bba4d28.json

# 2. Set project
gcloud config set project gen-lang-client-0712182643

# 3. Configure environment
cp env.example .env
# Edit .env and add required values

# 4. Run setup (3-5 minutes)
chmod +x setup-cloud-deployment.sh
./setup-cloud-deployment.sh
```

### Deploy (Every Time)
```bash
chmod +x deploy-to-gen-lang-client.sh
./deploy-to-gen-lang-client.sh
```

---

## 📊 Environment Variables Needed in .env

```
# Database
DATABASE_URL="your-database-url"

# Authentication
NEXTAUTH_URL="https://your-service-url.run.app"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID="gen-lang-client-0712182643"

# Other required variables
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-key"
```

---

## ✅ Verify Deployment

```bash
# Get service URL
gcloud run services describe lmsmath-app --region asia-southeast1 --format='value(status.url)'

# View recent logs
gcloud run services logs read lmsmath-app --region asia-southeast1 --limit=20

# Test endpoint
curl https://lmsmath-app-xxxxx.run.app/health
```

---

## 🔄 Common Tasks

### Update Service (after code changes)
```bash
./deploy-to-gen-lang-client.sh
```

### View Logs
```bash
gcloud run services logs read lmsmath-app --region asia-southeast1 --limit=50 --follow
```

### Update Environment Variable
```bash
gcloud run services update lmsmath-app --region asia-southeast1 \
  --set-env-vars KEY=VALUE
```

### View Service Details
```bash
gcloud run services describe lmsmath-app --region asia-southeast1
```

### Delete Service
```bash
gcloud run services delete lmsmath-app --region asia-southeast1
```

---

## 🐛 Troubleshooting

### "docker: command not found"
Install Docker Desktop from https://www.docker.com/products/docker-desktop

### "gcloud: command not found"
Install Google Cloud SDK from https://cloud.google.com/sdk/docs/install

### "Permission denied"
```bash
gcloud auth activate-service-account --key-file=gen-lang-client-0712182643-47b71bba4d28.json
```

### "Image not found"
Check that `docker build` succeeded:
```bash
docker images | grep lmsmath-app
```

### Service deployment fails
Check logs immediately after deployment:
```bash
gcloud run services logs read lmsmath-app --region asia-southeast1 --limit=100
```

---

## 📱 Service Details

- **Project**: gen-lang-client-0712182643
- **Service**: lmsmath-app
- **Region**: asia-southeast1 (Singapore)
- **CPU**: 1
- **Memory**: 512MB
- **Port**: 3000
- **Scaling**: 0-10 instances

---

## 🔐 Using Service Account Key

The key `gen-lang-client-0712182643-47b71bba4d28.json` is already in your project.

To authenticate:
```bash
gcloud auth activate-service-account --key-file=gen-lang-client-0712182643-47b71bba4d28.json
gcloud config set project gen-lang-client-0712182643
```

---

**Last Updated**: January 25, 2026
