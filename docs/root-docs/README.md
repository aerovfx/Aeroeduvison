# 🎓 AeroVFX MathLMS

An AI-powered Learning Management System with interactive simulations, advanced OCR grading, and comprehensive student tracking.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup local database
npm run db:push

# Start development server
npm run dev
```

Visit `http://localhost:3000`

## 📚 Documentation

All documentation has been organized in the **[Guide/](./Guide)** directory.

### Quick Links:
- 📖 [Complete Setup Guide](./Guide/SETUP.md)
- 🚀 [Quick Start Guide](./Guide/QUICK_START.md)
- 🧪 [Testing Guide](./Guide/TESTING_QUICK_REFERENCE.md)
- 🔧 [Troubleshooting](./Guide/TROUBLESHOOTING.md)
- 📊 [Project Summary](./Guide/SUMMARY_ALL_WORK_DONE.md)

## 🎯 Features

- ✅ **NextAuth v5** - Advanced authentication with 2FA
- ✅ **20+ Python Simulations** - Physics, Chemistry, Biology labs
- ✅ **Advanced OCR** - Automatic grading with ML
- ✅ **AI Content Generation** - Automated lesson creation
- ✅ **Cloud Run Deployment** - Production-ready infrastructure
- ✅ **Vision Tracking** - Real-time student monitoring
- ✅ **Multi-language Support** - Vietnamese & English

## 🛠️ Tech Stack

- **Frontend:** Next.js 15, React 19, TailwindCSS
- **Backend:** NextAuth v5, Prisma, PostgreSQL
- **AI/ML:** Google Gemini, Ollama, PaddleOCR
- **Cloud:** Google Cloud Run, Cloud Storage
- **Simulations:** Python (FastAPI), Taichi, OpenCV

## 📁 Project Structure

```
├── app/                    # Next.js app directory
├── components/             # React components
├── lib/                    # Utilities and services
├── prisma/                # Database schema
├── python-simulations/    # Python simulation servers
├── python-ocr/            # OCR grading service
├── Guide/                 # 📚 All documentation (299 files)
└── public/                # Static assets
```

## 🔧 Development

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Run database migrations
npm run db:push

# Start dev server
npm run dev

# Start all Python labs
./Guide/START_ALL_LABS.sh
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Test specific feature
npm run test:auth
npm run test:simulations

# Quick health check
./Guide/quick-health-check.sh
```

## 🚀 Deployment

See [Cloud Run Deployment Guide](./Guide/CLOUD_RUN_DEPLOYMENT_GUIDE.md)

```bash
# Deploy to Cloud Run
./Guide/deploy-to-cloud-run.sh

# Verify deployment
./Guide/verify-cloud-run-deployment.sh
```

## 📊 Statistics

- **Total Code Files:** 2,000+
- **Documentation Files:** 299
- **Python Simulations:** 20+
- **API Endpoints:** 100+
- **Components:** 300+

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is proprietary and confidential.

## 🔗 Links

- **Repository:** https://github.com/aerovfx/Aeroeduvison
- **Documentation:** [Guide Directory](./Guide)
- **Production:** https://aeroeduvison.com

---

**Last Updated:** 2025-12-28  
**Version:** 2.0  
**Developer:** AeroVFX Team
