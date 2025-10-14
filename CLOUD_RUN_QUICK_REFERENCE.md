# Cloud Run Quick Reference Card 🚀

## Service Information
```
Service Name: lmsmath
Region: asia-southeast1
Project ID: gen-lang-client-0712182643
Service URL: https://lmsmath-442514522574.asia-southeast1.run.app
```

## 🎯 Quick Commands

### 1. Verification Scripts
```bash
# Run all verification checks
./verify-cloud-run-deployment.sh

# Check database connectivity specifically
./check-database-connectivity.sh

# Test auto-scaling with load
./test-cloud-run-scaling.sh
```

### 2. Service Management
```bash
# Check service status
gcloud run services describe lmsmath --region=asia-southeast1

# View service URL
gcloud run services describe lmsmath --region=asia-southeast1 --format="value(status.url)"

# List all revisions
gcloud run revisions list --service=lmsmath --region=asia-southeast1

# Update service
gcloud run services update lmsmath --region=asia-southeast1 [OPTIONS]
```

### 3. Environment Variables
```bash
# List environment variables
gcloud run services describe lmsmath --region=asia-southeast1 \
  --format="value(spec.template.spec.containers[0].env)"

# Update environment variable
gcloud run services update lmsmath --region=asia-southeast1 \
  --set-env-vars="KEY=VALUE"

# Remove environment variable
gcloud run services update lmsmath --region=asia-southeast1 \
  --remove-env-vars="KEY"
```

### 4. Secrets Management
```bash
# List all secrets
gcloud secrets list --project=gen-lang-client-0712182643

# View secret value (if you have permission)
gcloud secrets versions access latest --secret=DATABASE_URL

# Create/update secret
echo -n "secret-value" | gcloud secrets create SECRET_NAME --data-file=-
echo -n "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Mount secret to service
gcloud run services update lmsmath --region=asia-southeast1 \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest"
```

### 5. Logs & Monitoring
```bash
# View recent logs
gcloud run services logs read lmsmath --region=asia-southeast1 --limit=50

# Stream logs in real-time
gcloud run services logs tail lmsmath --region=asia-southeast1

# Filter errors only
gcloud run services logs read lmsmath --region=asia-southeast1 | grep -i error

# View metrics dashboard
open "https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath/metrics"
```

### 6. Testing Endpoints
```bash
SERVICE_URL="https://lmsmath-442514522574.asia-southeast1.run.app"

# Test homepage
curl -I $SERVICE_URL/

# Test sign-in page
curl -I $SERVICE_URL/sign-in

# Test auth session API
curl -s $SERVICE_URL/api/auth/session | jq

# Test auth providers
curl -s $SERVICE_URL/api/auth/providers | jq

# Measure response time
curl -w "Time: %{time_total}s\n" -o /dev/null -s $SERVICE_URL/
```

### 7. Load Testing
```bash
# Install Apache Bench (if needed)
brew install httpd  # macOS
# sudo apt-get install apache2-utils  # Linux

# Light load (10 concurrent, 100 requests)
ab -n 100 -c 10 $SERVICE_URL/

# Heavy load (100 concurrent, 1000 requests)
ab -n 1000 -c 100 $SERVICE_URL/

# Sustained load (50 concurrent, 2 minutes)
ab -t 120 -c 50 $SERVICE_URL/

# Spike test (200 concurrent, 2000 requests)
ab -n 2000 -c 200 $SERVICE_URL/
```

### 8. Scaling Configuration
```bash
# View current scaling config
gcloud run services describe lmsmath --region=asia-southeast1 \
  --format="table(
    spec.template.metadata.annotations.'autoscaling.knative.dev/minScale',
    spec.template.metadata.annotations.'autoscaling.knative.dev/maxScale',
    spec.template.spec.containerConcurrency
  )"

# Update scaling
gcloud run services update lmsmath --region=asia-southeast1 \
  --min-instances=1 \
  --max-instances=20 \
  --concurrency=100
```

### 9. Resource Configuration
```bash
# View current resources
gcloud run services describe lmsmath --region=asia-southeast1 \
  --format="yaml(spec.template.spec.containers[0].resources)"

# Update resources
gcloud run services update lmsmath --region=asia-southeast1 \
  --memory=4Gi \
  --cpu=4 \
  --timeout=600
```

### 10. Deployment
```bash
# Deploy from local Dockerfile
gcloud run deploy lmsmath \
  --region=asia-southeast1 \
  --source=. \
  --allow-unauthenticated

# Deploy using Cloud Build
gcloud builds submit --config=cloudbuild.yaml

# Quick deploy script
./deploy-to-cloud-run.sh
```

## 🔍 Troubleshooting

### Service Not Responding (502/503)
```bash
# Check logs for errors
gcloud run services logs read lmsmath --region=asia-southeast1 --limit=100 | grep -i error

# Increase memory and timeout
gcloud run services update lmsmath --region=asia-southeast1 --memory=4Gi --timeout=600

# Check if port is correctly set (should be 3000)
gcloud run services describe lmsmath --region=asia-southeast1 --format="value(spec.template.spec.containers[0].ports)"
```

### Database Connection Issues
```bash
# Run database connectivity check
./check-database-connectivity.sh

# Verify DATABASE_URL secret
gcloud secrets describe DATABASE_URL

# Check if secret is mounted
gcloud run services describe lmsmath --region=asia-southeast1 \
  --format="value(spec.template.spec.containers[0].env)" | grep DATABASE_URL

# Update DATABASE_URL
echo -n "postgresql://..." | gcloud secrets versions add DATABASE_URL --data-file=-

# Trigger redeploy to pick up changes
gcloud run services update lmsmath --region=asia-southeast1
```

