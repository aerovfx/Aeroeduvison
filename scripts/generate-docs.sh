#!/bin/bash

# Documentation Generator Script
# Automatically creates documentation pages from Guide/ files

echo "🚀 Generating documentation from Guide files..."

# Create authentication docs
echo "Creating authentication docs..."
cat > docs/authentication/overview.md << 'EOF'
# Authentication Overview

AeroEduVison uses NextAuth v5 for authentication with support for multiple providers and advanced security features.

## Features

- ✅ Email/Password authentication
- ✅ Google OAuth
- ✅ Two-Factor Authentication (2FA)
- ✅ Role-based access control
- ✅ Session management
- ✅ Secure password hashing

See [Guide/AUTH_QUICK_REFERENCE.md](../../Guide/AUTH_QUICK_REFERENCE.md) for more details.

## Quick Links

- [NextAuth Setup](./nextauth-setup.md)
- [User Management](./user-management.md)
- [Session Handling](./session-handling.md)
- [2FA Setup](./2fa.md)

For detailed implementation guides, refer to:
- [Guide/NEXTAUTH_V5_ADVANCED_COMPLETE.md](../../Guide/NEXTAUTH_V5_ADVANCED_COMPLETE.md)
- [Guide/AUTH_COMPLETE_FINAL.md](../../Guide/AUTH_COMPLETE_FINAL.md)
EOF

# Create AI features docs
echo "Creating AI features docs..."
cat > docs/ai-features/overview.md << 'EOF'
# AI Features Overview

AeroEduVison integrates cutting-edge AI technologies to enhance learning experiences.

## AI Capabilities

### 🤖 Content Generation
- Automatic lesson creation from topics
- Quiz generation
- Assignment creation
- Multi-language support

### 🎓 Intelligent Tutoring
- Personalized learning paths
- Adaptive difficulty
- Real-time feedback
- Progress predictions

### 📝 Auto-Grading
- Handwriting recognition
- Natural language processing
- Context-aware scoring
- Detailed feedback generation

See detailed guides:
- [Guide/AI_GENERATOR_COMPLETE_GUIDE.md](../../Guide/AI_GENERATOR_COMPLETE_GUIDE.md)
- [Guide/INTELLIGENT_AI_SYSTEM_COMPLETE.md](../../Guide/INTELLIGENT_AI_SYSTEM_COMPLETE.md)
EOF

# Create deployment docs
echo "Creating deployment docs..."
cat > docs/deployment/overview.md << 'EOF'
# Deployment Overview

Deploy AeroEduVison to production with Google Cloud Run.

## Deployment Options

### ☁️ Google Cloud Run (Recommended)
- Automatic scaling
- Zero server management
- Pay per use
- Global CDN

### 🐳 Docker
- Containerized deployment
- Portable and reproducible
- Easy local testing

### 🔧 Manual Deployment
- Traditional hosting
- Full control
- Custom configurations

## Quick Deploy

```bash
# Deploy to Cloud Run
./Guide/deploy-to-cloud-run.sh
```

For detailed guides, see:
- [Guide/CLOUD_RUN_DEPLOYMENT_GUIDE.md](../../Guide/CLOUD_RUN_DEPLOYMENT_GUIDE.md)
- [Guide/PRODUCTION_DEPLOYMENT_GUIDE.md](../../Guide/PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Guide/DOCKER_BUILD_FIXED.md](../../Guide/DOCKER_BUILD_FIXED.md)
EOF

# Create troubleshooting docs
echo "Creating troubleshooting docs..."
cat > docs/troubleshooting/common-issues.md << 'EOF'
# Common Issues & Solutions

## Database Connection Issues

### Error: Cannot connect to database

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Verify connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

See: [Guide/TROUBLESHOOTING.md](../../Guide/TROUBLESHOOTING.md)

## Authentication Issues

### Error: NextAuth callback error

**Solution:**
1. Check NEXTAUTH_URL matches your domain
2. Verify NEXTAUTH_SECRET is set
3. Clear browser cookies

See: [Guide/AUTH_FIXES_SUMMARY.md](../../Guide/AUTH_FIXES_SUMMARY.md)

## Build Errors

### Error: Type errors during build

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Regenerate Prisma client
npx prisma generate

# Rebuild
npm run build
```

## OCR Issues

### Low accuracy

**Solutions:**
1. Improve image quality (300+ DPI)
2. Ensure good lighting
3. Use clear handwriting

See: [Guide/OCR_TROUBLESHOOTING.md](../../Guide/OCR_TROUBLESHOOTING.md)

## Performance Issues

### Slow page loads

**Solutions:**
1. Enable caching
2. Optimize images
3. Use CDN for static assets

See: [Guide/PERFORMANCE_OPTIMIZATION.md](../../Guide/PERFORMANCE_OPTIMIZATION.md)

For more issues and solutions, browse the [Guide directory](../../Guide).
EOF

echo "✅ Documentation generation complete!"
echo ""
echo "📚 Generated documentation:"
echo "  - docs/authentication/overview.md"
echo "  - docs/ai-features/overview.md"
echo "  - docs/deployment/overview.md"
echo "  - docs/troubleshooting/common-issues.md"
echo ""
echo "📝 Next steps:"
echo "  1. Review generated docs"
echo "  2. Add more specific pages as needed"
echo "  3. Update navigation in docs/config.ts"
echo "  4. Test documentation site"
