# Cloud Run Deployment Checklist ✅

**Project:** LMS Math  
**Date:** October 9, 2025  
**Service:** lmsmath  
**Region:** asia-southeast1

---

## Pre-Deployment Checklist

### 1. Environment Setup ⚙️

- [ ] Google Cloud CLI installed (`gcloud --version`)
- [ ] Authenticated to GCP (`gcloud auth login`)
- [ ] Project set (`gcloud config set project gen-lang-client-0712182643`)
- [ ] Docker installed (for local testing)
- [ ] Apache Bench installed (for load testing)

### 2. Code Preparation 📝

- [ ] Next.js config has `output: 'standalone'`
- [ ] Prisma schema uses PostgreSQL (not SQLite)
- [ ] Dockerfile exists and builds successfully
- [ ] .dockerignore configured properly
- [ ] All dependencies in package.json
- [ ] No hardcoded secrets in code

### 3. Database Configuration 🗄️

- [ ] Cloud SQL PostgreSQL instance created
- [ ] Database user and password configured
- [ ] Database created
- [ ] Connection string tested
- [ ] Prisma migrations applied
- [ ] Connection pooling configured
- [ ] SSL mode enabled (`sslmode=require`)

### 4. Secrets Configuration 🔐

- [ ] DATABASE_URL secret created
  ```bash
  echo -n "postgresql://..." | gcloud secrets create DATABASE_URL --data-file=-
  ```
- [ ] NEXTAUTH_SECRET secret created (min 32 characters)
  ```bash
  openssl rand -base64 32 | gcloud secrets create NEXTAUTH_SECRET --data-file=-
  ```
- [ ] GOOGLE_CLIENT_ID secret created (if using Google OAuth)
- [ ] GOOGLE_CLIENT_SECRET secret created (if using Google OAuth)
- [ ] All secrets have proper IAM permissions

### 5. Environment Variables 🌐

- [ ] NODE_ENV=production
- [ ] NEXTAUTH_URL set to Cloud Run URL
- [ ] GOOGLE_CLOUD_PROJECT_ID set
- [ ] NEXT_PUBLIC_GCS_BUCKET_NAME set (if using GCS)

### 6. Build Configuration 🔨

- [ ] cloudbuild.yaml configured correctly
- [ ] Memory allocation appropriate (2Gi minimum)
- [ ] CPU allocation appropriate (2 cores recommended)
- [ ] Port set to 3000
- [ ] Timeout configured (300s recommended)

### 7. Scaling Configuration 📈

- [ ] Min instances set (1 for production, 0 for dev)
- [ ] Max instances set (10-20 recommended)
- [ ] Concurrency set (80-100 recommended)
- [ ] CPU throttling enabled

---

## Deployment Steps

### Step 1: Build Docker Image 🐳

```bash
# Test build locally
docker build -f Dockerfile -t lmsmath:test .

# Test run locally
docker run -p 3000:3000 -e DATABASE_URL="..." lmsmath:test

# Verify app starts and responds
curl http://localhost:3000
```

- [ ] Local Docker build successful
- [ ] Local Docker run successful
- [ ] App responds on http://localhost:3000

### Step 2: Deploy to Cloud Run 🚀

```bash
# Option A: Using deploy script
./deploy-to-cloud-run.sh

# Option B: Using Cloud Build
gcloud builds submit --config cloudbuild.yaml

# Option C: Manual deployment
gcloud run deploy lmsmath \
  --region=asia-southeast1 \
  --source=. \
  --allow-unauthenticated
```

- [ ] Build completed successfully
- [ ] Image pushed to Container Registry
- [ ] Service deployed to Cloud Run
- [ ] Service URL received

### Step 3: Configure Service 🔧

```bash
# Set scaling
gcloud run services update lmsmath \
  --region=asia-southeast1 \
  --min-instances=1 \
  --max-instances=10 \
  --concurrency=100

# Set resources
gcloud run services update lmsmath \
  --region=asia-southeast1 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300

# Mount secrets
gcloud run services update lmsmath \
  --region=asia-southeast1 \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest"
```

- [ ] Scaling configured
- [ ] Resources configured
- [ ] Secrets mounted
- [ ] Environment variables set

---

## Post-Deployment Verification

### Step 1: Run Verification Script ✅

```bash
./verify-cloud-run-deployment.sh
```

**Expected Results:**
- ✅ Service status: Running
- ✅ All environment variables set
- ✅ All secrets mounted
- ✅ Resource limits configured
- ✅ HTTP endpoints responding (200 OK)
- ✅ No errors in logs

**Checklist:**
- [ ] Service is running
- [ ] URL is accessible
- [ ] Environment variables verified
- [ ] Secrets verified
- [ ] No errors in logs

### Step 2: Test Database Connectivity 🗄️

```bash
./check-database-connectivity.sh
```

