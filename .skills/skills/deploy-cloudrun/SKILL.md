---
name: deploy-cloudrun
description: >
  Deploy a Next.js application to Google Cloud Run using local Docker CLI build.
  Covers the full pipeline: Docker build, push to Artifact Registry, deploy to Cloud Run,
  IAM permissions, env vars, and post-deploy OAuth setup. Includes hard-won troubleshooting
  for OOM builds, missing modules, .dockerignore conflicts, and Cloud Build quota limits.
  ALWAYS use this skill when the user mentions "deploy to cloud run", "deploy production",
  "push to cloud", "deploy updates", "redeploy", "cloud run deploy", "docker deploy",
  or any request involving deploying a Next.js/Node.js app to Google Cloud Run.
  Also use when the user encounters Cloud Run or Cloud Build errors.
---

# Deploy to Cloud Run via Docker Desktop

This skill deploys a **Next.js 15 standalone** app to Google Cloud Run by building the Docker
image locally with **Docker Desktop** (not Cloud Build) and pushing to Artifact Registry.

## Project Info

| Key | Value |
|-----|-------|
| **Project ID** | `extreme-lattice-491123-p2` |
| **Region** | `asia-southeast1` |
| **Service** | `pixiai` |
| **Database** | Neon PostgreSQL (`channel_binding=require`) |
| **Auth** | NextAuth v4 + Google OAuth + PrismaAdapter |
| **AI Backend** | Ollama (local) / OpenAI-compatible API |
| **Rust Services** | Vector similarity, OCR grading, LLM grading (optional proxies) |

## Why Docker Desktop (Not Cloud Build, Not Colima)

### Cloud Build — Blocked by Memory Limits
- Default machine: 4GB RAM — fails on any non-trivial Next.js build
- `E2_HIGHCPU_8`: 8GB RAM — fails during "Collecting page data" with heavy libraries
- `E2_HIGHCPU_32`: 32GB RAM — often blocked by quota restrictions across all regions

### Docker CLI + Colima — QEMU Overhead Problem
- Colima uses pure QEMU to emulate amd64 on Apple Silicon
- QEMU roughly **doubles memory usage** — 12GB colima ≈ 6GB effective for Node.js
- Build is 3-5x slower than Docker Desktop due to QEMU vs Rosetta
- Must manually allocate RAM: `colima start --memory 16`
- No BuildKit by default — uses legacy builder

### Docker Desktop — Best Choice ✓
- Uses **Apple Rosetta 2** for amd64 emulation — near-native speed, much less memory overhead
- **BuildKit** enabled by default — better caching, parallel layer builds, lower memory
- Automatic RAM management — uses Mac's available RAM dynamically
- GUI for monitoring builds, resource usage, and logs

## Prerequisites

1. **Docker Desktop** — https://www.docker.com/products/docker-desktop/
   - Settings → General → ✅ "Use Rosetta for x86_64/amd64 emulation on Apple Silicon"
   - Settings → Resources → Memory: **12-16GB** (recommended)
   - Settings → Resources → Swap: **4GB** (important for peak memory during SSG)
   - Settings → Docker Engine → ensure `"features": { "buildkit": true }` (default on)

2. **gcloud CLI** — installed and authenticated

3. **If migrating from Colima**:
   ```bash
   colima stop && colima delete
   # Then install Docker Desktop
   ```

## Pre-Deploy Checklist

Before running `quick-deploy.sh`, verify these critical items:

### 1. Prisma Schema — OAuth Relations
PrismaAdapter (`@next-auth/prisma-adapter`) requires **lowercase** relation field names
in `Account` and `Session` models:

```prisma
// ✅ CORRECT — lowercase 'user' for Account and Session ONLY
model Account {
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
model Session {
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// All OTHER models keep uppercase 'User' (e.g., ExamMatrix, Question, etc.)
```

After any schema change:
```bash
npx prisma generate
npx prisma db push
```

