# Cloud Run Deployment Verification Guide 🚀

## Hướng Dẫn Kiểm Tra Cloud Run Deployment

**Project:** LMS Math  
**Platform:** Google Cloud Run  
**Region:** asia-southeast1  
**Service URL:** https://lmsmath-442514522574.asia-southeast1.run.app  
**Date:** October 9, 2025

---

## 📋 Tổng Quan (Overview)

Tài liệu này hướng dẫn cách kiểm tra chức năng của ứng dụng sau khi deploy lên Cloud Run, bao gồm:
- ✅ Kiểm tra trạng thái service
- ✅ Xác minh environment variables (đặc biệt DATABASE_URL cho Prisma)
- ✅ Test kết nối database
- ✅ Test auto-scaling với traffic giả lập
- ✅ Monitoring và logging

---

## 🛠️ Prerequisites (Yêu Cầu)

### 1. Cài Đặt Tools

```bash
# 1. Google Cloud CLI
brew install google-cloud-sdk  # macOS
# hoặc
curl https://sdk.cloud.google.com | bash  # Linux

# 2. Apache Bench (cho load testing)
brew install httpd  # macOS
# hoặc
sudo apt-get install apache2-utils  # Linux

# 3. jq (JSON processor)
brew install jq  # macOS
# hoặc
sudo apt-get install jq  # Linux

# 4. Verify installations
gcloud --version
ab -V
jq --version
```

### 2. Xác Thực Google Cloud

```bash
# Login to Google Cloud
gcloud auth login

# Set project
gcloud config set project gen-lang-client-0712182643

# Verify current project
gcloud config get-value project
```

---

## 📊 Script Verification Tools

### 1. **verify-cloud-run-deployment.sh**

Script chính để kiểm tra deployment status và environment variables.

```bash
./verify-cloud-run-deployment.sh
```

**Kiểm Tra:**
- ✓ Cloud Run service status
- ✓ Environment variables configuration
- ✓ Secrets (DATABASE_URL, NEXTAUTH_SECRET, etc.)
- ✓ Resource allocation (CPU, Memory)
- ✓ Scaling configuration (min/max instances)
- ✓ HTTP endpoints (homepage, auth APIs)
- ✓ Recent logs và errors

**Output Example:**
```
╔════════════════════════════════════════════════════════════════╗
║      Cloud Run Deployment Verification - LMS Math             ║
╚════════════════════════════════════════════════════════════════╝

📋 STEP 1: Checking Cloud Run Service Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Service is deployed and running

Service Details:
NAME     URL                                                          LATEST_REVISION  STATUS
lmsmath  https://lmsmath-442514522574.asia-southeast1.run.app        lmsmath-00042    True
```

---

### 2. **check-database-connectivity.sh**

Script để kiểm tra kết nối database và Prisma configuration.

```bash
./check-database-connectivity.sh
```

**Kiểm Tra:**
- ✓ DATABASE_URL secret existence
- ✓ Secret mounted to Cloud Run
- ✓ Database connection via application
- ✓ Prisma errors in logs
- ✓ Database provider (PostgreSQL, MySQL, SQLite)
- ✓ SSL mode và connection pooling
- ✓ Prisma Client generation

**Critical Checks:**
```
✓ DATABASE_URL secret exists
✓ DATABASE_URL is mounted to Cloud Run service
✓ Auth Session API responded successfully (requires DB)
✓ No database errors found in recent logs
✓ Using PostgreSQL (recommended for Cloud Run)
✓ SSL mode: Required (secure)
```

---

### 3. **test-cloud-run-scaling.sh**

Script để test auto-scaling behavior với simulated traffic.

```bash
./test-cloud-run-scaling.sh
```

**Load Tests:**

| Test | Concurrent Users | Requests | Purpose |
|------|-----------------|----------|---------|
| Baseline | 1 | 1 | Measure single request performance |
| Light Load | 10 | 100 | Test normal traffic |
| Medium Load | 50 | 500 | Trigger 2-3 instances |
| Heavy Load | 100 | 1000 | Trigger 5-8 instances |
| Sustained Load | 50 | 120s duration | Test sustained performance |
| Spike Test | 200 | 2000 | Test rapid scale-up |
| Scale Down | 0 | 60s idle | Test scale-down behavior |

