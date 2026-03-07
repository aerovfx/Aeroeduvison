---
title: "Tài Liệu Tham Khảo"
description: "Danh sách đầy đủ các tài liệu quan trọng trong dự án AeroEduVison"
published: true
---

# 7. Tài Liệu Tham Khảo

Danh sách đầy đủ các tài liệu quan trọng trong dự án AeroEduVison.

## 📚 Guide Directory (299 Files)

Thư mục `Guide/` chứa tất cả tài liệu chi tiết của dự án.

### 🎯 Quick Start Guides

| File | Mô Tả |
|------|-------|
| [QUICK_START_LOCAL_DB.md](../../Guide/QUICK_START_LOCAL_DB.md) | Setup database nhanh (Docker) |
| [SETUP_LOCAL_DATABASE.md](../../Guide/SETUP_LOCAL_DATABASE.md) | Setup database chi tiết |
| [SETUP_CHECKLIST.md](../../Guide/SETUP_CHECKLIST.md) | Checklist setup đầy đủ |
| [START_AI_GENERATOR.md](../../Guide/START_AI_GENERATOR.md) | Bắt đầu với AI Generator |

### 🔐 Authentication

| File | Mô Tả |
|------|-------|
| [AUTH_QUICK_REFERENCE.md](../../Guide/AUTH_QUICK_REFERENCE.md) | Quick reference cho auth |
| [AUTH_TESTING_GUIDE.md](../../Guide/AUTH_TESTING_GUIDE.md) | Hướng dẫn test auth |
| [AUTH_TEST_SUMMARY.md](../../Guide/AUTH_TEST_SUMMARY.md) | Tóm tắt test results |
| [NEXTAUTH_V5_ADVANCED_COMPLETE.md](../../Guide/NEXTAUTH_V5_ADVANCED_COMPLETE.md) | NextAuth v5 implementation |

### 🔬 Simulations & Labs

| File | Mô Tả |
|------|-------|
| [PYTHON_SIMULATIONS_GUIDE.md](../../Guide/PYTHON_SIMULATIONS_GUIDE.md) | **Hướng dẫn đầy đủ** tạo simulations |
| [ALL_SIMULATIONS_FINAL_SUMMARY.md](../../Guide/ALL_SIMULATIONS_FINAL_SUMMARY.md) | Tóm tắt tất cả simulations |
| [README_SIMULATIONS.md](../../Guide/README_SIMULATIONS.md) | README simulations |
| [SIMULATIONS_MASTER_GUIDE.md](../../Guide/SIMULATIONS_MASTER_GUIDE.md) | Master guide |

### 🖼️ OCR & Grading

| File | Mô Tả |
|------|-------|
| [OCR_GRADING_COMPLETE_GUIDE.md](../../Guide/OCR_GRADING_COMPLETE_GUIDE.md) | **Hướng dẫn đầy đủ** OCR Grading |
| [OCR_GRADING_INDEX.md](../../Guide/OCR_GRADING_INDEX.md) | Mục lục OCR docs |
| [OCR_FINAL_SUMMARY.md](../../Guide/OCR_FINAL_SUMMARY.md) | Tóm tắt OCR system |
| [ADVANCED_OCR_PIPELINE_COMPLETE.md](../../Guide/ADVANCED_OCR_PIPELINE_COMPLETE.md) | Advanced OCR pipeline |

### 🤖 AI Features

| File | Mô Tả |
|------|-------|
| [AI_GENERATOR_COMPLETE_GUIDE.md](../../Guide/AI_GENERATOR_COMPLETE_GUIDE.md) | **Hướng dẫn đầy đủ** AI Generator |
| [AI_CONTENT_GENERATOR_FINAL_SUMMARY.md](../../Guide/AI_CONTENT_GENERATOR_FINAL_SUMMARY.md) | Tóm tắt AI Generator |
| [AI_API_KEYS_SETUP.md](../../Guide/AI_API_KEYS_SETUP.md) | Setup API keys |
| [AUTO_AI_SELECTION.md](../../Guide/AUTO_AI_SELECTION.md) | Auto AI selection logic |

### ☁️ Deployment

| File | Mô Tả |
|------|-------|
| [CLOUD_RUN_QUICK_REFERENCE.md](../../Guide/CLOUD_RUN_QUICK_REFERENCE.md) | **Quick reference** Cloud Run |
| [CLOUD_RUN_DEPLOYMENT_GUIDE.md](../../Guide/CLOUD_RUN_DEPLOYMENT_GUIDE.md) | Deployment guide chi tiết |
| [CLOUD_RUN_VERIFICATION_SUMMARY.md](../../Guide/CLOUD_RUN_VERIFICATION_SUMMARY.md) | Verification checklist |
| [DOCKER_BUILD_FIXED.md](../../Guide/DOCKER_BUILD_FIXED.md) | Docker build guide |

### 🧪 Testing

| File | Mô Tả |
|------|-------|
| [TESTING_QUICK_REFERENCE.md](../../Guide/TESTING_QUICK_REFERENCE.md) | **Quick reference** testing |
| [TEST_LOGIN_FLOW.md](../../Guide/TEST_LOGIN_FLOW.md) | Test login flow |
| [PRISMA_POSTGRESQL_TEST_REPORT.md](../../Guide/PRISMA_POSTGRESQL_TEST_REPORT.md) | Prisma test report |

### 📊 Summaries & Reports