**Expected Results:**
- ✅ DATABASE_URL secret exists
- ✅ DATABASE_URL mounted to service
- ✅ Database connection successful
- ✅ No Prisma errors
- ✅ PostgreSQL provider configured
- ✅ SSL mode enabled

**Checklist:**
- [ ] DATABASE_URL exists
- [ ] DATABASE_URL mounted
- [ ] Auth API responds (requires DB)
- [ ] No database errors in logs
- [ ] Prisma Client working

### Step 3: Test HTTP Endpoints 🌐

```bash
SERVICE_URL="https://lmsmath-442514522574.asia-southeast1.run.app"

# Test all critical endpoints
curl -I $SERVICE_URL/                    # Homepage
curl -I $SERVICE_URL/sign-in            # Sign-in page
curl -I $SERVICE_URL/api/auth/session   # Auth session
curl -I $SERVICE_URL/api/auth/providers # Auth providers
curl -I $SERVICE_URL/api/auth/csrf      # CSRF token
```

**Checklist:**
- [ ] Homepage (/) - HTTP 200
- [ ] Sign-in (/sign-in) - HTTP 200
- [ ] Auth session API - HTTP 200
- [ ] Auth providers API - HTTP 200
- [ ] CSRF token API - HTTP 200

### Step 4: Test Authentication Flow 🔐

**Manual Testing:**
1. Visit service URL in browser
2. Navigate to sign-in page
3. Try to register new account
4. Try to login with test account
5. Verify session persistence
6. Test logout functionality

**Checklist:**
- [ ] Sign-in page loads
- [ ] Registration form works
- [ ] Login works with credentials
- [ ] Session persists after refresh
- [ ] Protected routes redirect to sign-in
- [ ] Logout works correctly

### Step 5: Test Auto-Scaling 📊

```bash
./test-cloud-run-scaling.sh
```

**Expected Results:**
- ✅ Baseline response time: <1s
- ✅ Light load (10 concurrent): No failures
- ✅ Medium load (50 concurrent): 2-3 instances
- ✅ Heavy load (100 concurrent): 5-8 instances
- ✅ Spike load (200 concurrent): 8-10 instances
- ✅ Scale down after idle: Back to min instances

**Checklist:**
- [ ] Baseline performance measured
- [ ] Light load test passed (0 failures)
- [ ] Medium load test passed (0 failures)
- [ ] Heavy load test passed (0 failures)
- [ ] Spike test passed (<5% failures acceptable)
- [ ] Instances scale up under load
- [ ] Instances scale down when idle

### Step 6: Monitor Logs 📝

```bash
# View recent logs
gcloud run services logs read lmsmath --region=asia-southeast1 --limit=50

# Stream logs
gcloud run services logs tail lmsmath --region=asia-southeast1

# Check for errors
gcloud run services logs read lmsmath --region=asia-southeast1 | grep -i error
```

**Checklist:**
- [ ] No ERROR level logs
- [ ] No Prisma connection errors
- [ ] No authentication errors
- [ ] Request logs showing successful responses
- [ ] No memory/timeout errors

---

## Performance Benchmarks

### Baseline Metrics (Single Request)

- [ ] Homepage load time: _____ ms (Target: <1000ms)
- [ ] API response time: _____ ms (Target: <200ms)
- [ ] Database query time: _____ ms (Target: <50ms)

### Load Test Results

#### Light Load (10 concurrent, 100 requests)
- [ ] Throughput: _____ req/sec (Target: >50)
- [ ] Avg response time: _____ ms (Target: <500ms)
- [ ] Failed requests: _____ (Target: 0)

#### Medium Load (50 concurrent, 500 requests)
- [ ] Throughput: _____ req/sec (Target: >100)
- [ ] Avg response time: _____ ms (Target: <800ms)
- [ ] Failed requests: _____ (Target: 0)

#### Heavy Load (100 concurrent, 1000 requests)
- [ ] Throughput: _____ req/sec (Target: >200)
- [ ] Avg response time: _____ ms (Target: <1000ms)
- [ ] Failed requests: _____ (Target: <1%)

#### Spike Test (200 concurrent, 2000 requests)
- [ ] Throughput: _____ req/sec (Target: >150)
- [ ] Avg response time: _____ ms (Target: <2000ms)
- [ ] Failed requests: _____ (Target: <5%)
- [ ] Max instances reached: _____ (Expected: 8-10)

### Scaling Behavior

- [ ] Time to scale up (0→10 instances): _____ seconds (Target: <30s)
- [ ] Time to scale down (10→1 instances): _____ seconds (Target: <90s)
- [ ] Cold start time: _____ ms (Target: <2000ms)

---

## Monitoring Setup

### Cloud Console

- [ ] Access Cloud Run dashboard
  ```
  https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath
  ```