**Expected Results:**
```
Heavy Load Test (100 concurrent users):
  • Throughput: 250-500 req/sec
  • Avg Response Time: 100-300 ms
  • Failed Requests: 0
  
Auto-Scaling Behavior:
  • Min Instances: 1
  • Max Instances: 10
  • Concurrency: 100 requests per instance
```

---

## 🔍 Chi Tiết Kiểm Tra (Detailed Checks)

### STEP 1: Service Status Check ✅

Kiểm tra xem service có đang chạy không và lấy thông tin cơ bản.

```bash
# Manual check
gcloud run services describe lmsmath \
  --region=asia-southeast1 \
  --project=gen-lang-client-0712182643 \
  --format="table(
    metadata.name,
    status.url,
    status.latestReadyRevisionName,
    status.conditions[0].status
  )"
```

**Expected Output:**
```
NAME     URL                                                          LATEST_REVISION  STATUS
lmsmath  https://lmsmath-442514522574.asia-southeast1.run.app        lmsmath-00042    True
```

---

### STEP 2: Environment Variables Verification ✅

Kiểm tra các environment variables đã được set đúng chưa.

```bash
# List environment variables
gcloud run services describe lmsmath \
  --region=asia-southeast1 \
  --format="value(spec.template.spec.containers[0].env)"
```

**Required Variables:**
- `NODE_ENV=production`
- `GOOGLE_CLOUD_PROJECT_ID=gen-lang-client-0712182643`
- `NEXT_PUBLIC_GCS_BUCKET_NAME=gen-lang-client-0712182643-lmsmath-storage`
- `NEXTAUTH_URL=https://lmsmath-442514522574.asia-southeast1.run.app`

---

### STEP 3: Secrets Verification ✅

Kiểm tra các secrets đã được mount vào Cloud Run chưa.

```bash
# Check DATABASE_URL secret
gcloud secrets describe DATABASE_URL \
  --project=gen-lang-client-0712182643

# Check if secret is mounted
gcloud run services describe lmsmath \
  --region=asia-southeast1 \
  --format="value(spec.template.spec.containers[0].env)" | grep DATABASE_URL
```

**Required Secrets:**
1. **DATABASE_URL** (Critical for Prisma) ⚠️
2. **NEXTAUTH_SECRET** (Critical for auth)
3. GOOGLE_CLIENT_ID (Optional)
4. GOOGLE_CLIENT_SECRET (Optional)
5. MUX_TOKEN_ID (Optional)
6. MUX_TOKEN_SECRET (Optional)
7. UPLOADTHING_SECRET (Optional)
8. STRIPE_API_KEY (Optional)
9. GCS_BUCKET_NAME (Optional)

**DATABASE_URL Format:**
```bash
# PostgreSQL (Recommended)
postgresql://user:password@host:5432/database?sslmode=require

# PostgreSQL with Cloud SQL
postgresql://user:password@localhost/database?host=/cloudsql/project:region:instance

# With connection pooling (Recommended)
postgresql://user:password@host:5432/database?sslmode=require&connection_limit=10&pool_timeout=20
```

---

### STEP 4: Resource Configuration Check ✅

Kiểm tra cấu hình tài nguyên (CPU, Memory, Scaling).

```bash
# Check resources
gcloud run services describe lmsmath \
  --region=asia-southeast1 \
  --format="yaml(spec.template.spec.containers[0].resources)"
```

**Current Configuration (from cloudbuild.yaml):**
- **Memory:** 2Gi
- **CPU:** 2 cores
- **Min Instances:** 1
- **Max Instances:** 10
- **Concurrency:** 100 requests/instance
- **Timeout:** 300 seconds

**Scaling Logic:**
```
If requests > (instances * concurrency):
  Scale up (add new instance)
  
If requests < (instances * concurrency * 0.6):
  Scale down (after ~60s idle)
```