### High Latency / Slow Performance
```bash
# Check current resource usage
gcloud run services describe lmsmath --region=asia-southeast1 \
  --format="yaml(spec.template.spec.containers[0].resources)"

# Increase resources
gcloud run services update lmsmath --region=asia-southeast1 --cpu=4 --memory=4Gi

# Set min instances to reduce cold starts
gcloud run services update lmsmath --region=asia-southeast1 --min-instances=2

# Check for cold starts in logs
gcloud run services logs read lmsmath --region=asia-southeast1 | grep -i "cold start"
```

### Auto-Scaling Not Working
```bash
# Check scaling configuration
gcloud run services describe lmsmath --region=asia-southeast1 \
  --format="table(
    spec.template.metadata.annotations.'autoscaling.knative.dev/minScale',
    spec.template.metadata.annotations.'autoscaling.knative.dev/maxScale'
  )"

# Run load test
./test-cloud-run-scaling.sh

# Watch logs during load test
gcloud run services logs tail lmsmath --region=asia-southeast1
```

## 📊 Critical Checks

### ✅ Health Check
```bash
# All must return HTTP 200
curl -I $SERVICE_URL/                      # Homepage
curl -I $SERVICE_URL/sign-in              # Sign-in page
curl -I $SERVICE_URL/api/auth/session     # Auth API
```

### ✅ Environment Variables Check
```bash
# Required variables
gcloud run services describe lmsmath --region=asia-southeast1 \
  --format="value(spec.template.spec.containers[0].env)" | grep -E "NODE_ENV|NEXTAUTH_URL|GOOGLE_CLOUD_PROJECT_ID"
```

### ✅ Secrets Check
```bash
# Required secrets
gcloud secrets describe DATABASE_URL      # Must exist
gcloud secrets describe NEXTAUTH_SECRET   # Must exist
```

### ✅ Database Connectivity
```bash
# Test via API
curl -s $SERVICE_URL/api/auth/session
# Should return: {"user":null} or user object
```

## 🚨 Emergency Commands

### Service Down - Quick Recovery
```bash
# 1. Check if service is running
gcloud run services describe lmsmath --region=asia-southeast1

# 2. View recent errors
gcloud run services logs read lmsmath --region=asia-southeast1 --limit=50 | grep -i error

# 3. Rollback to previous revision (if needed)
PREVIOUS_REVISION=$(gcloud run revisions list --service=lmsmath --region=asia-southeast1 --format="value(name)" --limit=2 | tail -1)
gcloud run services update-traffic lmsmath --region=asia-southeast1 --to-revisions=$PREVIOUS_REVISION=100

# 4. Force redeploy
gcloud run services update lmsmath --region=asia-southeast1
```

### Database Connection Lost
```bash
# 1. Verify DATABASE_URL
gcloud secrets versions access latest --secret=DATABASE_URL

# 2. Check if mounted
gcloud run services describe lmsmath --region=asia-southeast1 \
  --format="value(spec.template.spec.containers[0].env)" | grep DATABASE_URL

# 3. Force redeploy with secret
gcloud run services update lmsmath --region=asia-southeast1 \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest"
```

### High Error Rate
```bash
# 1. Get error count
gcloud run services logs read lmsmath --region=asia-southeast1 --limit=100 | grep -c -i error

# 2. View error details
gcloud run services logs read lmsmath --region=asia-southeast1 --limit=100 | grep -i error

# 3. Increase resources if resource-related
gcloud run services update lmsmath --region=asia-southeast1 --memory=4Gi --cpu=4
```

## 📈 Performance Targets

| Metric | Target | Acceptable | Action Needed |
|--------|--------|------------|---------------|
| Response Time | <500ms | <1s | >1s |
| Error Rate | <0.1% | <1% | >1% |
| Availability | >99.9% | >99% | <99% |
| Cold Start | <2s | <5s | >5s |

## 💡 Best Practices

1. **Always use Secret Manager** for sensitive data (DATABASE_URL, API keys)
2. **Set min-instances=1** for production to avoid cold starts
3. **Monitor logs daily** for errors and warnings
4. **Run load tests** before traffic spikes
5. **Keep database connection pooling** enabled
6. **Use PostgreSQL** (not SQLite) for production
7. **Enable SSL** for database connections (`sslmode=require`)
8. **Set up alerts** for errors and latency
9. **Review costs** monthly
10. **Document all changes** in deployment logs

## 🔗 Quick Links

- **Cloud Console:** https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath
- **Metrics:** https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath/metrics
- **Logs:** https://console.cloud.google.com/run/detail/asia-southeast1/lmsmath/logs
- **Secrets:** https://console.cloud.google.com/security/secret-manager
- **Billing:** https://console.cloud.google.com/billing

## 📖 Documentation

- Full Guide: `CLOUD_RUN_VERIFICATION_GUIDE.md`
- Deployment Guide: `CLOUD_RUN_DEPLOYMENT_GUIDE.md`
- Scripts:
  - `verify-cloud-run-deployment.sh` - Full verification
  - `check-database-connectivity.sh` - Database checks
  - `test-cloud-run-scaling.sh` - Load testing
  - `deploy-to-cloud-run.sh` - Deployment

---

**Project:** LMS Math  
**Last Updated:** October 9, 2025  
**Version:** 1.0