- [ ] View metrics dashboard
- [ ] Configure log filters
- [ ] Set up log exports (optional)

### Alerts Configuration

- [ ] High error rate alert (>5% errors)
- [ ] High latency alert (>2s p95)
- [ ] Instance count alert (at max instances)
- [ ] Memory usage alert (>80%)
- [ ] CPU usage alert (>80%)
- [ ] Cost alert (monthly threshold)

### Uptime Monitoring

- [ ] Create uptime check for homepage
- [ ] Create uptime check for API endpoint
- [ ] Configure notification channels (email/Slack)
- [ ] Test alert notifications

---

## Security Checklist

### Secrets & Credentials

- [ ] All secrets in Secret Manager (not env vars)
- [ ] No secrets in code or logs
- [ ] Secrets have minimal IAM permissions
- [ ] Service account has minimal permissions
- [ ] Secret rotation schedule documented

### Network Security

- [ ] HTTPS enforced (automatic in Cloud Run)
- [ ] CORS configured properly
- [ ] CSP headers configured
- [ ] Rate limiting configured (optional)

### Application Security

- [ ] Authentication working correctly
- [ ] Session management secure
- [ ] Protected routes enforced
- [ ] Input validation implemented
- [ ] SQL injection prevention (Prisma handles this)

### Database Security

- [ ] SSL/TLS enabled (`sslmode=require`)
- [ ] Strong database password
- [ ] Database not publicly accessible
- [ ] Connection pooling configured
- [ ] Backup strategy in place

---

## Cost Optimization

### Initial Configuration

- [ ] Appropriate memory allocated (not over-provisioned)
- [ ] Appropriate CPU allocated (not over-provisioned)
- [ ] Min instances = 1 for production (or 0 for dev)
- [ ] Max instances = 10-20 (adjust based on traffic)
- [ ] CPU throttling enabled

### Ongoing Optimization

- [ ] Review billing reports monthly
- [ ] Optimize cold start time
- [ ] Implement caching where possible
- [ ] Monitor unused resources
- [ ] Adjust scaling based on traffic patterns

### Cost Monitoring

- [ ] Set up billing alerts
- [ ] Review cost breakdown
- [ ] Estimated monthly cost: $_____ (Document here)

---

## Documentation

### Required Documentation

- [ ] Deployment process documented
- [ ] Environment variables documented
- [ ] Secrets management documented
- [ ] Rollback procedure documented
- [ ] Monitoring setup documented
- [ ] Troubleshooting guide created

### Team Knowledge Transfer

- [ ] Team trained on Cloud Run basics
- [ ] Access permissions granted
- [ ] Emergency contacts documented
- [ ] On-call rotation defined (if applicable)

---

## Final Sign-Off

### Deployment Team

- [ ] **Developer:** Code reviewed and tested
- [ ] **DevOps:** Infrastructure configured correctly
- [ ] **QA:** All tests passed
- [ ] **Security:** Security checklist completed
- [ ] **Product:** Functionality verified

### Approvals

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | _______ | _______ | _______ |
| DevOps Lead | _______ | _______ | _______ |
| QA Lead | _______ | _______ | _______ |
| Product Owner | _______ | _______ | _______ |

---

## Rollback Plan

### If Deployment Fails

1. **Check logs immediately:**
   ```bash
   gcloud run services logs read lmsmath --region=asia-southeast1 --limit=100
   ```

2. **Rollback to previous revision:**
   ```bash
   PREVIOUS_REVISION=$(gcloud run revisions list --service=lmsmath --region=asia-southeast1 --format="value(name)" --limit=2 | tail -1)
   gcloud run services update-traffic lmsmath --region=asia-southeast1 --to-revisions=$PREVIOUS_REVISION=100
   ```

3. **Verify rollback:**
   ```bash
   curl -I https://lmsmath-442514522574.asia-southeast1.run.app/
   ```

4. **Document issues and fix before redeploying**

---

## Success Criteria

✅ **Deployment is successful if ALL of the following are true:**

1. Service is running and accessible
2. All HTTP endpoints return 200 OK
3. Database connectivity confirmed
4. Authentication flow working
5. No errors in logs
6. Load tests show expected scaling behavior
7. Response times meet targets
8. Zero critical errors in monitoring
9. All security checks passed
10. Team trained and documentation complete

---

## Next Steps After Successful Deployment

1. [ ] Monitor logs for 24 hours
2. [ ] Review performance metrics daily for first week
3. [ ] Set up automated testing (optional)
4. [ ] Plan for CDN integration (optional)
5. [ ] Plan for database optimization (indexes, caching)
6. [ ] Schedule first maintenance window
7. [ ] Document lessons learned

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Verified By:** _______________  
**Status:** ⬜ In Progress | ⬜ Completed | ⬜ Failed

---

**Last Updated:** October 9, 2025  
**Version:** 1.0