---

### STEP 5: HTTP Endpoints Testing ✅

Test các endpoints chính của application.

```bash
SERVICE_URL="https://lmsmath-442514522574.asia-southeast1.run.app"

# 1. Homepage
curl -I $SERVICE_URL/
# Expected: HTTP/2 200

# 2. Sign-in page
curl -I $SERVICE_URL/sign-in
# Expected: HTTP/2 200

# 3. Auth session API
curl -s $SERVICE_URL/api/auth/session | jq
# Expected: {"user":null} or user object

# 4. Auth providers
curl -s $SERVICE_URL/api/auth/providers | jq
# Expected: {"credentials":{...}}

# 5. CSRF token
curl -s $SERVICE_URL/api/auth/csrf | jq
# Expected: {"csrfToken":"..."}
```

---

### STEP 6: Database Connectivity Testing ✅

Test kết nối đến database thông qua application.

```bash
# Test API that requires database
curl -s $SERVICE_URL/api/auth/session

# If successful, database is accessible
# If fails, check:
# 1. DATABASE_URL format
# 2. Database is running
# 3. Network connectivity
# 4. Firewall rules
```

**Common Database Issues:**

| Issue | Symptom | Solution |
|-------|---------|----------|
| Wrong connection string | Connection timeout | Verify DATABASE_URL format |
| Database not running | Connection refused | Start Cloud SQL instance |
| Firewall blocking | Connection timeout | Allow Cloud Run IPs |
| SSL required | SSL error | Add `?sslmode=require` |
| Connection limit | Too many connections | Add connection pooling |

---

### STEP 7: Logs Inspection ✅

Kiểm tra logs để tìm errors.

```bash
# View recent logs (last 50 entries)
gcloud run services logs read lmsmath \
  --region=asia-southeast1 \
  --limit=50

# Stream logs in real-time
gcloud run services logs tail lmsmath \
  --region=asia-southeast1

# Filter errors only
gcloud run services logs read lmsmath \
  --region=asia-southeast1 \
  --limit=100 | grep -i error

# Search for database errors
gcloud run services logs read lmsmath \
  --region=asia-southeast1 \
  --limit=100 | grep -i "database\|prisma\|connection"
```

**Log Severity Levels:**
- `DEBUG` - Detailed debugging info
- `INFO` - General information
- `WARNING` - Warning messages (non-critical)
- `ERROR` - Error messages (critical)
- `CRITICAL` - Critical errors (service down)

---

## 🚀 Load Testing & Auto-Scaling

### Auto-Scaling Configuration

**Current Settings:**
```yaml
min-instances: 1
max-instances: 10
concurrency: 100
cpu-throttling: enabled
memory: 2Gi
cpu: 2
```

### Expected Scaling Behavior

| Load Level | Concurrent Requests | Expected Instances | Response Time |
|------------|---------------------|-------------------|---------------|
| Idle | 0 | 1 (min) | N/A |
| Light | 10-50 | 1 | <200ms |
| Medium | 50-100 | 2-3 | <300ms |
| Heavy | 100-500 | 5-8 | <500ms |
| Peak | 500-1000 | 8-10 (max) | <1000ms |

### Load Test Execution

```bash
# Run all load tests
./test-cloud-run-scaling.sh

# Or run individual tests with Apache Bench

# Light load (10 concurrent, 100 requests)
ab -n 100 -c 10 https://lmsmath-442514522574.asia-southeast1.run.app/

# Heavy load (100 concurrent, 1000 requests)
ab -n 1000 -c 100 https://lmsmath-442514522574.asia-southeast1.run.app/

# Sustained load (50 concurrent, 2 minutes)
ab -t 120 -c 50 https://lmsmath-442514522574.asia-southeast1.run.app/

# Spike test (200 concurrent, 2000 requests)
ab -n 2000 -c 200 https://lmsmath-442514522574.asia-southeast1.run.app/
```

### Monitoring Scaling

