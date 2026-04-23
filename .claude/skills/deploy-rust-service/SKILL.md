---
name: deploy-rust-service
description: >
  Deploy any Rust microservice in rust-services/ to Google Cloud Run for the AeroEduVision
  project (GCP: extreme-lattice-491123-p2, region: asia-southeast1).
  Use this skill whenever the user says "deploy teacher-service", "deploy latex-service",
  "deploy <any>-service to Cloud Run", "thầy chưa deploy", "service unavailable",
  "503 từ teacher", or any request to build and ship a Rust microservice.
  Covers the full pipeline: Cloud Build image → Cloud Run deploy → update aero-backend
  env var → health check. Also handles first-time secret setup, IAM grants,
  and multi-service batch deploys.
---

# Deploy Rust Microservice — AeroEduVision

## Project constants

| Key | Value |
|-----|-------|
| GCP Project | `extreme-lattice-491123-p2` |
| Region | `asia-southeast1` |
| Artifact Registry repo | `aeroedu` |
| API gateway Cloud Run service | `pixiai-aero-backend` *(check with `gcloud run services list`)*  |

Image pattern: `asia-southeast1-docker.pkg.dev/extreme-lattice-491123-p2/aeroedu/<service-name>:latest`

---

## Service catalogue

Know these services before starting — they live in `rust-services/` and share the same pattern:

| Directory | Cloud Run name | Port | Required secrets | Env var on aero-backend |
|-----------|---------------|------|-----------------|------------------------|
| `teacher-service` | `pixiai-teacher` | 8106 | `pixiai-database-url`, `pixiai-jwt-secret` | `TEACHER_SERVICE_URL` |
| `latex-service` | `pixiai-latex` | 8109 | `pixiai-database-url`, `pixiai-jwt-secret`, `anthropic-api-key` | `LATEX_SERVICE_URL` |
| `exam-service` | `pixiai-exam` | 8107 | `pixiai-database-url`, `pixiai-jwt-secret` | `EXAM_SERVICE_URL` |
| `auth-service` | `pixiai-auth` | 8092 | `pixiai-database-url`, `pixiai-jwt-secret` | `AUTH_SERVICE_URL` |
| `media-service` | `pixiai-media` | 8098 | `pixiai-database-url`, `pixiai-jwt-secret` | `MEDIA_SERVICE_URL` |
| `ai-service` | `pixiai-ai` | 8096 | `pixiai-database-url`, `pixiai-jwt-secret`, `anthropic-api-key` | `AI_SERVICE_URL` |
| `student-service` | `pixiai-student` | 8095 | `pixiai-database-url`, `pixiai-jwt-secret` | `STUDENT_SERVICE_URL` |
| `analytics-service` | `pixiai-analytics` | 8104 | `pixiai-database-url`, `pixiai-jwt-secret` | `ANALYTICS_SERVICE_URL` |
| *(others)* | `pixiai-<name>` | varies | `pixiai-database-url`, `pixiai-jwt-secret` | `<NAME>_SERVICE_URL` |

For services not listed, derive the Cloud Run name as `pixiai-<directory-name>` and check `rust-services/<name>/src/main.rs` for which env vars it reads.

---

## Step 0 — Confirm scope

Ask the user (or infer from context) which service(s) to deploy. If they say "teacher-service" proceed directly. If vague, list the catalogue above and ask.

Then confirm GCP auth:

```bash
gcloud config get-value project       # should print extreme-lattice-491123-p2
gcloud auth print-access-token > /dev/null && echo "✅ auth ok"
```

If not authenticated: `gcloud auth login && gcloud config set project extreme-lattice-491123-p2`

---

## Step 1 — Verify secrets exist

Each service needs its secrets in Secret Manager before deploy. Check:

```bash
SERVICE_SECRETS=(pixiai-database-url pixiai-jwt-secret)
# Add anthropic-api-key for ai-service, latex-service

for S in "${SERVICE_SECRETS[@]}"; do
  gcloud secrets describe "$S" --project=extreme-lattice-491123-p2 \
    && echo "✅ $S" || echo "❌ MISSING: $S"
done
```

**If a secret is missing**, create it:
```bash
# For database URL:
echo "postgresql://user:pass@host/db?sslmode=require" \
  | gcloud secrets create pixiai-database-url \
    --data-file=- --replication-policy=automatic \
    --project=extreme-lattice-491123-p2

# Or update an existing secret:
echo "new-value" | gcloud secrets versions add pixiai-database-url \
  --data-file=- --project=extreme-lattice-491123-p2
```

Also grant the Cloud Run runtime SA read access (idempotent):
```bash
PROJECT_NUMBER=$(gcloud projects describe extreme-lattice-491123-p2 --format='value(projectNumber)')
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for S in pixiai-database-url pixiai-jwt-secret; do
  gcloud secrets add-iam-policy-binding "$S" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role=roles/secretmanager.secretAccessor \
    --project=extreme-lattice-491123-p2 --quiet
done
echo "✅ IAM grants done"
```

---

## Step 2 — Build image with Cloud Build

Navigate to the service directory and submit a build. **No local Docker needed.**

```bash
cd rust-services/<service-name>

SERVICE_NAME="pixiai-teacher"   # adjust per service
REGION="asia-southeast1"
PROJECT_ID="extreme-lattice-491123-p2"
REPO="aeroedu"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE_NAME}:latest"

gcloud builds submit \
  --tag "$IMAGE" \
  --region="$REGION" \
  --timeout=20m \
  --project="$PROJECT_ID" \
  .
```

