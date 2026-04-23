# Service Map — AeroEduVision Rust Microservices

GCP Project: `extreme-lattice-491123-p2`  
Region: `asia-southeast1`  
Artifact Registry repo: `aeroedu`

## Full service registry

| Source dir | Cloud Run name | Local port | Secrets needed | aero-backend env var | RUST_LOG key |
|-----------|---------------|-----------|---------------|---------------------|-------------|
| `teacher-service` | `pixiai-teacher` | 8106 | `pixiai-database-url`, `pixiai-jwt-secret` | `TEACHER_SERVICE_URL` | `teacher_service` |
| `latex-service` | `pixiai-latex` | 8109 | `pixiai-database-url`, `pixiai-jwt-secret`, `anthropic-api-key` | `LATEX_SERVICE_URL` | `latex_service` |
| `exam-service` | `pixiai-exam` | 8107 | `pixiai-database-url`, `pixiai-jwt-secret` | `EXAM_SERVICE_URL` | `exam_service` |
| `auth-service` | `pixiai-auth` | 8092 | `pixiai-database-url`, `pixiai-jwt-secret` | `AUTH_SERVICE_URL` | `auth_service` |
| `course-service` | `pixiai-course` | 8093 | `pixiai-database-url`, `pixiai-jwt-secret` | `COURSE_SERVICE_URL` | `course_service` |
| `admin-service` | `pixiai-admin` | 8094 | `pixiai-database-url`, `pixiai-jwt-secret` | `ADMIN_SERVICE_URL` | `admin_service` |
| `student-service` | `pixiai-student` | 8095 | `pixiai-database-url`, `pixiai-jwt-secret` | `STUDENT_SERVICE_URL` | `student_service` |
| `ai-service` | `pixiai-ai` | 8096 | `pixiai-database-url`, `pixiai-jwt-secret`, `anthropic-api-key` | `AI_SERVICE_URL` | `ai_service` |
| `stem-service` | `pixiai-stem` | 8097 | `pixiai-database-url`, `pixiai-jwt-secret` | `STEM_SERVICE_URL` | `stem_service` |
| `media-service` | `pixiai-media` | 8098 | `pixiai-database-url`, `pixiai-jwt-secret` | `MEDIA_SERVICE_URL` | `media_service` |
| `camera-iot-service` | `pixiai-camera` | 8099 | `pixiai-database-url`, `pixiai-jwt-secret` | `CAMERA_SERVICE_URL` | `camera_iot_service` |
| `grading-service` | `pixiai-grading` | 8100 | `pixiai-database-url`, `pixiai-jwt-secret`, `anthropic-api-key` | `GRADING_SERVICE_URL` | `grading_service` |
| `chat-service` | `pixiai-chat` | 8101 | `pixiai-database-url`, `pixiai-jwt-secret` | `CHAT_SERVICE_URL` | `chat_service` |
| `assignments-service` | `pixiai-assignments` | 8102 | `pixiai-database-url`, `pixiai-jwt-secret` | `ASSIGNMENTS_SERVICE_URL` | `assignments_service` |
| `achievements-service` | `pixiai-achievements` | 8103 | `pixiai-database-url`, `pixiai-jwt-secret` | `ACHIEVEMENTS_SERVICE_URL` | `achievements_service` |
| `analytics-service` | `pixiai-analytics` | 8104 | `pixiai-database-url`, `pixiai-jwt-secret` | `ANALYTICS_SERVICE_URL` | `analytics_service` |
| `emotion-service` | `pixiai-emotion` | 8105 | `pixiai-database-url`, `pixiai-jwt-secret` | `EMOTION_SERVICE_URL` | `emotion_service` |
| `transcript-service` | `pixiai-transcript` | 8108 | `pixiai-database-url`, `pixiai-jwt-secret` | `TRANSCRIPT_SERVICE_URL` | `transcript_service` |
| `aero-backend` | `pixiai-aero-backend` | 8090 | `pixiai-database-url`, `pixiai-jwt-secret` | *(is the gateway)* | `aero_backend` |

## API routing (aero-backend → microservices)

```
/api/teacher/*        → teacher-service   (TEACHER_SERVICE_URL)
/api/latex-projects/* → latex-service     (LATEX_SERVICE_URL)
/api/online-exam-room → exam-service      (EXAM_SERVICE_URL)
/api/courses/*        → course-service    (COURSE_SERVICE_URL)
/api/admin/*          → admin-service     (ADMIN_SERVICE_URL)
/api/students/*       → student-service   (STUDENT_SERVICE_URL)
/api/classes/*        → student-service   (STUDENT_SERVICE_URL)
/api/exams/*          → media-service     (MEDIA_SERVICE_URL)
/api/exam-matrices/*  → media-service     (MEDIA_SERVICE_URL)
/api/questions/*      → media-service     (MEDIA_SERVICE_URL)
/api/documents/*      → media-service     (MEDIA_SERVICE_URL)
/api/ai*              → ai-service        (AI_SERVICE_URL)
/api/stem/*           → stem-service      (STEM_SERVICE_URL)
/api/camera/*         → camera-iot-service(CAMERA_SERVICE_URL)
/api/chat/*           → chat-service      (CHAT_SERVICE_URL)
/api/grading/*        → grading-service   (GRADING_SERVICE_URL)
/api/analytics/*      → analytics-service (ANALYTICS_SERVICE_URL)
/api/emotion/*        → emotion-service   (EMOTION_SERVICE_URL)
/api/assignments/*    → assignments-service(ASSIGNMENTS_SERVICE_URL)
/api/achievements/*   → achievements-service(ACHIEVEMENTS_SERVICE_URL)
/api/transcript/*     → transcript-service(TRANSCRIPT_SERVICE_URL)
```

## Secret Manager secrets

| Secret name | Used by | Contains |
|-------------|---------|---------|
| `pixiai-database-url` | all services | Neon Postgres connection string |
| `pixiai-jwt-secret` | all services | NEXTAUTH_SECRET (shared with Next.js) |
| `anthropic-api-key` | latex, ai, grading | `sk-ant-api03-...` |
| `pixiai-google-client-id` | aero-backend / pixiai | Google OAuth client ID |

## gcloud build + deploy template (per service)

```bash
PROJECT_ID="extreme-lattice-491123-p2"
REGION="asia-southeast1"
SERVICE_NAME="pixiai-teacher"          # ← change this
SRC_DIR="rust-services/teacher-service" # ← and this
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/aeroedu/${SERVICE_NAME}:latest"
RUST_LOG_KEY="teacher_service"          # ← and this (underscores)
SECRETS="DATABASE_URL=pixiai-database-url:latest,NEXTAUTH_SECRET=pixiai-jwt-secret:latest"
GATEWAY_ENV_VAR="TEACHER_SERVICE_URL"   # ← and this

cd "$SRC_DIR"
gcloud builds submit --tag "$IMAGE" --region="$REGION" --timeout=20m --project="$PROJECT_ID" .
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE" --region="$REGION" --project="$PROJECT_ID" \
  --platform=managed --allow-unauthenticated \
  --cpu=1 --memory=512Mi --min-instances=0 --max-instances=5 --timeout=120 \
  --set-secrets="$SECRETS" \
  --set-env-vars="RUST_LOG=${RUST_LOG_KEY}=info"

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" \
  --project="$PROJECT_ID" --format='value(status.url)')
echo "Deployed: $SERVICE_URL"
# Then update aero-backend:
# gcloud run services update pixiai-aero-backend --region=$REGION \
#   --update-env-vars="${GATEWAY_ENV_VAR}=${SERVICE_URL}"
```
