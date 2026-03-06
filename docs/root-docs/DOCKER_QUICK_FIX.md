# 🔧 Docker Fix - What You Need To Know

## Problem You're Experiencing

```
ERROR: Cannot connect to the Docker daemon at unix:///Users/vietchung/.docker/run/docker.sock. 
Is the docker daemon running?
```

**Cause**: Docker Desktop is not running

---

## ✅ Quick Fix (2 Steps)

### Step 1: Start Docker
```bash
open -a Docker
```

**Wait 30-60 seconds** for Docker to fully start. You'll see the Docker icon appear in your menu bar at the top.

### Step 2: Verify Docker is Running
```bash
docker ps
```

**Expected output**: Should show an empty table (no containers yet) with no errors.

---

## 🚀 Now Deploy

Once Docker is running:

```bash
# Option A: Use automated script (recommended)
./docker-startup-and-deploy.sh

# Option B: Manual steps
gcloud auth activate-service-account --key-file=gen-lang-client-0712182643-47b71bba4d28.json
gcloud config set project gen-lang-client-0712182643
./setup-cloud-deployment.sh
./deploy-to-gen-lang-client.sh
```

---

## 📋 Detailed Steps

### 1. Start Docker and Wait (30-60 seconds)
```bash
open -a Docker
```

**Signs Docker is ready**:
- ✅ Docker icon appears in menu bar (top right)
- ✅ This command works: `docker ps`
- ✅ Status shows "Docker Desktop is running"

### 2. Configure Environment (5 minutes)
```bash
cp env.example .env
nano .env
```

Edit with your values:
- `DATABASE_URL` 
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- Any other required variables

### 3. Authenticate (1 minute, one time)
```bash
gcloud auth activate-service-account \
  --key-file=gen-lang-client-0712182643-47b71bba4d28.json

gcloud config set project gen-lang-client-0712182643
```

### 4. Initial Setup (5 minutes, one time)
```bash
./setup-cloud-deployment.sh
```

This enables APIs and sets up Google Cloud.

### 5. Deploy (5-10 minutes)
```bash
./deploy-to-gen-lang-client.sh
```

Wait for "Deployment Complete!" message.

### 6. Get Your Service URL
```bash
gcloud run services describe lmsmath-app \
  --region asia-southeast1 \
  --format='value(status.url)'
```

Copy and test the URL in your browser.

---

## 🆘 If Docker Still Won't Start

### Check if Docker is installed
```bash
docker --version
```

**If not installed**:
- Visit: https://www.docker.com/products/docker-desktop
- Download for macOS
- Run the installer
- Follow setup instructions

### Restart Docker completely
```bash
# Quit Docker
killall Docker

# Start it again
open -a Docker

# Wait 30-60 seconds
docker ps  # Verify
```

### Reset Docker (last resort)
1. Click Docker icon in menu bar
2. Select "Quit Docker"
3. Open `/Applications/Docker.app` again
4. Go to Docker > Preferences > Reset > "Reset to Factory Defaults"

---

## 📚 All Available Resources

| File | Purpose |
|------|---------|
| **[DEPLOYMENT_QUICK_START.sh](DEPLOYMENT_QUICK_START.sh)** | Interactive visual guide |
| **[DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md)** | Docker issues & solutions |
| **[docker-startup-and-deploy.sh](docker-startup-and-deploy.sh)** | Automated Docker + deploy |
| **[DEPLOYMENT_INDEX.md](DEPLOYMENT_INDEX.md)** | Complete reference guide |
| **[GEN_LANG_CLIENT_QUICKSTART.md](GEN_LANG_CLIENT_QUICKSTART.md)** | Quick commands |

---

## ⚡ Fastest Way Forward

```bash
# 1. Start Docker and wait for it
open -a Docker
sleep 30

# 2. Deploy using automated script
./docker-startup-and-deploy.sh
```

That's it! The script handles everything else.

---

## 🎯 Success Indicators

✅ **Docker is ready**:
```bash
$ docker ps
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
(empty table - no errors)
```

✅ **Deployment started**:
```
Building Docker image...
Pushing to Container Registry...
Deploying to Cloud Run...
```

✅ **Deployment complete**:
```
✅ Deployment Complete!
🌐 Service URL: https://lmsmath-app-xxxxx.run.app
```

---

## 📝 Copy & Paste One-Liner

```bash
open -a Docker && echo "⏳ Waiting 30 seconds for Docker..." && sleep 30 && ./docker-startup-and-deploy.sh
```

---

**Status**: ✅ Ready to deploy once Docker starts  
**Next**: Run `open -a Docker` and wait 30-60 seconds

🚀 **Then run**: `./docker-startup-and-deploy.sh`
