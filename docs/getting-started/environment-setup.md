# Environment Setup

Configure AeroEduVison for different deployment environments with this comprehensive guide.

## 📋 Configuration Overview

AeroEduVison supports multiple environments:

- **Development**: Local development and testing
- **Staging**: Pre-production testing
- **Production**: Live application

## 🔧 Environment Variables

### Core Configuration

Create `.env.local` in your project root:

```env
# ===========================================
# AEROEDUVISON ENVIRONMENT CONFIGURATION
# ===========================================

# Application
NEXT_PUBLIC_APP_NAME="AeroEduVison"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_VERSION="2.0.0"

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/aeroeduvison"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"

# Email (Optional - for notifications)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@aeroeduvison.com"
```

### AI & ML Services

```env
# Google AI (Gemini)
GOOGLE_AI_API_KEY="your-gemini-api-key-here"

# Ollama (Local AI)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama2"

# OpenAI (Optional - for advanced features)
OPENAI_API_KEY="your-openai-api-key"
```

### Cloud Services (Production)

```env
# Google Cloud Platform
GOOGLE_CLOUD_PROJECT_ID="your-gcp-project-id"
GOOGLE_CLOUD_STORAGE_BUCKET="aeroeduvison-media"
GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY="path/to/service-account-key.json"

# Cloud SQL (Production Database)
CLOUD_SQL_CONNECTION_NAME="project:region:instance"
CLOUD_SQL_DATABASE_NAME="aeroeduvison_prod"

# Cloud Run (Deployment)
CLOUD_RUN_SERVICE_NAME="aeroeduvison-api"
CLOUD_RUN_REGION="us-central1"
```

### Security & Performance

```env
# Security
NEXT_PUBLIC_ENABLE_ANALYTICS="false"
ENABLE_ERROR_REPORTING="false"
CORS_ORIGINS="http://localhost:3000,https://yourdomain.com"

# Performance
NEXT_PUBLIC_IMAGE_OPTIMIZATION="true"
ENABLE_COMPRESSION="true"
CACHE_TTL="3600"

# Rate Limiting
RATE_LIMIT_REQUESTS="100"
RATE_LIMIT_WINDOW="900000"  # 15 minutes in ms
```

## 🛠️ Environment-Specific Setup

### Development Environment

**File:** `.env.local`

```bash
# Quick development setup
cp env.example .env.local

# Edit with your local settings
nano .env.local
```

**Database:** Use local PostgreSQL or Docker:

```bash
# Docker PostgreSQL for development
docker run --name aeroeduvison-dev \
  -e POSTGRES_DB=aeroeduvison_dev \
  -e POSTGRES_USER=dev \
  -e POSTGRES_PASSWORD=dev123 \
  -p 5432:5432 \
  -d postgres:15
```

### Staging Environment

**File:** `.env.staging`

```env
NEXT_PUBLIC_APP_URL="https://staging.aeroeduvison.com"
DATABASE_URL="postgresql://user:pass@staging-db:5432/aeroeduvison_staging"
NEXTAUTH_URL="https://staging.aeroeduvison.com"
NEXT_PUBLIC_ENABLE_ANALYTICS="true"
```

**Deployment:**

```bash
# Build for staging
npm run build:staging

# Deploy to staging
npm run deploy:staging
```

### Production Environment

**File:** `.env.production`

```env
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://aeroeduvison.com"
DATABASE_URL="postgresql://user:pass@prod-db:5432/aeroeduvison_prod"
NEXTAUTH_URL="https://aeroeduvison.com"

# Enable production features
NEXT_PUBLIC_ENABLE_ANALYTICS="true"
ENABLE_ERROR_REPORTING="true"
ENABLE_COMPRESSION="true"

# Security
NEXTAUTH_SECRET="your-production-secret-key"
CORS_ORIGINS="https://aeroeduvison.com,https://www.aeroeduvison.com"
```

## 🔐 Secret Management

### Development Secrets

For local development, use `.env.local` (gitignored):

