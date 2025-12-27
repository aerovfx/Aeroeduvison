# 📚 Guide Directory

This directory contains all documentation files and shell scripts for the AeroVFX MathLMS project.

## 📊 Contents

- **Total Files:** 299
  - 📄 **Markdown Files (.md):** 259
  - 🔧 **Shell Scripts (.sh):** 40

---

## 📖 Documentation Categories

### 🔐 Authentication & Authorization
- `AUTH_*.md` - Authentication system guides
- `NEXTAUTH_*.md` - NextAuth v5 implementation
- `SESSION_*.md` - Session management
- `SIGNUP_*.md` - User registration guides

### 🎓 Learning Management
- `LESSON_*.md` - Lesson creation guides
- `LEARNING_PATH_*.md` - Learning path builder
- `AI_CONTENT_GENERATOR_*.md` - AI content generation
- `QUIZ_*.md` - Quiz system documentation

### 🔬 Simulations & Labs
- `PYTHON_SIMULATIONS_*.md` - Python simulation guides
- `*_SIMULATION_*.md` - Individual simulation docs
- `LABTWIN_*.md` - Interactive lab guides
- `QUICK_START_ALL_LABS.md` - Start all labs at once

### 🖼️ OCR & Computer Vision
- `OCR_*.md` - OCR system documentation
- `ADVANCED_OCR_PIPELINE_COMPLETE.md` - Complete OCR guide
- `ML_TRAINING_*.md` - Machine learning training

### ☁️ Deployment & Infrastructure
- `CLOUD_RUN_*.md` - Google Cloud Run deployment
- `PRODUCTION_*.md` - Production environment setup
- `DOCKER_*.md` - Docker containerization
- `DEPLOYMENT_*.md` - Deployment guides

### 🧪 Testing & Quality
- `TEST_*.md` - Testing documentation
- `TESTING_QUICK_REFERENCE.md` - Quick testing guide
- `TROUBLESHOOTING.md` - Common issues and solutions

### 🎨 UI/UX
- `UI_*.md` - UI component documentation
- `DESIGN_*.md` - Design system guides
- `VISION_TRACKER_*.md` - Vision tracking interface

---

## 🔧 Shell Scripts

### 🚀 Startup Scripts
- `START_*.sh` - Service startup scripts
- `start-*.sh` - Development server scripts

### 🧪 Testing Scripts
- `test-*.sh` - Automated testing scripts
- `verify-*.sh` - Verification scripts

### ⚙️ Setup & Configuration
- `setup-*.sh` - Initial setup scripts
- `check-*.sh` - Health check scripts

### 🧹 Maintenance
- `cleanup-*.sh` - Cleanup and optimization scripts
- `fix-*.sh` - Quick fix scripts

---

## 🗂️ How to Use This Directory

### Finding Documentation

**By Feature:**
```bash
ls Guide/*FEATURE_NAME*.md
```

**By Type:**
```bash
# All authentication docs
ls Guide/AUTH_*.md

# All simulation docs
ls Guide/*SIMULATION*.md

# All OCR docs
ls Guide/OCR_*.md
```

### Running Scripts

Make scripts executable:
```bash
chmod +x Guide/*.sh
```

Run a specific script:
```bash
./Guide/SCRIPT_NAME.sh
```

---

## 📌 Important Documents

### 🎯 Quick Start Guides
1. `QUICK_START.md` - General quick start
2. `QUICK_START_ALL_LABS.md` - Start all labs
3. `QUICK_START_LOCAL_DB.md` - Local database setup
4. `QUICK_START_AI_GENERATOR.md` - AI content generator

### 📘 Complete Guides
1. `COMPLETE_DEPLOYMENT_GUIDE.md` - Full deployment guide
2. `COMPLETE_SETUP_GUIDE.md` - Complete setup instructions
3. `SIMULATIONS_MASTER_GUIDE.md` - Master simulation guide
4. `OCR_COMPLETE_GUIDE.md` - Complete OCR guide

### 🔧 Reference Guides
1. `AUTH_QUICK_REFERENCE.md` - Auth quick reference
2. `TESTING_QUICK_REFERENCE.md` - Testing reference
3. `STEM_QUICK_REFERENCE.md` - STEM features reference

### 📊 Summaries
1. `SUMMARY_ALL_WORK_DONE.md` - Complete project summary
2. `ALL_SIMULATIONS_FINAL_SUMMARY.md` - All simulations
3. `DEPLOYMENT_SUMMARY.md` - Deployment overview

---

## 🔍 Search Tips

### Find by keyword:
```bash
grep -r "keyword" Guide/*.md
```

### List all setup guides:
```bash
ls Guide/*SETUP*.md
```

### Find all complete guides:
```bash
ls Guide/*COMPLETE*.md
```

---

## 📝 Maintenance

This directory was organized on **2025-12-28** as part of the repository cleanup effort.

### To add new documentation:
1. Place .md files in the `Guide/` directory
2. Use descriptive, UPPERCASE naming
3. Follow existing naming conventions

### To add new scripts:
1. Place .sh files in the `Guide/` directory
2. Make them executable with `chmod +x`
3. Add appropriate comments and documentation

---

## 🎯 Project Overview

This is the documentation hub for the **AeroVFX MathLMS** project - an AI-powered Learning Management System with interactive simulations, advanced OCR grading, and comprehensive student tracking.

**Key Features Documented:**
- ✅ NextAuth v5 authentication
- ✅ 20+ Python simulations
- ✅ Advanced OCR & ML grading
- ✅ AI content generation
- ✅ Cloud Run deployment
- ✅ Vision tracking system
- ✅ Multi-language support

---

**Last Updated:** 2025-12-28  
**Total Documentation Files:** 299  
**Project:** https://github.com/aerovfx/mathlms
