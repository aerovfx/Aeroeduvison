# 🏗️ Kiến Trúc Chi Tiết - Component Level

## 📦 Component Architecture

```mermaid
graph TB
    subgraph FRONTEND["Frontend Components"]
        APP[App Router<br/>app/ directory]
        COMP[React Components<br/>components/]
        HOOKS[Custom Hooks<br/>hooks/]
        CONTEXT[Context Providers<br/>contexts/]
    end
    
    subgraph API["API Routes"]
        AUTH_API[Auth API<br/>/api/auth/*]
        COURSE_API[Course API<br/>/api/courses/*]
        AI_API[AI API<br/>/api/ai-*]
        LAB_API[Lab API<br/>/api/*-lab]
        ADMIN_API[Admin API<br/>/api/admin/*]
    end
    
    subgraph LIB["Library Layer"]
        AUTH_LIB[Auth Logic<br/>lib/auth.ts]
        DB[Database<br/>lib/db.ts<br/>Prisma Client]
        UTILS[Utilities<br/>lib/utils.ts]
        AI_LIB[AI Helpers<br/>lib/ai-*.ts]
    end
    
    subgraph MIDDLEWARE["Middleware"]
        AUTH_MW[Auth Middleware<br/>middleware.ts]
        ROUTE_MW[Route Protection]
    end
    
    subgraph DATA["Data Access"]
        PRISMA[Prisma ORM]
        SCHEMA[Schema<br/>prisma/schema.prisma]
    end
    
    APP --> COMP
    APP --> HOOKS
    APP --> CONTEXT
    COMP --> API
    API --> AUTH_LIB
    API --> DB
    API --> AI_LIB
    AUTH_MW --> AUTH_LIB
    AUTH_MW --> DB
    DB --> PRISMA
    PRISMA --> SCHEMA
```

---

## 🔐 Authentication Flow Detail

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant L as Login Form
    participant N as NextAuth Client
    participant S as NextAuth Server
    participant G as Google OAuth
    participant D as Database
    participant M as Middleware
    
    U->>B: Navigate to /auth/login
    B->>L: Load Login Page
    U->>L: Enter Credentials
    L->>N: signIn('credentials')
    N->>S: POST /api/auth/callback/credentials
    S->>D: Verify User
    D-->>S: User Data
    S->>S: Create JWT Token
    S-->>N: Session Cookie
    N-->>L: Login Success
    L->>L: window.location.replace('/dashboard')
    B->>M: Request /dashboard
    M->>D: Validate Token
    D-->>M: Token Valid
    M-->>B: Allow Access
    B->>B: Render Dashboard
```

---

## 📚 Course Management Flow

```mermaid
sequenceDiagram
    participant T as Teacher
    participant UI as Course UI
    participant API as Course API
    participant DB as Database
    participant GCS as Cloud Storage
    
    T->>UI: Create Course
    UI->>API: POST /api/courses
    API->>DB: Create Course Record
    DB-->>API: Course ID
    T->>UI: Upload Course Image
    UI->>API: POST /api/upload
    API->>GCS: Generate Signed URL
    GCS-->>API: Upload URL
    API-->>UI: Upload URL
    UI->>GCS: Upload File
    GCS-->>UI: File URL
    UI->>API: Update Course with Image URL
    API->>DB: Update Course
    DB-->>API: Success
    API-->>UI: Course Created
```

---

## 🤖 AI Grading Flow

```mermaid
sequenceDiagram
    participant S as Student
    participant UI as Submission UI
    participant API as Grading API
    participant OCR as OCR Service
    participant LLM as LLM Provider
    participant DB as Database
    
    S->>UI: Submit Assignment (Image)
    UI->>API: POST /api/ocr-grading
    API->>OCR: Process Image
    OCR-->>API: Extracted Text
    API->>LLM: Grade with Rubric
    LLM-->>API: Grade + Feedback
    API->>DB: Store Grade
    DB-->>API: Success
    API-->>UI: Grade Result
    UI-->>S: Display Grade
```

---

## 🔄 Real-time Lab Simulation Flow

```mermaid
sequenceDiagram
    participant S as Student
    participant UI as Lab UI
    participant API as Lab API
    participant PY as Python Backend
    participant DB as Database
    
    S->>UI: Start Simulation
    UI->>API: POST /api/motionsim
    API->>PY: HTTP Request (Port 8001)
    PY->>PY: Calculate Physics
    PY-->>API: Simulation Data
    API->>DB: Log Interaction
    API-->>UI: Result Data
    UI->>UI: Render Visualization
    S->>UI: Adjust Parameters
    UI->>API: POST (New Params)
    API->>PY: Recalculate
    PY-->>API: New Result
    API-->>UI: Updated Data
    UI->>UI: Update Visualization
```

---

## 📊 Data Model Relationships

```mermaid
erDiagram
    USER ||--o{ ENROLLMENT : has
    USER ||--o{ SUBMISSION : submits
    USER ||--o{ PROGRESS : tracks
    
    COURSE ||--o{ CHAPTER : contains
    COURSE ||--o{ ENROLLMENT : has
    CHAPTER ||--o{ LESSON : contains
    
    ASSIGNMENT ||--o{ SUBMISSION : receives
    ASSIGNMENT }o--|| COURSE : belongs_to
    
    RUBRIC ||--o{ GRADE : uses
    SUBMISSION ||--|| GRADE : has
    
    LEARNING_PATH ||--o{ PATH_NODE : contains
    USER ||--o{ LEARNING_PATH : follows
```

---

## 🔒 Security Layers

```mermaid
graph TB
    subgraph LAYER1["Layer 1: Network"]
        LB[Load Balancer<br/>HTTPS/TLS]
        WAF[WAF Rules<br/>Cloud Armor]
    end
    
    subgraph LAYER2["Layer 2: Application"]
        MW[Middleware<br/>Auth Check]
        RATE[Rate Limiting]
    end
    
    subgraph LAYER3["Layer 3: Data"]
        ENCRYPT[Encryption<br/>At Rest]
        SECRETS[Secret Manager]
    end
    
    LB --> WAF
    WAF --> MW
    MW --> RATE
    RATE --> ENCRYPT
    ENCRYPT --> SECRETS
```

---

## 📈 Performance Optimization

```mermaid
graph LR
    subgraph CACHE["Caching Strategy"]
        CDN[CDN Cache<br/>Static Assets]
        REDIS[Redis Cache<br/>Hot Data]
        ISR[ISR<br/>Pages]
    end
    
    subgraph DB["Database"]
        POOL[Connection Pool<br/>Prisma Accelerate]
        INDEX[Indexes<br/>Optimized Queries]
    end
    
    subgraph ASYNC["Async Processing"]
        QUEUE[Task Queue<br/>Background Jobs]
        STREAM[Streaming<br/>Large Responses]
    end
    
    CDN --> REDIS
    REDIS --> POOL
    POOL --> INDEX
    INDEX --> QUEUE
    QUEUE --> STREAM
```

---

## 🚀 Deployment Pipeline

```mermaid
graph LR
    GIT[Git Repository] -->|Push| CI[Cloud Build]
    CI -->|Build| DOCKER[Docker Image]
    DOCKER -->|Push| REGISTRY[Artifact Registry]
    REGISTRY -->|Deploy| RUN[Cloud Run]
    RUN -->|Health Check| MONITOR[Monitoring]
    MONITOR -->|Alerts| TEAM[Dev Team]
```

---

**Last Updated**: 2024-12-06