Cloud Build streams logs. Typical Rust build: **8–15 min** (dependency caching means subsequent builds are ~3–5 min).

> **Why `gcloud builds submit --tag`?**  It uploads the source directory to Cloud Storage, builds the Dockerfile remotely on Google's infrastructure, and pushes the final image to Artifact Registry — all without Docker on your machine.

**If the build fails** with `SQLX_OFFLINE` errors, ensure `.sqlx/` query cache exists in the service dir, or set `SQLX_OFFLINE=true` in the Dockerfile (already set in all services here).

---

## Step 3 — Deploy to Cloud Run

```bash
SERVICE_NAME="pixiai-teacher"
REGION="asia-southeast1"
PROJECT_ID="extreme-lattice-491123-p2"
REPO="aeroedu"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE_NAME}:latest"

gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --platform=managed \
  --allow-unauthenticated \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=5 \
  --timeout=120 \
  --set-secrets="DATABASE_URL=pixiai-database-url:latest,NEXTAUTH_SECRET=pixiai-jwt-secret:latest" \
  --set-env-vars="RUST_LOG=teacher_service=info"
```

For services that also need `anthropic-api-key`, add to `--set-secrets`:
```
DATABASE_URL=pixiai-database-url:latest,NEXTAUTH_SECRET=pixiai-jwt-secret:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest
```

For `RUST_LOG`, use the service binary name with underscores (e.g., `teacher_service=info`, `latex_service=info`).

After deploy, capture the URL:
```bash
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" --project="$PROJECT_ID" \
  --format='value(status.url)')
echo "✅ $SERVICE_NAME: $SERVICE_URL"
```

---

## Step 4 — Wire URL into aero-backend (API gateway)

The API gateway (`aero-backend`) reads `TEACHER_SERVICE_URL` (or similar) from its env. Update it:

```bash
# Find the actual aero-backend Cloud Run service name first:
gcloud run services list --region=asia-southeast1 --project=extreme-lattice-491123-p2 \
  | grep -i "aero\|backend\|pixiai" | head -5

# Then update:
GATEWAY_SERVICE="pixiai-aero-backend"   # verify exact name above
gcloud run services update "$GATEWAY_SERVICE" \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --update-env-vars="TEACHER_SERVICE_URL=${SERVICE_URL}"
```

This takes effect immediately on the next request (no restart needed).

---

## Step 5 — Health check

```bash
# 1. Service's own health endpoint (if it has one):
curl -s "${SERVICE_URL}/health" | head -1

# 2. Via the public proxy (tests the full routing chain):
curl -s -o /dev/null -w "%{http_code}" \
  -H "Cookie: next-auth.session-token=<token>" \
  https://inphysic.com/api/teacher/exams

# For unauthenticated endpoints:
curl -s https://inphysic.com/api/teacher/health 2>/dev/null || echo "no /health route"
```

A **200** or **401** (auth required) means the service is alive. A **503** means either:
- The aero-backend URL env var wasn't updated (Step 4)
- The Cloud Run service is cold-starting (wait 10–20 s and retry)
- The build failed — check logs: `gcloud logging read "resource.labels.service_name=$SERVICE_NAME" --project=$PROJECT_ID --limit=50 --format="table(timestamp,textPayload)"`

---

## Common patterns

### Deploy multiple services at once

Run Steps 2–4 in a loop or open parallel terminal tabs. Cloud Build is the bottleneck (one 15 min build per service); they can run concurrently:

```bash
for SVC in teacher-service exam-service; do
  (
    cd rust-services/$SVC
    NAME="pixiai-${SVC%-service}"   # strips "-service" suffix → pixiai-teacher
    gcloud builds submit --tag "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${NAME}:latest" \
      --region=$REGION --timeout=20m . &
  )
done
wait
echo "All builds complete"
```

Then deploy each once builds succeed.

### Re-deploy after code changes only (no secret changes)

Steps 1 and 4 can be skipped. Just rebuild (Step 2) and redeploy (Step 3).

### Roll back a bad deploy

```bash
# List recent revisions:
gcloud run revisions list --service=pixiai-teacher --region=asia-southeast1 \
  --project=extreme-lattice-491123-p2

# Route 100% traffic to a known-good revision:
gcloud run services update-traffic pixiai-teacher \
  --region=asia-southeast1 --project=extreme-lattice-491123-p2 \
  --to-revisions=pixiai-teacher-00001-abc=100
```

---

## Quick reference — deploy teacher-service (copy-paste)

```bash
set -euo pipefail
PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
SERVICE_NAME="pixiai-teacher"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/aeroedu/${SERVICE_NAME}:latest"

cd /path/to/Aeroeduvison/rust-services/teacher-service

# Build
gcloud builds submit --tag "$IMAGE" --region="$REGION" --timeout=20m --project="$PROJECT_ID" .

# Deploy
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE" --region="$REGION" --project="$PROJECT_ID" \
  --platform=managed --allow-unauthenticated \
  --cpu=1 --memory=512Mi --min-instances=0 --max-instances=5 --timeout=120 \
  --set-secrets="DATABASE_URL=pixiai-database-url:latest,NEXTAUTH_SECRET=pixiai-jwt-secret:latest" \
  --set-env-vars="RUST_LOG=teacher_service=info"

# Get URL + update gateway
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" \
  --project="$PROJECT_ID" --format='value(status.url)')

echo "URL: $SERVICE_URL"
echo "Now run: gcloud run services update <gateway-name> --update-env-vars=TEACHER_SERVICE_URL=$SERVICE_URL"
```

See `references/service-map.md` for the full list of env var names per service.
