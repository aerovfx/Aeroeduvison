# Cloud Run Verification Tools - Index 📑

**Quick Access Guide for Cloud Run Deployment Verification**

---

## 🚀 Quick Start

```bash
# 1. Quick health check (10 seconds)
./quick-health-check.sh

# 2. Full verification (3 minutes)
./verify-cloud-run-deployment.sh

# 3. Database check (2 minutes)
./check-database-connectivity.sh

# 4. Load test (15 minutes)
./test-cloud-run-scaling.sh
```

---

## 📂 Files Overview

### 🔧 Executable Scripts

| Script | Purpose | Duration | Prerequisites |
|--------|---------|----------|---------------|
| `quick-health-check.sh` | Quick service health check | 10s | curl |
| `verify-cloud-run-deployment.sh` | Complete deployment verification | 2-3min | gcloud CLI |
| `check-database-connectivity.sh` | Database connectivity test | 1-2min | gcloud CLI |
| `test-cloud-run-scaling.sh` | Auto-scaling load test | 10-15min | gcloud CLI, Apache Bench |

### 📚 Documentation Files

| Document | Purpose | When to Read |
|----------|---------|--------------|
| `CLOUD_RUN_VERIFICATION_SUMMARY.md` | **Start here** - Overview of all tools | First time |
| `CLOUD_RUN_VERIFICATION_GUIDE.md` | Complete verification guide | Deep dive |
| `CLOUD_RUN_QUICK_REFERENCE.md` | Quick command reference | Daily use |
| `CLOUD_RUN_DEPLOYMENT_CHECKLIST.md` | Deployment checklist | Before/after deploy |
| `CLOUD_RUN_DEPLOYMENT_GUIDE.md` | Full deployment guide | Initial setup |

---

## 🎯 Use Cases

### Use Case 1: "Is my service healthy?"
```bash
./quick-health-check.sh
```
**Output:** Quick status of homepage, sign-in, and API endpoints

---

### Use Case 2: "I just deployed, is everything configured correctly?"
```bash
./verify-cloud-run-deployment.sh
```
**Output:** Complete verification of service, environment variables, secrets, resources, and endpoints

---

### Use Case 3: "Is my database connection working?"
```bash
./check-database-connectivity.sh
```
**Output:** DATABASE_URL verification, connection test, Prisma checks, SSL/pooling status

---

### Use Case 4: "How does my service handle load? Will it scale?"
```bash
./test-cloud-run-scaling.sh
```
**Output:** Performance metrics under various load levels, scaling behavior analysis

---

### Use Case 5: "I need a quick command to check logs"
**Open:** `CLOUD_RUN_QUICK_REFERENCE.md`  
**Find:** Section "Logs & Monitoring"

---

### Use Case 6: "Something is broken, how do I troubleshoot?"
1. Run: `./quick-health-check.sh` to identify the issue
2. Check: `CLOUD_RUN_QUICK_REFERENCE.md` troubleshooting section
3. If needed: `CLOUD_RUN_VERIFICATION_GUIDE.md` detailed troubleshooting

---

## 📊 Verification Workflow

```
First Time Deployment:
1. Read CLOUD_RUN_DEPLOYMENT_GUIDE.md
2. Deploy using cloudbuild.yaml
3. Use CLOUD_RUN_DEPLOYMENT_CHECKLIST.md
4. Run all verification scripts
5. Set up monitoring

Daily Operations:
1. ./quick-health-check.sh
2. Check Cloud Console metrics
3. Review logs if needed
4. Use CLOUD_RUN_QUICK_REFERENCE.md

When Issues Occur:
1. ./quick-health-check.sh (identify issue)
2. Check appropriate detailed script
3. Follow troubleshooting in guides
4. Use emergency commands from quick reference
```

---

## 🔍 What Each Script Checks

