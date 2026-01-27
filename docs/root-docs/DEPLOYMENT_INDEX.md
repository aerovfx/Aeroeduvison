# 🚀 AeroeduVision - Deployment to gen-lang-client-0712182643

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Deployment Files](#deployment-files)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Commands Reference](#commands-reference)
5. [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Start

**Everything is set up. Here's the minimal steps to deploy:**

```bash
# 1. Authenticate (one time)
gcloud auth activate-service-account --key-file=gen-lang-client-0712182643-47b71bba4d28.json
gcloud config set project gen-lang-client-0712182643

# 2. Prepare environment (one time)
cp env.example .env
nano .env  # Edit with your values

# 3. Initial setup (one time)
./setup-cloud-deployment.sh

# 4. Deploy (repeat each time)
./deploy-to-gen-lang-client.sh
```

---

## 📁 Deployment Files

### 📄 Documentation
| File | Purpose |
|------|---------|
| **[DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)** | Complete deployment overview (START HERE) |
| **[GEN_LANG_CLIENT_QUICKSTART.md](GEN_LANG_CLIENT_QUICKSTART.md)** | Quick reference & copy-paste commands |
| **[DEPLOYMENT_GUIDE_GEN_LANG_CLIENT.md](DEPLOYMENT_GUIDE_GEN_LANG_CLIENT.md)** | Detailed step-by-step guide with options |
| **[DEPLOYMENT_INDEX.md](DEPLOYMENT_INDEX.md)** | This file - complete index |

### 🔧 Scripts
| File | Purpose | Run When |
|------|---------|----------|
| **[setup-cloud-deployment.sh](setup-cloud-deployment.sh)** | Enable APIs, create repos, setup IAM | First time only |
| **[deploy-to-gen-lang-client.sh](deploy-to-gen-lang-client.sh)** | Build Docker & deploy to Cloud Run | Every deployment |
| **[DEPLOYMENT_COMMANDS.sh](DEPLOYMENT_COMMANDS.sh)** | Reference of all commands | View commands |

### ⚙️ Configuration
| File | Purpose |
|------|---------|
| **[env.example](env.example)** | Environment variables template |
| **[cloud-run.yaml](cloud-run.yaml)** | Cloud Run service definition |
| **[cloudbuild.yaml](cloudbuild.yaml)** | Cloud Build configuration |
| **[Dockerfile](Dockerfile)** | Docker image definition |

---

## 📖 Step-by-Step Guide

### Step 1: Authenticate with Google Cloud (2 minutes)

```bash
# Authenticate using service account key
gcloud auth activate-service-account \
  --key-file=gen-lang-client-0712182643-47b71bba4d28.json

# Verify authentication
gcloud auth list
```

**✅ Expected**: Service account shows as ACTIVE

---

### Step 2: Set Project (1 minute)

```bash
# Set the GCP project
gcloud config set project gen-lang-client-0712182643

# Verify project is set
gcloud config list
```

**✅ Expected**: Project shows as `gen-lang-client-0712182643`

---

### Step 3: Configure Environment Variables (5 minutes)

```bash
# Create .env from template
cp env.example .env

# Edit the file
nano .env
```

**🔑 Required Variables:**
```
DATABASE_URL="your-database-connection-string"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="https://your-service.run.app"
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CLOUD_PROJECT_ID="gen-lang-client-0712182643"
```

---

### Step 4: Initial Setup (3-5 minutes, run once)

```bash
# Make script executable (if needed)
chmod +x setup-cloud-deployment.sh

# Run setup
./setup-cloud-deployment.sh
```

**This will:**
- ✅ Enable required Google Cloud APIs
- ✅ Create Artifact Registry repository
- ✅ Configure Docker authentication
- ✅ Setup IAM permissions

**✅ Expected**: Green checkmarks for all steps

---

### Step 5: Deploy Application (5-10 minutes)

```bash
# Make script executable (if needed)
chmod +x deploy-to-gen-lang-client.sh

# Deploy
./deploy-to-gen-lang-client.sh
```

**This will:**
- ✅ Build Docker image
- ✅ Push to Container Registry
- ✅ Deploy to Cloud Run
- ✅ Show service URL

**✅ Expected**: Service URL in output

---

### Step 6: Verify Deployment (2 minutes)

```bash
# Get the service URL
gcloud run services describe lmsmath-app \
  --region asia-southeast1 \
  --format='value(status.url)'

# Test the service
curl https://lmsmath-app-xxxxx.run.app/health

# View logs
gcloud run services logs read lmsmath-app \
  --region asia-southeast1 \
  --limit=20
```

---

## 🔧 Commands Reference

### Authentication
```bash
# Authenticate with service account key
gcloud auth activate-service-account --key-file=gen-lang-client-0712182643-47b71bba4d28.json

# List authenticated accounts
gcloud auth list

# Login with user account
gcloud auth login
```

### Project Management
```bash
# Set project
gcloud config set project gen-lang-client-0712182643

# View current project
gcloud config get-value project

# List all configuration
gcloud config list
```

### Cloud Run Operations
```bash
# Get service URL
gcloud run services describe lmsmath-app --region asia-southeast1 --format='value(status.url)'

# View service details
gcloud run services describe lmsmath-app --region asia-southeast1

# List all services
gcloud run services list

# Update environment variable
gcloud run services update lmsmath-app --region asia-southeast1 --set-env-vars KEY=VALUE

# Delete service
gcloud run services delete lmsmath-app --region asia-southeast1
```

### Logging & Monitoring
```bash
# View logs (latest 50 lines)
gcloud run services logs read lmsmath-app --region asia-southeast1 --limit=50

# Stream logs in real-time
gcloud run services logs read lmsmath-app --region asia-southeast1 --follow

# View logs for specific time
gcloud run services logs read lmsmath-app --region asia-southeast1 --limit=100 --format=json
```

### Docker & Images
```bash
# Build Docker image
docker build -t gcr.io/gen-lang-client-0712182643/lmsmath-app:latest .

# Push to Container Registry
docker push gcr.io/gen-lang-client-0712182643/lmsmath-app:latest

# List local images
docker images | grep lmsmath

# Remove image
docker rmi gcr.io/gen-lang-client-0712182643/lmsmath-app:latest
```

---

## 🐛 Troubleshooting

### "gcloud: command not found"
```bash
# Install Google Cloud SDK
# Visit: https://cloud.google.com/sdk/docs/install

# Then authenticate
gcloud auth activate-service-account --key-file=gen-lang-client-0712182643-47b71bba4d28.json
```

### "docker: command not found"
```bash
# Install Docker Desktop
# Visit: https://www.docker.com/products/docker-desktop
```

### "Permission denied" during setup
```bash
# Re-authenticate with service account
gcloud auth activate-service-account \
  --key-file=gen-lang-client-0712182643-47b71bba4d28.json

# Set project
gcloud config set project gen-lang-client-0712182643
```

### ".env file not found" error
```bash
# Create from template
cp env.example .env

# Edit the file
nano .env
```

### "Cloud Build fails" error
- Use local Docker build instead
- The `deploy-to-gen-lang-client.sh` script uses local Docker build
- Make sure Docker daemon is running

### Service deployment hangs
```bash
# Check logs immediately
gcloud run services logs read lmsmath-app \
  --region asia-southeast1 \
  --limit=100

# If stuck, cancel and redeploy
# Ctrl+C to cancel, then run deploy script again
```

### Database connection fails
```bash
# Verify DATABASE_URL is set
gcloud run services describe lmsmath-app \
  --region asia-southeast1 \
  --format='value(spec.template.spec.containers[0].env[?name==`DATABASE_URL`].value)'

# Update if needed
gcloud run services update lmsmath-app \
  --region asia-southeast1 \
  --set-env-vars DATABASE_URL="your-correct-url"
```

### Service returns 500 errors
```bash
# Check application logs
gcloud run services logs read lmsmath-app \
  --region asia-southeast1 \
  --limit=50

# Common causes:
# - Missing environment variables
# - Database connection issues
# - Missing dependencies in package.json
# - Port not set to 3000
```

---

## 📊 Project Configuration

| Setting | Value |
|---------|-------|
| **Project ID** | gen-lang-client-0712182643 |
| **Service Name** | lmsmath-app |
| **Region** | asia-southeast1 (Singapore) |
| **CPU** | 1 |
| **Memory** | 512MB |
| **Port** | 3000 |
| **Min Instances** | 0 |
| **Max Instances** | 10 |
| **Timeout** | 300 seconds |
| **Platform** | Cloud Run (Managed) |
| **Access** | Public (Allow Unauthenticated) |

---

## 🔐 Security

- **Service Account Key**: Keep `gen-lang-client-0712182643-47b71bba4d28.json` secure
- **Environment File**: Never commit `.env` to git (already in `.gitignore`)
- **Secrets Management**: Use Google Cloud Secret Manager for sensitive data
- **Service Access**: Currently public - add authentication if needed

---

## 📞 Additional Resources

### Google Cloud Documentation
- [Cloud Run Quickstart](https://cloud.google.com/run/docs/quickstarts/build-and-push)
- [Cloud Run Best Practices](https://cloud.google.com/run/docs/deploying)
- [Artifact Registry Setup](https://cloud.google.com/artifact-registry/docs/docker/quickstart)
- [Cloud Build Configuration](https://cloud.google.com/build/docs/build-config)

### Related Files in Project
- [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) - Full overview
- [GEN_LANG_CLIENT_QUICKSTART.md](GEN_LANG_CLIENT_QUICKSTART.md) - Quick reference
- [DEPLOYMENT_GUIDE_GEN_LANG_CLIENT.md](DEPLOYMENT_GUIDE_GEN_LANG_CLIENT.md) - Detailed guide

---

## ✅ Deployment Checklist

- [ ] Google Cloud SDK installed
- [ ] Docker installed
- [ ] Authenticated: `gcloud auth activate-service-account ...`
- [ ] Project set: `gcloud config set project gen-lang-client-0712182643`
- [ ] `.env` file created and configured
- [ ] Setup script run: `./setup-cloud-deployment.sh`
- [ ] Deploy script run: `./deploy-to-gen-lang-client.sh`
- [ ] Service URL obtained and tested
- [ ] Logs viewed and verified

---

**Status**: ✅ Ready for Deployment  
**Last Updated**: January 25, 2026  
**Project**: AeroeduVision  
**Cloud Provider**: Google Cloud (gen-lang-client-0712182643)

🚀 **Ready to deploy? Start with the Quick Start section above!**