### 2. Environment Variables (.env / .env.local)
```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Auth
NEXTAUTH_SECRET="your-64-char-hex-secret"
NEXTAUTH_URL="http://localhost:3000"       # Local; Cloud Run overrides in Step 7
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxx"

# AI/LLM — Ollama locally, OpenAI-compatible API in production
OPENAI_API_KEY="ollama"                     # or real OpenAI key for production
OPENAI_BASE_URL="http://localhost:11434/v1" # Ollama local; change for prod
OPENAI_DEFAULT_MODEL="gpt-4o-mini"          # or any Ollama model name

# GCP
GOOGLE_CLOUD_PROJECT="extreme-lattice-491123-p2"
```

**Important for production**: `OPENAI_BASE_URL` must point to a reachable LLM endpoint
from Cloud Run. Ollama at `localhost:11434` won't work in production — use OpenAI API
or a hosted Ollama instance.

### 3. Subscription System
All AI features (AI Tutor, exam prep, career advisor, etc.) require a paid subscription.
The `checkAISubscription()` utility in `lib/subscription-check.ts` gates access:
- FREE plan → blocked with Vietnamese error message
- STUDENT_PRO / TEACHER_PRO / SCHOOL → allowed
- Expired or inactive → blocked

Ensure at least one test user has an active paid subscription before testing AI features.

### 4. Test Locally First
```bash
npm run dev
# Test: Google OAuth login at /auth/login
# Test: Role switching at /dashboard/profile
# Test: AI Tutor (requires paid subscription + working LLM endpoint)
# Test: Exam prep at /student/exam-prep (question bank + teacher exams)
```

## Deploy Script

The deploy script `quick-deploy.sh` handles everything in 7 steps:

```
Step 0: Check Docker Desktop is running
Step 1: Authenticate with gcloud
Step 2: Enable required GCP APIs
Step 3: Create/verify Artifact Registry repository
Step 4: Build Docker image locally (docker buildx build --platform linux/amd64 --load)
Step 5: Push image to Artifact Registry (docker push)
Step 6: Deploy to Cloud Run (gcloud run deploy)
Step 7: Auto-configure NEXTAUTH_URL from deployed service URL
```

Run with: `bash quick-deploy.sh`

## Dockerfile — Current State

Multi-stage build with 4 stages:

```dockerfile
FROM node:20-slim AS base        # OS deps (openssl, curl, ca-certificates)
FROM base AS deps                # npm ci --legacy-peer-deps (cached layer)
FROM base AS builder             # prisma generate + next build (standalone)
FROM base AS runner              # minimal runtime image, non-root user
```

### Critical Build ENV vars

```dockerfile
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1
ENV DISABLE_CONTENTLAYER=1
ENV NODE_OPTIONS="--max-old-space-size=4096"   # 4GB heap — balanced for Docker Desktop
```

**Note**: `NODE_OPTIONS` is set to **4096** (4GB), not 8192. This is intentional — Docker Desktop
with Rosetta handles 4GB well and avoids excessive swap usage. If builds still OOM, try
increasing to 6144 or 8192.

### Prisma in Docker
```dockerfile
# In deps stage:
COPY prisma ./prisma/

# In builder stage:
RUN PRISMA_SKIP_VALIDATION=1 npx prisma generate || true

# In runner stage — copy generated Prisma client:
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
```

## next.config.js — Build Optimization

```js
experimental: {
  workerThreads: false,   // Disable threaded workers — reduces memory spikes
  cpus: 1,                // Single SSG worker — CRITICAL for OOM prevention
  // optimizeCss: false,  // DISABLED — critters consumes too much memory during SSG
  optimizePackageImports: ['lucide-react', '@mui/material', 'recharts', 'three', 'deck.gl', ...],
}
```

**Key points**:
- `cpus: 1` is the **single most impactful** change for preventing SIGKILL during "Collecting page data"
- `optimizeCss` is **disabled** (commented out) — critters causes OOM during SSG with heavy pages
- `workerThreads: false` prevents additional memory overhead from worker threads
- Heavy libraries (three.js, deck.gl, mediapipe) are isolated into async webpack chunks

### Webpack Chunk Splitting
The config splits heavy vendor libraries into separate async chunks:
- `three-vendor` (three.js) — async only
- `deck-vendor` (deck.gl) — async only
- `mediapipe-vendor` (@mediapipe) — async only
- `mui-vendor` (@mui) — all chunks
- `recharts-vendor` (recharts) — all chunks

## IAM Permissions Required