```bash
# Method 1: Watch logs for scaling events
gcloud run services logs tail lmsmath --region=asia-southeast1 | grep -i "scale"

# Method 2: Cloud Console metrics
open "https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath/metrics?project=gen-lang-client-0712182643"

# Method 3: Check revision traffic
watch -n 5 'gcloud run services describe lmsmath --region=asia-southeast1 --format="value(status.traffic)"'
```

### Key Metrics to Monitor

1. **Request Count** - Total requests per second
2. **Request Latency** - p50, p95, p99 percentiles
3. **Error Rate** - 4xx and 5xx errors
4. **Instance Count** - Number of running containers
5. **Memory Utilization** - Percentage of allocated memory used
6. **CPU Utilization** - Percentage of allocated CPU used
7. **Cold Start Time** - Time to start new instances

---

## 📊 Performance Benchmarks

### Target Performance

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Homepage Load | <1s | <2s | >2s |
| API Response | <200ms | <500ms | >500ms |
| Database Query | <50ms | <200ms | >200ms |
| Cold Start | <2s | <5s | >5s |
| P95 Latency | <1s | <2s | >2s |
| Error Rate | <0.1% | <1% | >1% |
| Uptime | >99.9% | >99% | <99% |

### Load Test Results Template

After running `test-cloud-run-scaling.sh`, record results:

```
Test Date: _______________
Region: asia-southeast1
Service: lmsmath

Baseline Performance:
  • Single request response time: _____ ms
  • Homepage size: _____ KB

Light Load (10 concurrent, 100 requests):
  • Throughput: _____ req/sec
  • Avg response time: _____ ms
  • Failed requests: _____
  • Instances scaled: _____

Medium Load (50 concurrent, 500 requests):
  • Throughput: _____ req/sec
  • Avg response time: _____ ms
  • Failed requests: _____
  • Instances scaled: _____

Heavy Load (100 concurrent, 1000 requests):
  • Throughput: _____ req/sec
  • Avg response time: _____ ms
  • Failed requests: _____
  • Instances scaled: _____

Spike Test (200 concurrent, 2000 requests):
  • Throughput: _____ req/sec
  • Avg response time: _____ ms
  • Failed requests: _____
  • Max instances reached: _____
  • Time to scale up: _____ seconds

Scale Down Test:
  • Time to scale down to min: _____ seconds
  • Min instances maintained: _____
```

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. Service Not Responding (502/503 errors)

**Symptoms:**
```
HTTP/2 502 Bad Gateway
HTTP/2 503 Service Unavailable
```

**Causes & Solutions:**

| Cause | Check | Fix |
|-------|-------|-----|
| App crash on startup | `gcloud run services logs read lmsmath --region=asia-southeast1` | Fix startup errors |
| Port mismatch | Check if app listens on `$PORT` | Update server.js to use PORT env |
| Memory exceeded | Check memory usage in metrics | Increase memory limit |
| Timeout | Check timeout setting | Increase timeout (max 3600s) |
| Database connection failed | Check DATABASE_URL | Verify connection string |

```bash
# Fix: Increase memory and timeout
gcloud run services update lmsmath \
  --region=asia-southeast1 \
  --memory=4Gi \
  --timeout=600
```

---

#### 2. DATABASE_URL Not Working

**Symptoms:**
```
Prisma Error: Connection timeout
Error: Can't reach database server
```

**Solutions:**

```bash
# 1. Verify secret exists and has correct value
gcloud secrets versions access latest --secret=DATABASE_URL

# 2. Verify secret is mounted
gcloud run services describe lmsmath --region=asia-southeast1 \
  --format="value(spec.template.spec.containers[0].env)" | grep DATABASE_URL

# 3. Update secret with correct value
echo -n "postgresql://user:pass@host:5432/db?sslmode=require" | \
  gcloud secrets versions add DATABASE_URL --data-file=-

# 4. Trigger new deployment to pick up secret
gcloud run services update lmsmath --region=asia-southeast1
```

**Correct DATABASE_URL Formats:**

