# 🏗️ Kiến Trúc Hệ Thống - Quick Reference

## 📊 Sơ Đồ Tổng Quan (Mermaid)

```mermaid
flowchart TB
    %% User Layer
    subgraph USERS["👥 Users"]
        STUDENT[Student]
        TEACHER[Teacher]
        ADMIN[Admin]
    end
    
    %% Frontend
    subgraph FRONTEND["🌐 Frontend"]
        NEXTJS[Next.js 15.5.7<br/>App Router<br/>React + TypeScript]
        PWA[PWA Support]
    end
    
    %% CDN & Edge
    CDN[Cloud CDN<br/>Static Assets]
    
    %% API Gateway
    GATEWAY[Cloud Run<br/>API Gateway<br/>inphysic.com]
    
    %% Core Services
    subgraph SERVICES["⚙️ Core Services"]
        AUTH[Authentication<br/>NextAuth.js]
        DASH[Dashboard<br/>Student/Teacher/Admin]
        COURSE[Course Management]
        LAB[Lab Simulations<br/>Python Backends]
        AI[AI Services<br/>Tutor, Grading]
        ANALYTICS[Analytics]
    end
    
    %% Data Layer
    subgraph DATA["💾 Data"]
        PG[(PostgreSQL<br/>Prisma)]
        REDIS[(Redis<br/>Cache)]
        GCS[Google Cloud<br/>Storage]
    end
    
    %% AI Layer
    subgraph AI_LAYER["🤖 AI"]
        LLM[LLM Providers<br/>OpenAI/Claude/Gemini]
        OCR[OCR Service]
    end
    
    %% Infrastructure
    subgraph INFRA["☁️ Infrastructure"]
        CLOUDRUN[Cloud Run<br/>Serverless]
        BUILD[Cloud Build<br/>CI/CD]
        SECRETS[Secret Manager]
    end
    
    %% Connections
    STUDENT --> NEXTJS
    TEACHER --> NEXTJS
    ADMIN --> NEXTJS
    
    NEXTJS --> CDN
    CDN --> GATEWAY
    
    GATEWAY --> AUTH
    GATEWAY --> DASH
    GATEWAY --> COURSE
    GATEWAY --> LAB
    GATEWAY --> AI
    GATEWAY --> ANALYTICS
    
    AUTH --> PG
    DASH --> PG
    COURSE --> PG
    ANALYTICS --> PG
    
    DASH --> REDIS
    COURSE --> REDIS
    
    COURSE --> GCS
    LAB --> GCS
    
    AI --> LLM
    AI --> OCR
    
    LAB -->|HTTP| PYTHON[Python<br/>Simulations]
    
    BUILD --> CLOUDRUN
    CLOUDRUN --> SECRETS
    
    %% Styling
    classDef user fill:#e3f2fd,stroke:#1976d2
    classDef frontend fill:#fff3e0,stroke:#f57c00
    classDef service fill:#f3e5f5,stroke:#7b1fa2
    classDef data fill:#e8f5e9,stroke:#388e3c
    classDef ai fill:#fce4ec,stroke:#c2185b
    classDef infra fill:#f1f8e9,stroke:#689f38
    
    class STUDENT,TEACHER,ADMIN user
    class NEXTJS,PWA frontend
    class AUTH,DASH,COURSE,LAB,AI,ANALYTICS service
    class PG,REDIS,GCS data
    class LLM,OCR ai
    class CLOUDRUN,BUILD,SECRETS infra
```

---

## 🎯 Thành Phần Chính

### **1. Frontend (Next.js 15.5.7)**
- **Location**: `app/` directory
- **Components**: `components/`
- **Hooks**: `hooks/`
- **Contexts**: `contexts/`
- **Features**: SSR, SSG, ISR, RSC

### **2. API Layer**
- **Routes**: `app/api/*`
- **Auth**: NextAuth.js
- **Endpoints**: 
  - `/api/auth/*` - Authentication
  - `/api/courses/*` - Course management
  - `/api/ai-*` - AI services
  - `/api/*-lab` - Lab simulations
  - `/api/admin/*` - Admin functions

### **3. Data Layer**
- **PostgreSQL**: Primary database (Prisma ORM)
- **Redis**: Cache & sessions
- **GCS**: File storage

### **4. AI Services**
- **LLM**: OpenAI, Claude, Gemini, Ollama
- **OCR**: Python OCR backend
- **Embeddings**: Vector search (future)

### **5. Infrastructure**
- **Cloud Run**: Serverless containers
- **Cloud Build**: CI/CD
- **Secret Manager**: API keys & secrets

---

## 🔄 Luồng Dữ Liệu Chính

### **Login Flow**
```
User → Login Form → NextAuth → Google OAuth
  → JWT Token → Cookie → Middleware → Dashboard
```

### **Course Access**
```
User → Dashboard → Course List → API → PostgreSQL
  → Course Data → Render → Display
```

### **Lab Simulation**
```
User → Lab Page → API → Python Backend (HTTP)
  → Simulation → Result → Display
```

### **AI Grading**
```
Student → Submit → OCR → LLM → Grade → Database
```

---

## 🔒 Bảo Mật

- ✅ HTTPS/TLS everywhere
- ✅ NextAuth.js authentication
- ✅ JWT tokens
- ✅ Role-based access (RBAC)
- ✅ Middleware protection
- ✅ Rate limiting
- ✅ Input validation
- ✅ Secret management

---

## 📈 Performance

- ✅ CDN for static assets
- ✅ Redis caching
- ✅ ISR for pages
- ✅ Connection pooling
- ✅ Auto-scaling (0-10 instances)

---

## 🚀 Deployment

```
Git → Cloud Build → Docker Image → Artifact Registry
  → Cloud Run → Load Balancer → inphysic.com
```

---

**Quick Links**:
- [Full Architecture](./ARCHITECTURE.md)
- [Detailed Components](./ARCHITECTURE_DETAILED.md)
- [Security Patch](./../SECURITY_PATCH_CVE-2025-55182.md)

