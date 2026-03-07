# Cloud Run Verification Tools - README 📖

> **Bộ công cụ hoàn chỉnh để verify và test Cloud Run deployment**

---

## 🎯 Mục Đích

Kiểm tra chức năng sau khi deploy Cloud Run, bao gồm:
- ✅ Verify environment variables (đặc biệt DATABASE_URL cho Prisma)
- ✅ Test kết nối database
- ✅ Test auto-scaling với traffic giả lập
- ✅ Monitor logs và performance

---

## ⚡ Quick Start

```bash
# Bước 1: Authenticate với Google Cloud
gcloud auth login
gcloud config set project gen-lang-client-0712182643

# Bước 2: Chạy quick health check
./quick-health-check.sh

# Bước 3: Nếu healthy, chạy full verification
./verify-cloud-run-deployment.sh

# Bước 4: Kiểm tra database
./check-database-connectivity.sh

# Bước 5: (Optional) Test auto-scaling
./test-cloud-run-scaling.sh
```

---

## 📁 Files Created

### 🔧 Scripts (4 files)
1. **quick-health-check.sh** - Quick 10-second health check
2. **verify-cloud-run-deployment.sh** - Complete 8-step verification
3. **check-database-connectivity.sh** - Database & Prisma checks
4. **test-cloud-run-scaling.sh** - Load testing & auto-scaling

### 📚 Documentation (6 files)
1. **CLOUD_RUN_TOOLS_INDEX.md** - Index & quick access guide
2. **CLOUD_RUN_VERIFICATION_SUMMARY.md** - Complete overview
3. **CLOUD_RUN_VERIFICATION_GUIDE.md** - Detailed verification guide
4. **CLOUD_RUN_QUICK_REFERENCE.md** - Quick command reference
5. **CLOUD_RUN_DEPLOYMENT_CHECKLIST.md** - Deployment checklist
6. **CLOUD_RUN_DEPLOYMENT_GUIDE.md** - Full deployment guide (existing)

---

## 🚀 Usage

### Daily Health Check (10 seconds)
```bash
./quick-health-check.sh
```
**Output:**
```
✓ Testing homepage... OK (HTTP 200)
✓ Testing sign-in page... OK (HTTP 200)
✓ Testing auth session API... OK (HTTP 200)
✓ Measuring response time... 0.5s
```

---

### Full Verification (3 minutes)
```bash
./verify-cloud-run-deployment.sh
```
**Checks:**
- Service status & URL
- Environment variables (NODE_ENV, NEXTAUTH_URL, etc.)
- Secrets (DATABASE_URL, NEXTAUTH_SECRET, etc.)
- Resource allocation (CPU, Memory, Timeout)
- Scaling configuration (min/max instances)
- HTTP endpoints (homepage, sign-in, APIs)
- Recent logs & errors

---

### Database Connectivity (2 minutes)
```bash
./check-database-connectivity.sh
```
**Checks:**
- DATABASE_URL secret exists
- Secret is mounted to Cloud Run
- Database connection via APIs
- Prisma configuration
- SSL mode & connection pooling
- Database errors in logs

---

### Load Testing (15 minutes)
```bash
./test-cloud-run-scaling.sh
```
**Tests:**
- Baseline performance
- Light load (10 concurrent users)
- Medium load (50 concurrent)
- Heavy load (100 concurrent)
- Spike test (200 concurrent)
- Scale down behavior

**Requires:** Apache Bench
```bash
brew install httpd  # macOS
# or
sudo apt-get install apache2-utils  # Linux
```

---

## 📊 What Gets Verified

| Category | Items Checked |
|----------|---------------|
| **Service** | Status, URL, Revisions |
| **Environment** | NODE_ENV, NEXTAUTH_URL, GCS bucket |
| **Secrets** | DATABASE_URL, NEXTAUTH_SECRET, API keys |
| **Resources** | CPU (2 cores), Memory (2Gi), Timeout (300s) |
| **Scaling** | Min (1), Max (10), Concurrency (100) |
| **Endpoints** | Homepage, Sign-in, Auth APIs |
| **Database** | Connection, Prisma, SSL, Pooling |
| **Performance** | Response time, Throughput, Error rate |
| **Scaling** | Scale up/down behavior under load |

---

## 🎓 Documentation Guide

**New to Cloud Run?**  
→ Start with `CLOUD_RUN_TOOLS_INDEX.md`

