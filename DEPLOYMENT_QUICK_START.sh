#!/bin/bash
# DEPLOYMENT_QUICK_START.sh - Visual deployment guide

clear

cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                  🚀 AeroeduVision Quick Deploy Guide 🚀                     ║
║                                                                              ║
║              Google Cloud Project: gen-lang-client-0712182643               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

⚡ QUICK START - 4 STEPS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1️⃣  START DOCKER (30-60 seconds)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Option A - Quick Command:
  $ open -a Docker

  Option B - Using Script (with verification):
  $ ./docker-startup-and-deploy.sh

  Then wait for Docker to fully start (~30-60 seconds)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 2️⃣  CONFIGURE ENVIRONMENT (5 minutes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  $ cp env.example .env
  $ nano .env

  Update these required variables:
    • DATABASE_URL
    • NEXTAUTH_SECRET
    • NEXTAUTH_URL
    • GOOGLE_CLIENT_ID
    • GOOGLE_CLIENT_SECRET
    • SUPABASE_URL (if using)
    • SUPABASE_ANON_KEY (if using)

  Then save and close (Ctrl+X, Y, Enter in nano)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 3️⃣  AUTHENTICATE & SETUP (3-5 minutes, ONE TIME ONLY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  $ gcloud auth activate-service-account \
      --key-file=gen-lang-client-0712182643-47b71bba4d28.json

  $ gcloud config set project gen-lang-client-0712182643

  $ ./setup-cloud-deployment.sh

  ✅ Wait for all green checkmarks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 4️⃣  DEPLOY (5-10 minutes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  $ ./deploy-to-gen-lang-client.sh

  ✅ Wait for "Deployment Complete!" message

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 GET YOUR SERVICE URL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  $ gcloud run services describe lmsmath-app \
      --region asia-southeast1 \
      --format='value(status.url)'

  Copy the URL and test it in your browser!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🐛 TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ❌ "Docker daemon not running?"
     👉 Check: DOCKER_TROUBLESHOOTING.md

  ❌ "gcloud not found?"
     👉 Install: https://cloud.google.com/sdk/docs/install

  ❌ ".env file not found?"
     👉 Run: cp env.example .env && nano .env

  ❌ "Need more help?"
     👉 Read: DEPLOYMENT_INDEX.md (complete guide)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 HELPFUL COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  View logs:
  $ gcloud run services logs read lmsmath-app --region asia-southeast1 --limit=50

  Update environment variable:
  $ gcloud run services update lmsmath-app --region asia-southeast1 \
      --set-env-vars KEY=VALUE

  Check Docker is running:
  $ docker ps

  Verify gcloud authentication:
  $ gcloud auth list

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 COPY & PASTE COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ALL IN ONE (if already configured):
open -a Docker && sleep 30 && \
gcloud auth activate-service-account --key-file=gen-lang-client-0712182643-47b71bba4d28.json && \
gcloud config set project gen-lang-client-0712182643 && \
./setup-cloud-deployment.sh && \
./deploy-to-gen-lang-client.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ STATUS: READY TO DEPLOY

  ✅ Docker installed
  ✅ Google Cloud project configured
  ✅ Service account key in place
  ✅ Deployment scripts ready
  ✅ Documentation complete

  🚀 YOU'RE READY TO DEPLOY!

═══════════════════════════════════════════════════════════════════════════════

EOF

echo ""
echo "Press Enter to continue or 'q' to quit:"
read choice

if [ "$choice" = "q" ]; then
    exit 0
fi

# Offer to open documentation
clear
echo "📚 Which guide would you like to open?"
echo ""
echo "1. DEPLOYMENT_INDEX.md (Complete reference)"
echo "2. GEN_LANG_CLIENT_QUICKSTART.md (Quick commands)"
echo "3. DOCKER_TROUBLESHOOTING.md (Docker issues)"
echo "4. Start deployment now"
echo ""
read -p "Choose (1-4): " choice

case $choice in
    1)
        open DEPLOYMENT_INDEX.md
        ;;
    2)
        open GEN_LANG_CLIENT_QUICKSTART.md
        ;;
    3)
        open DOCKER_TROUBLESHOOTING.md
        ;;
    4)
        echo "Starting deployment..."
        open -a Docker
        sleep 30
        ./deploy-to-gen-lang-client.sh
        ;;
    *)
        echo "Invalid choice"
        ;;
esac