```bash
# PostgreSQL (standard)
postgresql://username:password@hostname:5432/database?sslmode=require

# PostgreSQL (Cloud SQL)
postgresql://username:password@localhost/database?host=/cloudsql/project-id:region:instance-name

# PostgreSQL (with connection pooling)
postgresql://username:password@hostname:5432/database?sslmode=require&connection_limit=10&pool_timeout=20

# Prisma Data Platform
prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
```

---

#### 3. Slow Performance / High Latency

**Symptoms:**
- Response times >2s
- Slow page loads
- Timeouts under load

**Diagnostic Steps:**

```bash
# 1. Check current resource usage
gcloud run services describe lmsmath --region=asia-southeast1 \
  --format="yaml(spec.template.spec.containers[0].resources)"

# 2. Check recent performance metrics
open "https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath/metrics"

# 3. Check for cold starts
gcloud run services logs read lmsmath --region=asia-southeast1 | grep -i "cold start"

# 4. Profile response times
curl -w "@curl-format.txt" -o /dev/null -s https://lmsmath-442514522574.asia-southeast1.run.app/
```

**Solutions:**

```bash
# Increase CPU and memory
gcloud run services update lmsmath \
  --region=asia-southeast1 \
  --cpu=4 \
  --memory=4Gi

# Set min instances to reduce cold starts
gcloud run services update lmsmath \
  --region=asia-southeast1 \
  --min-instances=2

# Increase concurrency for better resource utilization
gcloud run services update lmsmath \
  --region=asia-southeast1 \
  --concurrency=200
```

---

#### 4. Auto-Scaling Not Working

**Symptoms:**
- Instances not scaling up under load
- Requests queuing or timing out
- Always at min or max instances

**Diagnostic Steps:**

```bash
# 1. Check current scaling configuration
gcloud run services describe lmsmath --region=asia-southeast1 \
  --format="table(
    spec.template.metadata.annotations.'autoscaling.knative.dev/minScale',
    spec.template.metadata.annotations.'autoscaling.knative.dev/maxScale',
    spec.template.spec.containerConcurrency
  )"

# 2. Monitor instance count during load test
# Terminal 1: Run load test
ab -n 1000 -c 100 https://lmsmath-442514522574.asia-southeast1.run.app/

# Terminal 2: Watch logs for scaling events
gcloud run services logs tail lmsmath --region=asia-southeast1
```

**Solutions:**

```bash
# Adjust scaling parameters
gcloud run services update lmsmath \
  --region=asia-southeast1 \
  --min-instances=1 \
  --max-instances=20 \
  --concurrency=80

# Enable CPU-based autoscaling (default)
gcloud run services update lmsmath \
  --region=asia-southeast1 \
  --cpu-throttling
```

---

#### 5. High Error Rate (4xx/5xx)

**Symptoms:**
- Many 500 Internal Server Errors
- 404 Not Found for valid pages
- 401 Unauthorized errors

**Diagnostic Steps:**

```bash
# 1. Check error logs
gcloud run services logs read lmsmath --region=asia-southeast1 \
  --limit=100 | grep -i "error\|exception\|failed"

# 2. Test specific endpoints
curl -v https://lmsmath-442514522574.asia-southeast1.run.app/api/auth/session

# 3. Check for missing environment variables
gcloud run services describe lmsmath --region=asia-southeast1 \
  --format="value(spec.template.spec.containers[0].env)"
```

**Common Causes:**

| Error | Cause | Solution |
|-------|-------|----------|
| 500 | App crash | Check logs, fix code errors |
| 404 | Route not found | Check Next.js routing |
| 401 | Auth failed | Check NEXTAUTH_SECRET |
| 403 | Permission denied | Check IAM roles |
| 503 | Resource exhausted | Increase limits |

---

## 📈 Monitoring & Alerts

### Cloud Console Monitoring

**Main Dashboard:**
```
https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath/metrics?project=gen-lang-client-0712182643
```