**Need quick commands?**  
→ Use `CLOUD_RUN_QUICK_REFERENCE.md`

**Deploying for first time?**  
→ Follow `CLOUD_RUN_DEPLOYMENT_CHECKLIST.md`

**Need detailed verification guide?**  
→ Read `CLOUD_RUN_VERIFICATION_GUIDE.md`

**Want complete overview?**  
→ Check `CLOUD_RUN_VERIFICATION_SUMMARY.md`

---

## 🐛 Troubleshooting

### Service Not Responding
```bash
# Check logs
gcloud run services logs read lmsmath --region=asia-southeast1 --limit=50

# Quick fix: Increase resources
gcloud run services update lmsmath --region=asia-southeast1 --memory=4Gi --cpu=4
```

### Database Issues
```bash
# Run database check
./check-database-connectivity.sh

# Verify DATABASE_URL
gcloud secrets versions access latest --secret=DATABASE_URL
```

### Slow Performance
```bash
# Set min instances
gcloud run services update lmsmath --region=asia-southeast1 --min-instances=2

# Increase resources
gcloud run services update lmsmath --region=asia-southeast1 --cpu=4 --memory=4Gi
```

**More troubleshooting:** See `CLOUD_RUN_VERIFICATION_GUIDE.md` or `CLOUD_RUN_QUICK_REFERENCE.md`

---

## 📈 Performance Targets

| Metric | Target | Acceptable |
|--------|--------|------------|
| Homepage Load | <1s | <2s |
| API Response | <200ms | <500ms |
| Database Query | <50ms | <200ms |
| Error Rate | <0.1% | <1% |
| P95 Latency | <1s | <2s |

---

## 🔗 Service Information

```
Service:     lmsmath
Project:     gen-lang-client-0712182643
Region:      asia-southeast1
URL:         https://lmsmath-442514522574.asia-southeast1.run.app

Console:     https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath
Metrics:     https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath/metrics
Logs:        https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath/logs
```

---

## 📋 Prerequisites

### Required
- **gcloud CLI** - `brew install google-cloud-sdk`
- **curl** - Usually pre-installed
- **GCP Authentication** - `gcloud auth login`

### Optional (for full testing)
- **Apache Bench** - `brew install httpd` (for load testing)
- **jq** - `brew install jq` (for JSON processing)

### Verify installations:
```bash
gcloud --version
curl --version
ab -V  # Optional
```

---

## ✅ Success Criteria

Your deployment is successful if:

1. ✅ `quick-health-check.sh` returns all OK (HTTP 200)
2. ✅ `verify-cloud-run-deployment.sh` passes all checks
3. ✅ `check-database-connectivity.sh` confirms DB connection
4. ✅ No critical errors in logs
5. ✅ Response times meet targets
6. ✅ Auto-scaling works under load

---

## 🆘 Getting Help

### Quick Commands
```bash
# View service status
gcloud run services describe lmsmath --region=asia-southeast1

# View logs
gcloud run services logs tail lmsmath --region=asia-southeast1

# View metrics
open "https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath/metrics"
```

### Documentation
- Quick Reference: `CLOUD_RUN_QUICK_REFERENCE.md`
- Troubleshooting: `CLOUD_RUN_VERIFICATION_GUIDE.md` (section 🐛)
- Emergency: `CLOUD_RUN_QUICK_REFERENCE.md` (Emergency section)

### External Resources
- [Cloud Run Docs](https://cloud.google.com/run/docs)
- [Prisma on Cloud Run](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-cloud-run)
- [Next.js Docker](https://github.com/vercel/next.js/tree/canary/examples/with-docker)

---

## 💡 Tips

1. **Run health checks daily** to catch issues early
2. **Save test outputs** for comparison: `./verify-cloud-run-deployment.sh > results.log`
3. **Check before deploys** to establish baseline
4. **Monitor costs** after load tests
5. **Set up alerts** for errors and latency
6. **Keep quick reference handy** for daily ops

---

## 🎉 Ready to Use!

All scripts are:
- ✅ Created and executable
- ✅ Fully documented
- ✅ Ready to run
- ✅ Tested syntax

**Start now:**
```bash
./quick-health-check.sh
```

---

**Created:** October 9, 2025  
**Version:** 1.0  
**Status:** ✅ Ready for Production Use

**For complete overview:** See `CLOUD_RUN_VERIFICATION_SUMMARY.md`  
**For index:** See `CLOUD_RUN_TOOLS_INDEX.md`