```bash
PROJECT_ID="extreme-lattice-491123-p2"
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for ROLE in roles/run.admin roles/artifactregistry.writer roles/iam.serviceAccountUser roles/logging.logWriter roles/storage.objectViewer; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$ROLE" --quiet
done
```

## Environment Variables for Cloud Run

Set during `gcloud run deploy --set-env-vars`:

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | `production` | Yes |
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | Session signing key (64-char hex) | Yes |
| `NEXTAUTH_URL` | Auto-set in Step 7 from service URL | Yes (auto) |
| `GOOGLE_CLIENT_ID` | OAuth Client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret | Yes |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID | Yes |
| `OPENAI_API_KEY` | LLM API key (OpenAI or compatible) | For AI features |
| `OPENAI_BASE_URL` | LLM endpoint URL | For AI features |
| `OPENAI_DEFAULT_MODEL` | Default model name | For AI features |

**Production AI setup**: For AI features to work in Cloud Run, you need either:
1. An OpenAI API key with `OPENAI_BASE_URL=https://api.openai.com/v1`
2. An OpenRouter key with `OPENAI_BASE_URL=https://openrouter.ai/api/v1`
3. A self-hosted Ollama instance reachable from Cloud Run

## Post-Deploy Checklist

### 1. Google OAuth Redirect URIs
Go to: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client → Edit

Add:
- **Authorized JavaScript origins**: `https://<CLOUD_RUN_URL>`
- **Authorized redirect URIs**: `https://<CLOUD_RUN_URL>/api/auth/callback/google`

### 2. Test Login Flow
- Visit Cloud Run URL → click "Đăng nhập với Google"
- Verify OAuth callback works (no `OAuthCallback` error)
- Check user appears in database with correct role

### 3. Test Role Switching
- Go to `/dashboard/profile`
- Switch between STUDENT and TEACHER roles
- Confirm auto-logout and re-login with updated permissions

### 4. Test AI Features (requires subscription)
- Create a test subscription record (STUDENT_PRO or TEACHER_PRO)
- Test AI Tutor at `/student/ai-tutor`
- Test Exam Prep at `/student/exam-prep`

### 5. Check Logs
```bash
gcloud logging read "resource.type=cloud_run_revision" --project=extreme-lattice-491123-p2 --limit=50
```

## Common Build Errors and Fixes

### 1. SIGKILL / OOM during "Collecting page data"

**Root cause**: Next.js spawns worker processes for SSG. Heavy imports (three.js, deck.gl) consume
enormous memory per worker.

**Fixes (apply all)**:
- Docker Desktop with Rosetta enabled
- `NODE_OPTIONS="--max-old-space-size=4096"` in Dockerfile
- `experimental.cpus: 1` in next.config.js ← **most critical**
- `experimental.workerThreads: false` in next.config.js
- Docker Desktop Resources → Memory: 12-16GB, Swap: 4GB

**If still failing**:
- Convert heavy static imports to `next/dynamic` imports
- Increase Docker Desktop memory and swap
- Try `NODE_OPTIONS="--max-old-space-size=6144"`

### 2. Module not found: Can't resolve '@/some/path'

**Root cause**: `.dockerignore` excludes the directory.

**Fix**: Check `.dockerignore` — avoid overly broad exclusions.

### 3. PrismaAdapter `Unknown field 'user'` / OAuthCallback error

**Root cause**: PrismaAdapter expects lowercase `user` relation in Account and Session models,
but schema has uppercase `User`.

**Fix**: In `prisma/schema.prisma`, rename the relation field to lowercase `user` in Account
and Session models ONLY. All other models keep uppercase. Then:
```bash
npx prisma generate && npx prisma db push
```

### 4. AI Tutor "Failed to get response"

**Root cause**: `/api/agents/llm/route.ts` not using `OPENAI_BASE_URL` env var, or the LLM
endpoint is unreachable.

**Fix**: Ensure the route uses `process.env.OPENAI_BASE_URL`. In production, ensure the LLM
endpoint is reachable from Cloud Run (not `localhost`).

### 5. package-lock.json out of sync (npm ci fails)

**Fix**:
```bash
npm install --package-lock-only --legacy-peer-deps --ignore-scripts
```