**Key Metrics Views:**
1. **Request Count** - Total requests over time
2. **Request Latency** - Response time distribution
3. **Error Rate** - 4xx and 5xx errors percentage
4. **Container Instance Count** - Number of running instances
5. **Memory Utilization** - Memory usage per instance
6. **CPU Utilization** - CPU usage per instance
7. **Billable Instance Time** - Cost tracking

### CLI Monitoring

```bash
# Watch service status
watch -n 10 'gcloud run services describe lmsmath --region=asia-southeast1 --format="value(status.conditions)"'

# Monitor logs continuously
gcloud run services logs tail lmsmath --region=asia-southeast1

# Get metrics summary
gcloud monitoring time-series list \
  --filter='resource.type="cloud_run_revision" AND resource.labels.service_name="lmsmath"' \
  --format=json
```

### Setting Up Alerts

```bash
# Create notification channel (email)
gcloud alpha monitoring channels create \
  --display-name="LMS Math Alerts" \
  --type=email \
  --channel-labels=email_address=your-email@example.com

# Get channel ID
CHANNEL_ID=$(gcloud alpha monitoring channels list --format="value(name)" --filter="displayName='LMS Math Alerts'")

# Create alert for high error rate (>5%)
gcloud alpha monitoring policies create \
  --notification-channels=$CHANNEL_ID \
  --display-name="LMS Math - High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s \
  --combiner=OR

# Create alert for high latency (>2s)
gcloud alpha monitoring policies create \
  --notification-channels=$CHANNEL_ID \
  --display-name="LMS Math - High Latency" \
  --condition-display-name="P95 latency > 2s" \
  --condition-threshold-value=2000 \
  --condition-threshold-duration=300s \
  --combiner=OR
```

---

## 🔐 Security Checks

### Environment Variables Security

```bash
# Verify secrets are not exposed in env vars
gcloud run services describe lmsmath --region=asia-southeast1 \
  --format="value(spec.template.spec.containers[0].env)" | grep -i "secret\|password\|key"

# All sensitive data should be in Secret Manager, not env vars
```

**Best Practices:**
- ✅ Use Secret Manager for sensitive data
- ✅ Never log secrets in application code
- ✅ Use `--set-secrets` not `--set-env-vars` for passwords/keys
- ✅ Rotate secrets regularly
- ✅ Limit secret access to service account only

### IAM Permissions Check

```bash
# Check service account
gcloud run services describe lmsmath --region=asia-southeast1 \
  --format="value(spec.template.spec.serviceAccountName)"

# List IAM policy
gcloud run services get-iam-policy lmsmath --region=asia-southeast1

# Recommended: Create dedicated service account
gcloud iam service-accounts create lmsmath-sa \
  --display-name="LMS Math Cloud Run Service Account"

# Grant minimum required permissions
gcloud projects add-iam-policy-binding gen-lang-client-0712182643 \
  --member="serviceAccount:lmsmath-sa@gen-lang-client-0712182643.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud secrets add-iam-policy-binding DATABASE_URL \
  --member="serviceAccount:lmsmath-sa@gen-lang-client-0712182643.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 💰 Cost Optimization

### Current Cost Estimate

**Configuration:**
- Memory: 2Gi
- CPU: 2 cores
- Min instances: 1
- Max instances: 10
- Region: asia-southeast1

**Estimated Monthly Cost:**

| Traffic Level | Requests/Month | Estimated Cost |
|---------------|----------------|----------------|
| Low | 100K | $10-15 |
| Medium | 1M | $25-35 |
| High | 10M | $100-150 |
| Very High | 50M | $400-600 |

### Cost Optimization Tips

```bash
# 1. Reduce min instances if cold starts acceptable
gcloud run services update lmsmath \
  --region=asia-southeast1 \
  --min-instances=0  # Scale to zero when idle

# 2. Enable CPU throttling (already enabled)
gcloud run services update lmsmath \
  --region=asia-southeast1 \
  --cpu-throttling  # Reduce CPU when idle

# 3. Optimize image size
# - Use Alpine Linux base image
# - Multi-stage build
# - Remove dev dependencies

# 4. Use startup CPU boost
gcloud run services update lmsmath \
  --region=asia-southeast1 \
  --cpu-boost  # Faster cold starts, higher cost

