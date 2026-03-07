# 🚀 AeroeduVision Deployment to gen-lang-client-0712182643

**Status**: ✅ **Ready for Deployment**  
**Date**: January 25, 2026

---

## 📋 What's Been Setup

✅ **Deployment Scripts Created**:
- `setup-cloud-deployment.sh` - Initial cloud setup (run once)
- `deploy-to-gen-lang-client.sh` - Deploy application (run each time)
- `GEN_LANG_CLIENT_QUICKSTART.md` - Quick reference guide
- `DEPLOYMENT_GUIDE_GEN_LANG_CLIENT.md` - Full documentation

✅ **Configuration Files Ready**:
- `env.example` - Environment template
- `package.json` - Node.js dependencies
- `Dockerfile` - Container image definition
- `cloud-run.yaml` - Kubernetes manifest
- `cloudbuild.yaml` - CI/CD configuration

✅ **Google Cloud Setup**:
- Project ID: `gen-lang-client-0712182643`
- Service Account Key: `gen-lang-client-0712182643-47b71bba4d28.json` ✓ (already in project)
- Service Name: `lmsmath-app`
- Region: `asia-southeast1` (Singapore)

---

## 🎯 Next Steps: Deploy Now

### Step 1: Prepare Environment (2 minutes)
```bash
cd /Users/vietchung/Aeroeduvision

# Create your local environment file
cp env.example .env

# Edit with your actual values
nano .env
# OR
vim .env
```

**Required variables to update in `.env`**:
```
DATABASE_URL="your-actual-database-url"
NEXTAUTH_SECRET="generate-a-random-secret"
NEXTAUTH_URL="https://your-service-url.run.app"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-key"
GOOGLE_CLOUD_PROJECT_ID="gen-lang-client-0712182643"
```

### Step 2: Initial Setup (3-5 minutes, run once)
```bash
# Authenticate with Google Cloud using service account key
gcloud auth activate-service-account \
  --key-file=gen-lang-client-0712182643-47b71bba4d28.json

# Set the GCP project
gcloud config set project gen-lang-client-0712182643

# Run the setup script
./setup-cloud-deployment.sh
```

This will:
- ✅ Enable required Google Cloud APIs
- ✅ Create Artifact Registry repository
- ✅ Configure Docker authentication
- ✅ Setup IAM roles and permissions

### Step 3: Deploy Application (5-10 minutes)
```bash
# Deploy to Cloud Run
./deploy-to-gen-lang-client.sh
```

This will:
- ✅ Build Docker image
- ✅ Push to Container Registry
- ✅ Deploy to Cloud Run
- ✅ Configure environment variables
- ✅ Show you the service URL

---

## 📊 Full Deployment Checklist

- [ ] **Environment Setup**
  - [ ] Copy `env.example` to `.env`
  - [ ] Update all required variables in `.env`
  - [ ] Save and verify `.env` file

- [ ] **Google Cloud Authentication**
  - [ ] Authenticate: `gcloud auth activate-service-account --key-file=gen-lang-client-0712182643-47b71bba4d28.json`
  - [ ] Set project: `gcloud config set project gen-lang-client-0712182643`
  - [ ] Verify: `gcloud config list`

- [ ] **Initial Setup** (First time only)
  - [ ] Run: `./setup-cloud-deployment.sh`
  - [ ] Check for errors
  - [ ] Verify all APIs are enabled

- [ ] **Build & Deploy**
  - [ ] Run: `./deploy-to-gen-lang-client.sh`
  - [ ] Wait for Docker build to complete
  - [ ] Wait for image push to complete
  - [ ] Wait for Cloud Run deployment to complete

- [ ] **Verify Deployment**
  - [ ] Get service URL from deployment output
  - [ ] Test: `curl https://your-service-url.run.app/health`
  - [ ] Check logs: `gcloud run services logs read lmsmath-app --region asia-southeast1 --limit=20`
  - [ ] Visit URL in browser and test functionality

---

## 🔧 Post-Deployment

### Access Your Service
```bash
# Get the service URL
gcloud run services describe lmsmath-app \
  --region asia-southeast1 \
  --format='value(status.url)'
```

### Monitor Deployment
```bash
# View live logs (add --follow to stream)
gcloud run services logs read lmsmath-app \
  --region asia-southeast1 \
  --limit=50

# Watch logs in real-time
gcloud run services logs read lmsmath-app \
  --region asia-southeast1 \
  --follow
```

