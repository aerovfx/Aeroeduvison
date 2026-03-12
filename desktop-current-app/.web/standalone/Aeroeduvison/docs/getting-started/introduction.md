# Introduction to AeroEduVison

**AeroEduVison** is a comprehensive, AI-powered Learning Management System designed for modern education. It combines interactive simulations, advanced OCR grading, and intelligent tutoring to create an engaging learning experience.

## 🎯 What is AeroEduVison?

AeroEduVison is built for educators and students who want:

- **Interactive Learning** - 20+ Python-powered physics, chemistry, and biology simulations
- **AI-Powered Content** - Automatic lesson generation and intelligent tutoring
- **Advanced Grading** - OCR-based automatic grading with ML
- **Comprehensive Tracking** - Real-time student progress monitoring
- **Cloud-Ready** - Deploy to Google Cloud Run with one command

## ✨ Key Features

### 🔐 **Advanced Authentication**
- NextAuth v5 with two-factor authentication
- Google OAuth integration
- Role-based access control (Student/Teacher/Admin)
- Secure session management

### 🔬 **Interactive Simulations**
- **Physics Labs**: Motion, Aerodynamics, Optics, Weather
- **Chemistry Labs**: 3D Molecular visualizations
- **Biology Labs**: Growth simulations
- Real-time visualization with Python + Taichi

### 🖼️ **OCR & Auto-Grading**
- Advanced OCR pipeline using PaddleOCR
- ML-based handwriting recognition
- Automatic grading with AI feedback
- Multi-language support (English, Vietnamese)

### 🤖 **AI Features**
- **Content Generator**: Auto-create lessons from topics
- **Intelligent Tutoring**: Personalized learning paths
- **AI Grading**: Natural language feedback
- Powered by Google Gemini & Ollama

### 📊 **Learning Analytics**
- Real-time progress tracking
- XP and achievement system
- Teacher dashboards
- Student performance insights

### ☁️ **Production-Ready**
- Docker containerization
- Google Cloud Run deployment
- Cloud SQL database
- Cloud Storage for media
- CI/CD with Cloud Build

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           Next.js 15 Frontend               │
│    (React 19 + TailwindCSS + shadcn/ui)    │
└────────────────┬────────────────────────────┘
                 │
┌────────────────┴────────────────────────────┐
│         API Layer (Next.js Routes)          │
│  ┌──────────┬──────────┬──────────────┐    │
│  │ Auth API │  AI API  │ Simulations  │    │
│  └──────────┴──────────┴──────────────┘    │
└────────────────┬────────────────────────────┘
                 │
┌────────────────┴────────────────────────────┐
│              Backend Services               │
│  ┌──────────┬──────────┬──────────────┐    │
│  │  Prisma  │  OCR     │   Python     │    │
│  │   ORM    │ Service  │ Simulations  │    │
│  └──────────┴──────────┴──────────────┘    │
└────────────────┬────────────────────────────┘
                 │
┌────────────────┴────────────────────────────┐
│         Data Layer (Google Cloud)           │
│  ┌──────────┬──────────┬──────────────┐    │
│  │Cloud SQL │   GCS    │  BigQuery    │    │
│  └──────────┴──────────┴──────────────┘    │
└─────────────────────────────────────────────┘
```

---

## 🎓 Who Is This For?

### **Teachers**
- Create and manage courses effortlessly
- Auto-generate content with AI
- Grade assignments automatically
- Track student progress in real-time

### **Students**
- Learn through interactive simulations
- Get personalized AI tutoring
- Track your progress and earn XP
- Access anywhere, anytime

### **Developers**
- Modern tech stack (Next.js 15, React 19)
- Well-documented codebase
- Easy to extend and customize
- Production-ready deployment

---

## 🚀 Technology Stack

### **Frontend**
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: TailwindCSS + shadcn/ui
- **State**: Zustand
- **Forms**: React Hook Form + Zod

### **Backend**
- **Runtime**: Node.js 18+
- **API**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth v5

### **AI & ML**
- **LLM**: Google Gemini, Ollama
- **OCR**: PaddleOCR, Tesseract
- **ML**: TensorFlow, PyTorch

### **Simulations**
- **Language**: Python 3.12
- **Graphics**: Taichi, OpenCV
- **Physics**: NumPy, SciPy
- **API**: FastAPI

### **Infrastructure**
- **Hosting**: Google Cloud Run
- **Database**: Cloud SQL (PostgreSQL)
- **Storage**: Cloud Storage
- **CI/CD**: Cloud Build
- **Monitoring**: Cloud Logging

---

## 📊 Project Stats

- **Total Code Files**: 2,000+
- **Documentation Files**: 500+
- **Simulations**: 20+
- **API Endpoints**: 100+
- **UI Components**: 300+
- **Test Coverage**: 80%+

---

## 📖 Documentation Structure

Our documentation is organized into several sections:

1. **Getting Started** - Installation and quick start
2. **Authentication** - User management and security
3. **Simulations** - Interactive labs and experiments
4. **OCR & Grading** - Automatic grading system
5. **AI Features** - Content generation and tutoring
6. **Deployment** - Production deployment guides
7. **API Reference** - Complete API documentation
8. **Troubleshooting** - Common issues and solutions

---

## 🎯 Quick Links

- **[Quick Start](./quick-start.md)** - Get running in 5 minutes
- **[Installation Guide](./installation.md)** - Detailed setup
- **[Architecture Guide](../api-reference/architecture.md)** - System design
- **[Deployment Guide](../deployment/cloud-run.md)** - Go to production

---

## 🤝 Contributing

We welcome contributions! Check out our:

- [GitHub Repository](https://github.com/aerovfx/Aeroeduvison)
- [Contributing Guide](./contributing.md)
- [Code of Conduct](./code-of-conduct.md)

---

## 📄 License

This project is proprietary and confidential.

---

**Ready to get started?** Head to the [Quick Start Guide](./quick-start.md)!