### 6. Cloud Build quota restrictions

**Fix**: Don't use Cloud Build. Use local Docker Desktop build (this skill's approach).

### 7. DEPRECATED legacy builder warning

**Fix**: Use `docker buildx build` instead of `docker build`:
```bash
docker buildx build --platform linux/amd64 --load -t IMAGE_URI -f Dockerfile .
```

### 8. Platform mismatch warnings (linux/amd64 vs arm64)

**Expected on Apple Silicon Macs**. With Docker Desktop + Rosetta, these warnings are harmless.

## App Architecture Summary

### Key API Routes
| Route | Purpose |
|-------|---------|
| `/api/auth/[...nextauth]` | NextAuth Google OAuth |
| `/api/user/role` | PUT — switch STUDENT ↔ TEACHER role |
| `/api/agents/llm` | LLM proxy (OpenAI-compatible) |
| `/api/agents/exam-prep` | Exam prep (question bank + teacher exams) |
| `/api/agents/ai-tutor` | AI Tutor chat |
| `/api/agents/career-advisor` | Career advisor |
| `/api/agents/study-planner` | Study planner |
| `/api/agents/progress-tracker` | Progress tracker |
| `/api/agents/content-generator` | Content generator |
| `/api/agents/auto-grading` | Auto grading |
| `/api/agents/admin` | Admin AI (no subscription check) |

### Subscription Gating
All `/api/agents/*` routes (except admin) check `checkAISubscription()` which requires:
- Active subscription (status: `active` or `trialing`)
- Paid plan: `STUDENT_PRO`, `TEACHER_PRO`, or `SCHOOL`
- Not expired (`currentPeriodEnd > now`)

### Exam Prep Data Flow
- **Question Bank** → `db.question.findMany()` → `PracticeExam`
  - 40% EASY / 30% MEDIUM / 30% HARD distribution
- **Teacher Exam** → `db.exam` → `ExamQuestion` → `Question` → `PracticeExam`
- **Exam Matrix** → `db.examMatrix` → `MatrixSelectedQuestion` → `Question` → `PracticeExam`

### Prisma Relation Field Names
- Account, Session: **lowercase** `user` (for PrismaAdapter)
- All other models: **uppercase** `User`, `Question`, etc. (Prisma convention)
- In queries: use the field name as declared, e.g., `include: { Question: true }` (uppercase)

## Docker Desktop Settings Reference

| Setting | Recommended Value |
|---------|-------------------|
| Rosetta emulation | ✅ Enabled |
| CPUs | 6+ (leave 2 for macOS) |
| Memory | 12-16GB |
| Swap | 4GB |
| Disk | 60GB+ |
| BuildKit | ✅ Enabled (default) |

## Cloud Run Configuration

| Setting | Value |
|---------|-------|
| Runtime | Node.js 20 (node:20-slim) |
| Output mode | Next.js standalone |
| Memory | 1Gi |
| CPU | 1 |
| Min instances | 0 (scale to zero) |
| Max instances | 10 |
| Concurrency | 80 |
| Request timeout | 600s |

## Files

| File | Purpose |
|------|---------|
| `quick-deploy.sh` | Main deploy script (7 steps) |
| `Dockerfile` | Multi-stage production build (4 stages) |
| `.dockerignore` | Controls Docker build context |
| `next.config.js` | Build optimization (`cpus: 1`, chunks, no optimizeCss) |
| `prisma/schema.prisma` | Database schema (OAuth lowercase relations) |
| `lib/subscription-check.ts` | AI subscription gating utility |
| `lib/agents/exam-prep.ts` | Exam prep agent (question bank + teacher exams) |

## Quick Start

```bash
# 1. Install Docker Desktop and enable Rosetta
# 2. Set Memory 12-16GB, Swap 4GB in Docker Desktop Settings → Resources
# 3. Verify Prisma schema (lowercase user in Account/Session):
npx prisma generate && npx prisma db push
# 4. Test locally:
npm run dev
# 5. Deploy:
bash quick-deploy.sh
# 6. After deploy, configure OAuth redirect URIs in Google Cloud Console
# 7. For AI features in prod, set OPENAI_BASE_URL and OPENAI_API_KEY env vars in Cloud Run
```