| File | Mô Tả |
|------|-------|
| [SUMMARY_ALL_WORK_DONE.md](../../Guide/SUMMARY_ALL_WORK_DONE.md) | Tóm tắt tất cả công việc |
| [COMPLETE_PROJECT_SUMMARY.md](../../Guide/COMPLETE_PROJECT_SUMMARY.md) | Tóm tắt dự án |
| [SUCCESS_REPORT.md](../../Guide/SUCCESS_REPORT.md) | Báo cáo thành công |

## 📖 Docs Directory

### Getting Started
- [getting-started/index.md](../getting-started/index.md) - Mục lục
- [getting-started/introduction.md](../getting-started/introduction.md) - Giới thiệu
- [getting-started/installation.md](../getting-started/installation.md) - Cài đặt
- [getting-started/quick-start.md](../getting-started/quick-start.md) - Quick start

### Architecture
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Kiến trúc tổng quan
- [ARCHITECTURE_SUMMARY.md](../ARCHITECTURE_SUMMARY.md) - Tóm tắt kiến trúc
- [ARCHITECTURE_DETAILED.md](../ARCHITECTURE_DETAILED.md) - Chi tiết kiến trúc

### Features
- [authentication/overview.md](../authentication/overview.md) - Authentication
- [simulations/overview.md](../simulations/overview.md) - Simulations
- [ocr-grading/overview.md](../ocr-grading/overview.md) - OCR Grading
- [ai-features/overview.md](../ai-features/overview.md) - AI Features

## 🔍 Tìm Kiếm Tài Liệu

### Tìm theo chủ đề:
```bash
# Tất cả file về Auth
ls Guide/AUTH_*.md

# Tất cả file về OCR
ls Guide/OCR_*.md

# Tất cả file về Simulations
ls Guide/*SIMULATION*.md

# Tất cả file về Cloud Run
ls Guide/CLOUD_RUN_*.md
```

### Tìm theo keyword:
```bash
# Tìm trong tất cả file markdown
grep -r "keyword" Guide/*.md

# Tìm trong docs
grep -r "keyword" docs/*.md
```

## 📝 Cấu Trúc Tài Liệu

```
Aeroeduvision/
├── docs/                    # Tài liệu chính thức
│   ├── beginner/           # Module cho người mới (đây!)
│   ├── getting-started/    # Hướng dẫn bắt đầu
│   ├── authentication/     # Auth docs
│   ├── simulations/        # Simulations docs
│   └── ...
│
└── Guide/                   # Tài liệu chi tiết (299 files)
    ├── AUTH_*.md           # Auth guides
    ├── OCR_*.md            # OCR guides
    ├── PYTHON_*.md         # Python guides
    ├── CLOUD_RUN_*.md      # Deployment guides
    └── ...
```

## 🎯 Tài Liệu Quan Trọng Nhất

### Cho Người Mới:
1. ✅ Module này: `docs/beginner/`
2. 📖 [QUICK_START_LOCAL_DB.md](../../Guide/QUICK_START_LOCAL_DB.md)
3. 🧪 [TESTING_QUICK_REFERENCE.md](../../Guide/TESTING_QUICK_REFERENCE.md)

### Cho Developers:
1. 🔬 [PYTHON_SIMULATIONS_GUIDE.md](../../Guide/PYTHON_SIMULATIONS_GUIDE.md)
2. 🖼️ [OCR_GRADING_COMPLETE_GUIDE.md](../../Guide/OCR_GRADING_COMPLETE_GUIDE.md)
3. 🤖 [AI_GENERATOR_COMPLETE_GUIDE.md](../../Guide/AI_GENERATOR_COMPLETE_GUIDE.md)
4. ☁️ [CLOUD_RUN_QUICK_REFERENCE.md](../../Guide/CLOUD_RUN_QUICK_REFERENCE.md)

### Cho DevOps:
1. ☁️ [CLOUD_RUN_DEPLOYMENT_GUIDE.md](../../Guide/CLOUD_RUN_DEPLOYMENT_GUIDE.md)
2. 🐳 [DOCKER_BUILD_FIXED.md](../../Guide/DOCKER_BUILD_FIXED.md)
3. 🔐 [AUTH_QUICK_REFERENCE.md](../../Guide/AUTH_QUICK_REFERENCE.md)

## 🔗 External Resources

### Next.js & React
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Next.js Learn](https://nextjs.org/learn)

### Database
- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### Styling
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)

### AI & ML
- [Google Gemini API](https://ai.google.dev/)
- [OpenAI API](https://platform.openai.com/)
- [Ollama Documentation](https://ollama.ai/docs)

### Cloud
- [Google Cloud Run](https://cloud.google.com/run/docs)
- [Cloud SQL](https://cloud.google.com/sql/docs)

## 💡 Tips

1. **Đọc theo thứ tự:**
   - Bắt đầu với module này (`docs/beginner/`)
   - Sau đó xem các guide trong `Guide/` khi cần chi tiết

2. **Sử dụng search:**
   - `Cmd/Ctrl + F` trong IDE để tìm nhanh
   - `grep` trong terminal để tìm trong nhiều files

3. **Bookmark các file quan trọng:**
   - Quick references
   - Complete guides
   - Troubleshooting guides

4. **Cập nhật thường xuyên:**
   - Tài liệu được cập nhật liên tục
   - Check `Last Updated` date

---

**Quay lại:** [Mục Lục](./index.md)
