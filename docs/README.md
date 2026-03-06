# 📚 AeroEduVison Documentation

This directory contains the complete documentation for AeroEduVison, organized in a structure similar to [Cursor Docs](https://cursor.com/docs).

## 🗂️ Directory Structure

```
docs/
├── index.md                          # Main documentation homepage
├── config.ts                         # Navigation configuration
│
├── getting-started/                  # 🚀 Getting Started
│   ├── index.md                     # Section overview
│   ├── introduction.md              # Project introduction
│   ├── installation.md              # Installation guide
│   ├── quick-start.md               # 5-minute quick start
│   └── environment-setup.md         # Environment configuration
│
├── authentication/                   # 🔐 Authentication
│   ├── overview.md                  # Auth system overview
│   ├── nextauth-setup.md            # NextAuth configuration
│   ├── user-management.md           # User CRUD operations
│   ├── session-handling.md          # Session management
│   ├── 2fa.md                       # Two-factor authentication
│   └── oauth-providers.md           # Google, GitHub OAuth
│
├── simulations/                      # 🔬 Simulations & Labs
│   ├── overview.md                  # Simulations overview
│   ├── quick-start-labs.md          # Quick start guide
│   ├── python-simulations.md        # Python setup
│   ├── physics-labs.md              # Physics simulations
│   ├── chemistry-labs.md            # Chemistry simulations
│   └── custom-simulations.md        # Create custom labs
│
├── ocr-grading/                      # 🖼️ OCR & Auto-Grading
│   ├── overview.md                  # OCR system overview
│   ├── advanced-pipeline.md         # Advanced OCR pipeline
│   ├── ml-training.md               # ML model training
│   ├── auto-grading.md              # Auto-grading system
│   └── paddleocr.md                 # PaddleOCR integration
│
├── ai-features/                      # 🤖 AI Features
│   ├── overview.md                  # AI features overview
│   ├── content-generator.md         # AI content generation
│   ├── intelligent-tutoring.md      # AI tutoring system
│   ├── learning-path-builder.md     # AI path builder
│   └── api-integration.md           # AI API integration
│
├── deployment/                       # ☁️ Deployment
│   ├── overview.md                  # Deployment overview
│   ├── cloud-run.md                 # Google Cloud Run
│   ├── docker.md                    # Docker configuration
│   ├── environment-variables.md     # Env var management
│   ├── prisma.md                    # Database setup
│   ├── cloud-sql.md                 # Cloud SQL configuration
│   └── cicd.md                      # CI/CD pipeline
│
├── api-reference/                    # 📖 API Reference
│   ├── rest-api.md                  # REST API documentation
│   ├── websocket.md                 # WebSocket events
│   ├── python-api.md                # Python API
│   ├── auth-api.md                  # Authentication API
│   └── simulations-api.md           # Simulations API
│
└── troubleshooting/                  # 🔧 Troubleshooting
    ├── common-issues.md             # Common problems
    ├── debug-guide.md               # Debugging guide
    ├── testing-guide.md             # Testing documentation
    ├── performance.md               # Performance optimization
    └── faq.md                       # Frequently asked questions
```

## 🎯 Documentation Principles

### 1. **Clear Structure**
- Organized by feature/module
- Progressive disclosure (basic → advanced)
- Consistent formatting

### 2. **Code Examples**
- Real, working code snippets
- Include language tags
- Show expected output

### 3. **Visual Aids**
- Architecture diagrams
- Flow charts
- Screenshots where helpful

### 4. **Search-Friendly**
- Descriptive titles
- Rich metadata
- Proper headings hierarchy

## 🚀 Quick Navigation

### For New Users
1. [Introduction](./getting-started/introduction.md) - Understand what AeroEduVison is
2. [Quick Start](./getting-started/quick-start.md) - Get running in 5 minutes
3. [Installation](./getting-started/installation.md) - Detailed setup guide

### For Developers
1. [API Reference](./api-reference/rest-api.md) - Complete API docs
2. [Custom Simulations](./simulations/custom-simulations.md) - Create your own labs
3. [Deployment Guide](./deployment/cloud-run.md) - Deploy to production

### For Teachers
1. [AI Content Generator](./ai-features/content-generator.md) - Auto-create lessons
2. [OCR Grading](./ocr-grading/overview.md) - Automatic grading system
3. [Learning Paths](./ai-features/learning-path-builder.md) - Build custom paths

## 📝 Contributing to Docs

### Adding New Documentation

1. **Create MD file** in appropriate directory
2. **Follow naming convention**: lowercase-with-dashes.md
3. **Add to config.ts** for navigation
4. **Include frontmatter**:

```md
---
title: "Your Page Title"
description: "Brief description"
---

# Your Page Title

Content here...
```

### Documentation Standards

- **Use clear headings** (H1 for title, H2 for sections, H3 for subsections)
- **Code blocks** must specify language
- **Link related pages** for easy navigation
- **Include examples** for complex features
- **Add troubleshooting** sections when relevant

## 🔍 Documentation Search

The docs support full-text search through:
1. **Navigation config** - Quick access to known pages
2. **File system search** - Find by filename
3. **Content search** - Search within documentation

## 🛠️ Documentation Tech Stack

- **Format**: Markdown (.md files)
- **Rendering**: Next.js + MDX
- **Navigation**: Custom config-based sidebar
- **Styling**: TailwindCSS
- **Code Highlighting**: Shiki/Prism

## 📊 Documentation Stats

- **Total Pages**: 50+
- **Categories**: 8
- **Code Examples**: 200+
- **Diagrams**: 20+
- **Last Updated**: 2025-12-28

## 🔗 Related Resources

- **[Main README](../README.md)** - Project overview
- **[Guide Directory](../Guide)** - Legacy documentation
- **[GitHub Repository](https://github.com/aerovfx/Aeroeduvison)** - Source code

---

## 📞 Feedback

Found an issue or have a suggestion?
- Open an issue on GitHub
- Submit a pull request
- Contact: docs@aeroeduvison.com

---

**Last Updated:** 2025-12-28  
**Maintained by:** AeroEduVison Team