### Update Environment Variables
```bash
# Update a single variable
gcloud run services update lmsmath-app \
  --region asia-southeast1 \
  --set-env-vars KEY=VALUE

# Update multiple variables
gcloud run services update lmsmath-app \
  --region asia-southeast1 \
  --set-env-vars KEY1=VALUE1,KEY2=VALUE2
```

### Redeploy (After Code Changes)
```bash
# Just run the deploy script again
./deploy-to-gen-lang-client.sh
```

### Scale Service
```bash
# Increase max instances
gcloud run services update lmsmath-app \
  --region asia-southeast1 \
  --max-instances 20
```

---

## 🐛 Troubleshooting

### Issue: "gcloud: command not found"
**Solution**: Install Google Cloud SDK
```bash
# Visit: https://cloud.google.com/sdk/docs/install
# Then authenticate
gcloud auth activate-service-account \
  --key-file=gen-lang-client-0712182643-47b71bba4d28.json
```

### Issue: "docker: command not found"
**Solution**: Install Docker Desktop
- Visit: https://www.docker.com/products/docker-desktop
- Complete the installation

### Issue: "Permission denied" during deployment
**Solution**: Re-authenticate
```bash
gcloud auth activate-service-account \
  --key-file=gen-lang-client-0712182643-47b71bba4d28.json
gcloud config set project gen-lang-client-0712182643
```

### Issue: ".env file not found"
**Solution**: Create it
```bash
cp env.example .env
nano .env  # Edit and add your values
```

### Issue: Database connection fails after deployment
**Solution**: Verify DATABASE_URL
```bash
# Check the environment variable is set
gcloud run services describe lmsmath-app \
  --region asia-southeast1 \
  --format='value(spec.template.spec.containers[0].env)'

# Update if needed
gcloud run services update lmsmath-app \
  --region asia-southeast1 \
  --set-env-vars DATABASE_URL="your-correct-url"
```

### Issue: Service deployment hangs or fails
**Solution**: Check logs immediately
```bash
gcloud run services logs read lmsmath-app \
  --region asia-southeast1 \
  --limit=100
```

---

## 📚 Documentation Files

- **[GEN_LANG_CLIENT_QUICKSTART.md](GEN_LANG_CLIENT_QUICKSTART.md)** - Quick reference (copy-paste commands)
- **[DEPLOYMENT_GUIDE_GEN_LANG_CLIENT.md](DEPLOYMENT_GUIDE_GEN_LANG_CLIENT.md)** - Detailed guide with options
- **[env.example](env.example)** - Environment variables template
- **[cloudbuild.yaml](cloudbuild.yaml)** - CI/CD configuration
- **[cloud-run.yaml](cloud-run.yaml)** - Cloud Run service definition

---

## 🔐 Security Notes

- **Service Account Key**: Keep `gen-lang-client-0712182643-47b71bba4d28.json` secure
- **Environment Variables**: Never commit `.env` to git (already in .gitignore)
- **Secrets**: Use Google Cloud Secret Manager for sensitive data:
  ```bash
  echo -n "your-secret-value" | gcloud secrets create SECRET_NAME --data-file=-
  ```
- **Service Access**: Cloud Run service is public (`--allow-unauthenticated`)
  - If you need authentication, remove the flag

---

## 📞 Support

**Google Cloud Documentation**:
- Cloud Run: https://cloud.google.com/run/docs
- Artifact Registry: https://cloud.google.com/artifact-registry/docs
- Cloud Build: https://cloud.google.com/build/docs

**Project Information**:
- Project ID: `gen-lang-client-0712182643`
- Service: `lmsmath-app`
- Region: `asia-southeast1`
- Port: `3000`

---

## ✨ Summary

You have everything ready to deploy AeroeduVision to Google Cloud Run:

1. ✅ Scripts created and executable
2. ✅ Google Cloud project configured
3. ✅ Service account key in place
4. ✅ Environment templates ready
5. ✅ Documentation complete

**Ready to deploy? Start with Step 1 above!**

---

**Last Updated**: January 25, 2026  
**Project**: AeroeduVision  
**Cloud Provider**: Google Cloud (gen-lang-client-0712182643)
