# 🚀 Deploy AeroeduVision to gen-lang-client-0712182643

**Project Configuration Summary:**
- **GCP Project ID**: `gen-lang-client-0712182643`
- **Service Name**: `lmsmath-app`
- **Current Region**: `asia-southeast1` (Singapore)
- **Service Account Key**: `gen-lang-client-0712182643-47b71bba4d28.json` ✅

---

## 📋 Pre-Deployment Checklist

- [ ] Authenticate with Google Cloud
- [ ] Verify project ID and permissions
- [ ] Check Docker and gcloud CLI
- [ ] Verify environment variables
- [ ] Check .env file configuration

---

## 🔐 Step 1: Authenticate with Google Cloud

```bash
# Login to Google Cloud
gcloud auth login

# Set the project
gcloud config set project gen-lang-client-0712182643

# Verify you're in the right project
gcloud config list
```

### Alternative: Using Service Account Key

```bash
# Authenticate using service account key
gcloud auth activate-service-account --key-file=gen-lang-client-0712182643-47b71bba4d28.json

# Set the project
gcloud config set project gen-lang-client-0712182643
```

---

## 🛠️ Step 2: Setup Google Cloud APIs and Artifact Registry

Run the setup script (only once):

```bash
./setup-cloud-deployment.sh
```

This will:
- ✅ Enable required APIs (Cloud Run, Container Registry, Artifact Registry)
- ✅ Create Artifact Registry repository
- ✅ Configure Docker authentication
- ✅ Grant necessary IAM roles

---

## 🐳 Step 3: Build and Deploy

### Option A: Automated Deployment (Recommended)

```bash
# Make scripts executable
chmod +x deploy-local-amd64.sh

# Deploy
./deploy-local-amd64.sh
```

### Option B: Manual Deployment

```bash
# Set variables
export PROJECT_ID=gen-lang-client-0712182643
export SERVICE_NAME=lmsmath-app
export REGION=asia-southeast1
export IMAGE_TAG=latest

# Build with Docker
docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG} .

# Push to Container Registry
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG}

# Deploy to Cloud Run
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG} \
  --platform managed \
  --region ${REGION} \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --port 3000 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1 \
  --secret DATABASE_URL=DATABASE_URL:latest \
  --secret NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest
```

---

## 🔒 Step 4: Configure Secrets

Add secrets to Google Cloud Secret Manager:

```bash
# Create secrets from .env file
cat .env | while IFS='=' read -r key value; do
  if [ -n "$key" ] && [[ ! "$key" =~ ^# ]]; then
    echo "$value" | gcloud secrets create ${key,,} --data-file=- --replication-policy="automatic" 2>/dev/null || \
    echo "$value" | gcloud secrets versions add ${key,,} --data-file=-
  fi
done
```

Or manually:

```bash
# Add individual secrets
echo -n "your-database-url" | gcloud secrets create DATABASE_URL --data-file=-
echo -n "your-nextauth-secret" | gcloud secrets create NEXTAUTH_SECRET --data-file=-
echo -n "your-google-client-id" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
```

---

## ✅ Step 5: Verify Deployment

```bash
# Check Cloud Run services
gcloud run services list

# View service details
gcloud run services describe lmsmath-app --region asia-southeast1

# View logs
gcloud run services logs read lmsmath-app --region asia-southeast1 --limit=50

# Test the service
curl https://lmsmath-app-xxxxx.run.app/health
```

---

## 🌐 Environment Variables

Copy `.env.example` to `.env` and update:

```bash
# Copy template
cp env.example .env

# Edit with your values
nano .env
```

**Required Variables:**
```
DATABASE_URL="your-database-url"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="https://your-deployed-service-url.run.app"
GOOGLE_CLOUD_PROJECT_ID="gen-lang-client-0712182643"
```

---

## 📊 Useful Commands

```bash
# View deployment logs
gcloud run services logs read lmsmath-app --region asia-southeast1 --limit=100

# Update service (after code changes)
gcloud run deploy lmsmath-app \
  --image gcr.io/gen-lang-client-0712182643/lmsmath-app:latest \
  --region asia-southeast1

# Delete service
gcloud run services delete lmsmath-app --region asia-southeast1

# View active revisions
gcloud run revisions list --service lmsmath-app --region asia-southeast1
```

---

## 🚨 Troubleshooting

### Error: "Cloud Build fails"
- Solution: Use local build with `docker buildx`
- Command: `./deploy-local-amd64.sh`

### Error: "Repository not found"
```bash
gcloud artifacts repositories create lmsmath \
  --repository-format=docker \
  --location=asia-southeast1 \
  --project=gen-lang-client-0712182643
```

### Error: "Permission denied"
```bash
gcloud auth configure-docker asia-southeast1-docker.pkg.dev
```

### Error: "Database connection failed"
- Verify DATABASE_URL in Secret Manager
- Check Cloud Run has network access to database

### Error: "Buildx not found"
```bash
docker buildx create --name multiplatform --use
```

---

## 📌 Additional Resources

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Run Best Practices](https://cloud.google.com/run/docs/quickstarts/build-and-push)
- [Artifact Registry Setup](https://cloud.google.com/artifact-registry/docs/docker/quickstart)

---

## ✨ Deployment Status

**Last Updated**: January 25, 2026

- ✅ Project ID configured: `gen-lang-client-0712182643`
- ✅ Service account key exists
- ✅ Docker and gcloud CLI integrated
- ✅ Environment variables template ready
- 🟡 Awaiting deployment execution