```bash
# Generate secure secrets
openssl rand -base64 32

# Add to .env.local
NEXTAUTH_SECRET="generated-secret-here"
```

### Production Secrets

Use Google Cloud Secret Manager:

```bash
# Store secrets in GCP
echo -n "your-secret-value" | gcloud secrets create nextauth-secret --data-file=-

# Access in application
gcloud secrets access nextauth-secret --version=1
```

Or use environment variables in deployment:

```yaml
# cloud-run.yaml
env:
  - name: NEXTAUTH_SECRET
    value: "your-production-secret"
  - name: DATABASE_URL
    value: "postgresql://..."
```

## 🗄️ Database Configuration

### Local Development

```env
# Local PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/aeroeduvison_dev"

# Docker PostgreSQL
DATABASE_URL="postgresql://dev:dev123@localhost:5432/aeroeduvison_dev"
```

### Cloud SQL (Production)

```env
# Direct connection
DATABASE_URL="postgresql://user:pass@34.102.136.180:5432/aeroeduvison_prod"

# Connection via proxy
DATABASE_URL="postgresql://user:pass@localhost:5432/aeroeduvison_prod?host=/cloudsql/project:region:instance"
```

### Prisma Configuration

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DATABASE_URL") // For migrations
}
```

## 🌐 Domain & SSL Setup

### Custom Domain

1. **Purchase domain** (e.g., aeroeduvison.com)
2. **Configure DNS** to point to Cloud Run
3. **Update environment**:

```env
NEXT_PUBLIC_APP_URL="https://aeroeduvison.com"
NEXTAUTH_URL="https://aeroeduvison.com"
```

### SSL Certificate

Cloud Run automatically provides SSL certificates. No additional configuration needed.

## 🔍 Validation & Testing

### Environment Validation

Create a validation script `scripts/validate-env.js`:

```javascript
// Validate environment variables
const required = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];

required.forEach(key => {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

console.log('✅ Environment validation passed');
```

Run validation:

```bash
node scripts/validate-env.js
```

### Configuration Testing

Test your configuration:

```bash
# Test database connection
npm run db:test

# Test authentication
npm run auth:test

# Test AI services
npm run ai:test
```

## 🚀 Deployment Commands

### Development

```bash
# Local development
npm run dev

# With environment file
npm run dev -- --env .env.local
```

### Production

```bash
# Build and deploy
npm run build
npm run deploy:prod

# Check deployment status
gcloud run services describe aeroeduvison-api --region=us-central1
```

## 🔧 Environment Switching

### Using Scripts

Create npm scripts for different environments:

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:staging": "next dev --env .env.staging",
    "build:staging": "next build --env .env.staging",
    "build:prod": "next build --env .env.production"
  }
}
```

### Using Environment Variables

```bash
# Development
NODE_ENV=development npm run dev

# Production
NODE_ENV=production npm run build
```

## 📊 Monitoring & Logging

### Environment Monitoring

```env
# Enable monitoring
NEXT_PUBLIC_ENABLE_ANALYTICS="true"
ENABLE_ERROR_REPORTING="true"
LOG_LEVEL="info"

# Google Cloud Monitoring
GOOGLE_CLOUD_METRICS_ENABLED="true"
```

### Log Configuration

```javascript
// lib/logger.js
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    // Add GCP logging in production
  ]
});
```

## 🆘 Troubleshooting

### Common Issues

**Environment variables not loading:**
```bash
# Check if file exists
ls -la .env.local

# Validate syntax
node -e "require('dotenv').config(); console.log(process.env)"
```

**Database connection fails:**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check PostgreSQL status
brew services list | grep postgresql
```

**Authentication not working:**
```bash
# Verify NEXTAUTH_URL
curl -I $NEXTAUTH_URL/api/auth/signin

# Check NEXTAUTH_SECRET length (min 32 chars)
echo $NEXTAUTH_SECRET | wc -c
```

---

**Next:** [Installation Guide](./installation.md) | [Quick Start](./quick-start.md) | [Deployment Guide](../deployment/overview.md)