# 5. Implement caching
# - Redis/Memcached for session data
# - CloudCDN for static assets
# - Prisma query caching
```

### Monitor Costs

```bash
# View billing reports
open "https://console.cloud.google.com/billing/reports?project=gen-lang-client-0712182643"

# Get current month cost (requires billing export)
gcloud billing accounts list
```

---

## 📝 Checklist

### Pre-Deployment ✅

- [ ] All environment variables configured
- [ ] DATABASE_URL secret created and mounted
- [ ] NEXTAUTH_SECRET secret created and mounted
- [ ] Prisma schema uses PostgreSQL
- [ ] Dockerfile builds successfully
- [ ] next.config.js has `output: 'standalone'`
- [ ] Database migrations applied
- [ ] Local testing passed

### Post-Deployment ✅

- [ ] Service deployed successfully
- [ ] Homepage loads (HTTP 200)
- [ ] Sign-in page accessible
- [ ] Auth APIs responding
- [ ] Database connection working
- [ ] No errors in logs
- [ ] Environment variables verified
- [ ] Secrets properly mounted
- [ ] Resource limits appropriate

### Performance Testing ✅

- [ ] Baseline performance measured
- [ ] Light load test passed
- [ ] Medium load test passed
- [ ] Heavy load test passed
- [ ] Spike test passed
- [ ] Auto-scaling verified
- [ ] Scale-down verified
- [ ] Response times acceptable
- [ ] No failed requests

### Monitoring Setup ✅

- [ ] Cloud Console dashboard accessible
- [ ] Logs streaming working
- [ ] Error alerts configured
- [ ] Latency alerts configured
- [ ] Cost alerts configured
- [ ] Uptime monitoring enabled

---

## 🎯 Next Steps

### Immediate Actions

1. **Run verification scripts:**
   ```bash
   ./verify-cloud-run-deployment.sh
   ./check-database-connectivity.sh
   ./test-cloud-run-scaling.sh
   ```

2. **Review results and fix any issues**

3. **Set up monitoring alerts**

4. **Document performance baseline**

### Ongoing Maintenance

- **Daily:** Check error logs
- **Weekly:** Review performance metrics
- **Monthly:** Review and optimize costs
- **Quarterly:** Security audit and secret rotation

### Performance Optimization

1. **Database Optimization:**
   - Add database indexes
   - Implement query caching
   - Use connection pooling
   - Consider read replicas

2. **Application Optimization:**
   - Implement Redis caching
   - Enable CDN for static assets
   - Optimize bundle size
   - Use lazy loading

3. **Infrastructure Optimization:**
   - Fine-tune auto-scaling
   - Optimize container size
   - Use startup CPU boost
   - Consider regional deployment

---

## 📞 Support & Resources

### Documentation

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Prisma on Cloud Run](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-cloud-run)
- [Next.js on Cloud Run](https://github.com/vercel/next.js/tree/canary/examples/with-docker)

### Debugging Commands

```bash
# Get full service configuration
gcloud run services describe lmsmath \
  --region=asia-southeast1 \
  --format=yaml > cloud-run-config.yaml

# Get all environment variables and secrets
gcloud run services describe lmsmath \
  --region=asia-southeast1 \
  --format="yaml(spec.template.spec.containers[0])"

# Export logs for analysis
gcloud run services logs read lmsmath \
  --region=asia-southeast1 \
  --limit=1000 \
  --format=json > logs.json

# Get cost report
gcloud alpha billing accounts list
```

---

## ✅ Success Criteria

Your deployment is successful if:

- ✅ All verification scripts pass without errors
- ✅ Homepage loads in <2 seconds
- ✅ API endpoints return HTTP 200
- ✅ Database connectivity confirmed
- ✅ Auto-scaling works under load
- ✅ No errors in logs
- ✅ Response times meet targets
- ✅ Zero failed requests during load tests

---

**Last Updated:** October 9, 2025  
**Version:** 1.0  
**Author:** Cloud Run Deployment Team