### verify-cloud-run-deployment.sh ✅
- Cloud Run service status and URL
- Environment variables (NODE_ENV, NEXTAUTH_URL, etc.)
- Secrets (DATABASE_URL, NEXTAUTH_SECRET, etc.)
- Resource allocation (CPU, Memory, Timeout)
- Scaling configuration (min/max instances, concurrency)
- HTTP endpoints (/, /sign-in, /api/auth/*)
- Recent logs and errors
- Performance metrics

### check-database-connectivity.sh 🗄️
- DATABASE_URL secret existence
- Secret mounted to Cloud Run service
- Database connection via application APIs
- Prisma-related errors in logs
- Database connection string format
- SSL mode and connection pooling
- Prisma Client generation
- Database provider (PostgreSQL vs SQLite)

### test-cloud-run-scaling.sh 📈
- Baseline performance (single request)
- Light load (10 concurrent users)
- Medium load (50 concurrent users)
- Heavy load (100 concurrent users)
- Sustained load (2 minutes continuous)
- Spike test (200 concurrent users)
- Scale down behavior (idle period)
- Multiple endpoints simultaneously
- Response times, throughput, error rates
- Instance count during load

### quick-health-check.sh 🏥
- Homepage accessibility (HTTP 200)
- Sign-in page accessibility
- Auth session API
- Response time measurement

---

## 📋 Pre-requisites

### Required
- **curl** - Usually pre-installed on macOS/Linux
- **gcloud CLI** - `brew install google-cloud-sdk` (macOS)
- **Authenticated to GCP** - `gcloud auth login`

### Optional (for full testing)
- **Apache Bench** - `brew install httpd` (macOS)
- **jq** - `brew install jq` (JSON processing)
- **bc** - Usually pre-installed (calculations)

### Check installations:
```bash
curl --version        # Check curl
gcloud --version      # Check gcloud
ab -V                 # Check Apache Bench
jq --version          # Check jq
```

---

## 🎓 Learning Path

### Beginner (New to Cloud Run)
1. Read: `CLOUD_RUN_DEPLOYMENT_GUIDE.md` (full guide)
2. Read: `CLOUD_RUN_VERIFICATION_SUMMARY.md` (overview)
3. Follow: `CLOUD_RUN_DEPLOYMENT_CHECKLIST.md` (step by step)
4. Run: Scripts in order with documentation open

### Intermediate (Familiar with Cloud Run)
1. Review: `CLOUD_RUN_VERIFICATION_SUMMARY.md` (quick overview)
2. Run: All verification scripts
3. Keep: `CLOUD_RUN_QUICK_REFERENCE.md` handy
4. Set up: Monitoring and alerts

### Advanced (Daily operations)
1. Use: `quick-health-check.sh` regularly
2. Refer to: `CLOUD_RUN_QUICK_REFERENCE.md`
3. Monitor: Cloud Console metrics
4. Optimize: Based on performance data

---

## 🆘 Emergency Quick Reference

### Service Down
```bash
# Quick check
./quick-health-check.sh

# View errors
gcloud run services logs read lmsmath --region=asia-southeast1 --limit=50 | grep -i error

# Rollback (if needed)
PREV=$(gcloud run revisions list --service=lmsmath --region=asia-southeast1 --format="value(name)" --limit=2 | tail -1)
gcloud run services update-traffic lmsmath --region=asia-southeast1 --to-revisions=$PREV=100
```

### Database Issues
```bash
# Check connectivity
./check-database-connectivity.sh

# Verify secret
gcloud secrets versions access latest --secret=DATABASE_URL

# Update if needed
echo -n "postgresql://..." | gcloud secrets versions add DATABASE_URL --data-file=-
```

### Slow Performance
```bash
# Check current config
gcloud run services describe lmsmath --region=asia-southeast1

# Increase resources
gcloud run services update lmsmath --region=asia-southeast1 --memory=4Gi --cpu=4

# Reduce cold starts
gcloud run services update lmsmath --region=asia-southeast1 --min-instances=2
```

**More emergency commands:** See `CLOUD_RUN_QUICK_REFERENCE.md` Emergency section

---

## 📊 Expected Results

### ✅ Healthy Deployment

**quick-health-check.sh:**
```
✓ Testing homepage... OK (HTTP 200)
✓ Testing sign-in page... OK (HTTP 200)
✓ Testing auth session API... OK (HTTP 200)
✓ Measuring response time... 0.5s
```

**verify-cloud-run-deployment.sh:**
```
✓ Service is deployed and running
✓ Environment variables are configured
✓ DATABASE_URL - exists and mounted
✓ NEXTAUTH_SECRET - exists and mounted
✓ Homepage - HTTP 200
✓ Auth Session API - HTTP 200
✓ No recent errors found in logs
```

**check-database-connectivity.sh:**
```
✓ DATABASE_URL secret exists
✓ DATABASE_URL is mounted to Cloud Run service
✓ Auth Session API responded successfully
✓ No database errors found in recent logs
✓ Using PostgreSQL (recommended)
✓ SSL mode: Required (secure)
```

**test-cloud-run-scaling.sh:**
```
Baseline: 0.5s response time
Light Load (10c): 50+ req/sec, 0 failures
Medium Load (50c): 100+ req/sec, 2-3 instances
Heavy Load (100c): 200+ req/sec, 5-8 instances
Spike Test (200c): 150+ req/sec, 8-10 instances
Auto-scaling: ✓ Working as expected
```

---

## 🔗 Service Information

```
Service Name: lmsmath
Project ID: gen-lang-client-0712182643
Region: asia-southeast1
Service URL: https://lmsmath-442514522574.asia-southeast1.run.app

Cloud Console:
https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath

Metrics:
https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath/metrics

Logs:
https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath/logs
```

---

## 💡 Tips

1. **Run scripts in order:** quick → verify → database → scaling
2. **Save outputs:** Use `> output.log` to save results
3. **Compare over time:** Run regularly and compare performance
4. **Check before changes:** Always verify before major updates
5. **Monitor costs:** Review billing after load tests
6. **Set up alerts:** Don't wait for issues, get notified
7. **Document results:** Keep track of performance metrics
8. **Keep docs handy:** Bookmark quick reference

---

## 📞 Support

### Documentation
- Complete Guide: `CLOUD_RUN_VERIFICATION_GUIDE.md`
- Quick Reference: `CLOUD_RUN_QUICK_REFERENCE.md`
- Deployment Checklist: `CLOUD_RUN_DEPLOYMENT_CHECKLIST.md`

### Commands
- View this index: `cat CLOUD_RUN_TOOLS_INDEX.md`
- List all scripts: `ls -lh *cloud*.sh`
- List all docs: `ls -lh CLOUD_RUN*.md`

### External Resources
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Prisma on Cloud Run](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-cloud-run)
- [Next.js Docker](https://github.com/vercel/next.js/tree/canary/examples/with-docker)

---

## ✅ Quick Checklist

Before running scripts, ensure:
- [ ] Google Cloud CLI installed
- [ ] Authenticated to GCP (`gcloud auth login`)
- [ ] Project set (`gcloud config set project gen-lang-client-0712182643`)
- [ ] Service is deployed
- [ ] Secrets are configured

After running scripts, verify:
- [ ] All HTTP endpoints return 200
- [ ] Database connectivity working
- [ ] No errors in logs
- [ ] Auto-scaling behavior as expected
- [ ] Performance meets targets

---

**Created:** October 9, 2025  
**Version:** 1.0  
**Status:** ✅ Ready to Use

**Start here:** `CLOUD_RUN_VERIFICATION_SUMMARY.md`  
**Quick commands:** `CLOUD_RUN_QUICK_REFERENCE.md`  
**Full guide:** `CLOUD_RUN_VERIFICATION_GUIDE.md`

