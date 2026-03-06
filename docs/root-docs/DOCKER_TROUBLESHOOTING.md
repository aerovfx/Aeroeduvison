# 🐳 Docker Setup Troubleshooting

## Problem: "Cannot connect to the Docker daemon"

This means Docker Desktop is not running. Here's how to fix it:

---

## ✅ Solution 1: Start Docker Using the Script (Recommended)

```bash
# This script starts Docker and deploys automatically
chmod +x docker-startup-and-deploy.sh
./docker-startup-and-deploy.sh
```

The script will:
1. ✅ Check if Docker is installed
2. ✅ Start Docker Desktop
3. ✅ Wait for Docker to be ready
4. ✅ Verify Google Cloud authentication
5. ✅ Deploy to Cloud Run

---

## ✅ Solution 2: Manual Docker Startup

### Option A: Using Spotlight Search (Fastest)
```bash
# Press Command+Space, type "Docker", press Enter
# Or use this command:
open -a Docker
```

### Option B: Using Finder
1. Open Finder
2. Go to Applications
3. Double-click "Docker.app"

### Option C: Using Terminal
```bash
open /Applications/Docker.app
```

---

## ⏳ Wait for Docker to Start

After starting Docker, wait 30-60 seconds for it to fully boot. You'll see:
- Docker icon in the top menu bar
- Status message "Docker Desktop is running"

Test if Docker is ready:
```bash
docker ps
```

**Expected output**: An empty table (no containers running yet)

---

## 🚀 Deploy Once Docker is Running

```bash
# Option 1: Use the automated script
./docker-startup-and-deploy.sh

# Option 2: Deploy manually
./deploy-to-gen-lang-client.sh
```

---

## 🔍 Verify Docker is Running

```bash
# Show Docker version
docker --version

# List running containers
docker ps

# Show Docker status
docker info
```

**If Docker is running**, all these commands will work without errors.

---

## ❌ Error: "Docker not found"

This means Docker Desktop is not installed.

**Solution**: Download and install Docker Desktop
- Visit: https://www.docker.com/products/docker-desktop
- Select macOS version (Intel or Apple Silicon)
- Run the installer
- Follow setup instructions

---

## ❌ Error: "Permission denied while trying to connect to Docker daemon"

This is a permissions issue.

**Solution**: 
```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# OR reset Docker permissions
sudo chown -R $(id -u):$(id -g) ~/.docker

# Then restart Docker Desktop
open -a Docker
```

---

## ✨ Quick Start

1. **Start Docker**
   ```bash
   open -a Docker
   ```

2. **Wait for it to fully start** (30-60 seconds)
   - You'll see Docker icon in the menu bar
   
3. **Verify Docker is ready**
   ```bash
   docker ps
   ```

4. **Deploy**
   ```bash
   ./deploy-to-gen-lang-client.sh
   ```

---

## 📋 Complete Deployment Flow

```bash
# 1. Make sure Docker is running
open -a Docker

# 2. Wait ~30 seconds, then verify
docker ps

# 3. Configure environment
cp env.example .env
nano .env  # Edit with your values

# 4. Authenticate (one time)
gcloud auth activate-service-account --key-file=gen-lang-client-0712182643-47b71bba4d28.json
gcloud config set project gen-lang-client-0712182643

# 5. Initial setup (one time)
./setup-cloud-deployment.sh

# 6. Deploy
./deploy-to-gen-lang-client.sh

# 7. Get your service URL
gcloud run services describe lmsmath-app --region asia-southeast1 --format='value(status.url)'
```

---

## 🆘 Still Having Issues?

### Check Docker logs
```bash
# View Docker desktop logs
log stream --predicate 'eventMessage contains[cd] "Docker"' --level debug
```

### Restart Docker completely
```bash
# Quit Docker
killall Docker

# Start it again
open -a Docker

# Wait 30-60 seconds
```

### Reset Docker (last resort)
```bash
# This removes all containers and images
open -a Docker
# Then go to: Docker > Preferences > Reset > "Reset to Factory Defaults"
```

---

## 📞 Support

If Docker still won't start:
1. Check System Preferences > Security & Privacy
2. Verify you have admin permissions
3. Try restarting your Mac
4. Visit: https://www.docker.com/support

---

**Related Files**:
- [DEPLOYMENT_INDEX.md](DEPLOYMENT_INDEX.md) - Full deployment guide
- [GEN_LANG_CLIENT_QUICKSTART.md](GEN_LANG_CLIENT_QUICKSTART.md) - Quick reference
- [docker-startup-and-deploy.sh](docker-startup-and-deploy.sh) - Automated script

---

**Status**: ✅ Docker setup guide complete

🚀 **Ready?** Run: `./docker-startup-and-deploy.sh`
