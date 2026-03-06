# Cloud Run Deployment Guide for LMSMath

## Overview

This guide provides comprehensive instructions for deploying the LMSMath application to Google Cloud Run with optimized settings for production use.

## Prerequisites

- Google Cloud Project with billing enabled
- `gcloud` CLI installed and authenticated
- Docker installed
- Node.js 20+ installed
- Access to Prisma Accelerate database

## Architecture

### Resource Configuration
- **CPU**: 1 vCPU
- **Memory**: 512 MiB
- **Min Instances**: 0 (scale to zero)
- **Max Instances**: 10
- **Concurrency**: 80 requests per instance
- **Timeout**: 300 seconds

### Environment Variables

#### Required Secrets (stored in Google Secret Manager)
- `DATABASE_URL`: Prisma Accelerate connection string
- `NEXTAUTH_SECRET`: Random 32-character string for JWT signing
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GOOGLE_CLOUD_PROJECT_ID`: GCP project ID
- `GOOGLE_CLOUD_CREDENTIALS`: Service account JSON

#### Runtime Environment Variables
- `NODE_ENV=production`
- `PORT=3000`
- `HOSTNAME=0.0.0.0`
- `NEXT_TELEMETRY_DISABLED=1`

## Deployment Steps

### 1. Initial Setup

```bash
# Set your project ID
export PROJECT_ID="your-project-id"

# Authenticate with Google Cloud
gcloud auth login
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. Configure Secrets

```bash
# Create DATABASE_URL secret
echo "prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY" | \
gcloud secrets create database-url --data-file=-

# Create NEXTAUTH_SECRET
openssl rand -base64 32 | \
gcloud secrets create nextauth-secret --data-file=-

# Create Google OAuth secrets
echo "your-google-client-id" | \
gcloud secrets create google-oauth --data-file=-

# Create GCP configuration
echo "your-project-id" | \
gcloud secrets create gcp-config --data-file=-
```

### 3. Deploy Application

```bash
# Make deployment script executable
chmod +x scripts/deploy-cloud-run.sh

# Run deployment
./scripts/deploy-cloud-run.sh
```

### 4. Validate Deployment

```bash
# Validate environment variables
chmod +x scripts/validate-env-vars.sh
./scripts/validate-env-vars.sh

# Test auto-scaling
chmod +x scripts/test-auto-scaling.sh
./scripts/test-auto-scaling.sh
```

## Configuration Files

### Dockerfile
- Multi-stage build for optimized image size
- Non-root user for security
- Standalone output for Cloud Run compatibility
- Prisma client generation included

### next.config.js
- Standalone output mode
- Image optimization for Cloud Run
- Simplified webpack configuration
- ESLint and TypeScript errors ignored for faster builds

### cloud-run.yaml
- Complete Cloud Run service configuration
- Resource limits and requests
- Health check probes
- Scaling annotations
- Secret references

## Monitoring and Logging

### Health Checks
- **Endpoint**: `/api/health`
- **Liveness Probe**: HTTP GET every 10 seconds
- **Readiness Probe**: HTTP GET every 5 seconds
- **Initial Delay**: 30 seconds for liveness, 10 seconds for readiness

### Metrics to Monitor
- Request count and latency
- Instance count and scaling events
- CPU and memory utilization
- Error rates and response codes

### Logging
- Application logs available in Cloud Logging
- Structured logging with timestamps
- Error tracking and debugging information

## Auto-scaling Behavior

### Scaling Triggers
- **CPU Utilization**: Scales up when CPU > 70%
- **Concurrent Requests**: Scales up when > 80 requests per instance
- **Request Queue**: Scales up when requests are queued

### Scaling Limits
- **Min Instances**: 0 (cost optimization)
- **Max Instances**: 10 (cost control)
- **Scale-up Rate**: Gradual to prevent cold starts
- **Scale-down Rate**: Conservative to maintain performance

## Performance Optimization

### Cold Start Mitigation
- Startup CPU boost enabled
- Optimized Docker image size
- Prisma client pre-generated
- Minimal dependencies

### Caching Strategy
- Static assets cached for 1 year
- API responses cached for 5 minutes
- CDN integration for global performance

### Database Optimization
- Prisma Accelerate for connection pooling
- Query optimization and indexing
- Connection limits configured

## Security Considerations

### Network Security
- HTTPS enforced
- CORS headers configured
- No public access to internal services

### Secret Management
- All sensitive data in Secret Manager
- No secrets in environment variables
- Regular secret rotation recommended

### Application Security
- Non-root container user
- Input validation and sanitization
- Rate limiting implemented
- CSRF protection enabled

## Troubleshooting

### Common Issues

#### Service Not Starting
```bash
# Check service logs
gcloud run services logs read $SERVICE_NAME --region=$REGION

# Verify secrets are accessible
gcloud secrets versions access latest --secret=database-url
```

#### High Latency
```bash
# Check instance count
gcloud run services describe $SERVICE_NAME --region=$REGION

# Monitor CPU utilization
gcloud monitoring metrics list --filter="resource.type=cloud_run_revision"
```

#### Database Connection Issues
```bash
# Test database connectivity
gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(spec.template.spec.containers[0].env[].name,spec.template.spec.containers[0].env[].value)"
```

### Debug Commands

```bash
# Get service status
gcloud run services describe $SERVICE_NAME --region=$REGION

# View recent logs
gcloud run services logs read $SERVICE_NAME --region=$REGION --limit=100

# Test health endpoint
curl -v https://$SERVICE_NAME-HASH-uc.a.run.app/api/health
```

## Cost Optimization

### Resource Tuning
- Start with 1 CPU, 512Mi memory
- Monitor usage and adjust as needed
- Use scale-to-zero for cost savings

### Instance Management
- Min instances = 0 for development
- Min instances = 1 for production (if needed)
- Max instances based on expected load

### Monitoring Costs
- Set up billing alerts
- Monitor instance hours
- Track request volume and costs

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Rotate secrets quarterly
- Review scaling metrics weekly
- Monitor error rates daily

### Updates and Deployments
- Use rolling deployments
- Test in staging environment first
- Monitor health checks during deployment
- Rollback plan prepared

## Support and Resources

### Documentation
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Prisma Cloud Run Guide](https://www.prisma.io/docs/guides/deployment/deploy-to-google-cloud-run)

### Monitoring Tools
- Google Cloud Console
- Cloud Monitoring
- Cloud Logging
- Error Reporting

### Performance Testing
- Use provided load testing script
- Monitor scaling behavior
- Test under various load conditions
- Validate auto-scaling triggers