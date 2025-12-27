# LMS Platform with Next.js 15, Prisma, Google Cloud

## 🚀 Tech Stack
- **Frontend & API**: Next.js 15 (App Router, React, TailwindCSS, shadcn/ui)
- **Auth**: NextAuth.js
- **Database**: Cloud SQL (Postgres/MySQL) + Prisma ORM
- **Storage**: Google Cloud Storage (file/video upload, streaming)
- **Deployment**: Google Cloud Run (containerized)
- **Optional**: Stripe for payments, Cloud CDN for faster video delivery

---

## ✨ Key Features
- Browse & Filter Courses
- Purchase Courses (Stripe integration optional)
- Mark Chapters as Completed/Uncompleted
- Progress Tracking for each Course
- Student Dashboard & Teacher Dashboard
- Create & Manage Courses and Chapters
- Drag & Drop reordering of chapters
- Upload thumbnails, attachments & videos → **GCS**
- Stream videos from **GCS + HLS**
- Rich text editor (TipTap) for content
- Authentication with **NextAuth**
- Deployment on **Google Cloud Run**

---

## ⚙️ Prerequisites
- Node.js **18+**
- Google Cloud SDK (`gcloud`) installed & authenticated
- Google Cloud Project with:
  - Cloud Run
  - Cloud SQL Admin
  - Cloud Storage
  - Cloud Build

---

## 🛠️ Setup

### Clone repository
```bash
git clone https://github.com/your-username/next15-lms-platform.git
cd next15-lms-platform
```

### Install dependencies
```bash
npm install
```

### Environment variables
Create a `.env` file:
```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME

# Google Cloud
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_BUCKET=your-gcs-bucket-name
GOOGLE_CLOUD_KEY_FILE=./service-account-key.json

# Stripe (optional)
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Prisma setup
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### Run locally
```bash
npm run dev
```
Visit → [http://localhost:3000](http://localhost:3000)

---

## ☁️ Deployment on Google Cloud

### Build Docker image
```bash
docker build -t gcr.io/PROJECT_ID/next15-lms .
docker push gcr.io/PROJECT_ID/next15-lms
```

### Deploy to Cloud Run
```bash
gcloud run deploy next15-lms   --image gcr.io/PROJECT_ID/next15-lms   --platform managed   --region asia-southeast1   --allow-unauthenticated   --set-env-vars NEXTAUTH_URL=$NEXTAUTH_URL,NEXTAUTH_SECRET=$NEXTAUTH_SECRET,DATABASE_URL=$DATABASE_URL,GOOGLE_CLOUD_BUCKET=$GOOGLE_CLOUD_BUCKET
```

---

## 📌 Available Commands
| Command   | Description                           |
|-----------|---------------------------------------|
| `dev`     | Run app in development mode           |
| `build`   | Build app for production              |
| `start`   | Start production server               |
| `lint`    | Run ESLint to check code style        |

---

## 📂 Notes
- **Video storage**: handled via GCS (configure CORS for upload).
- **Database**: Cloud SQL with Prisma migration.
- **Deployment**: Cloud Run auto-scales by traffic.
- **Optional**: Stripe for payments, Cloud CDN for optimized video streaming.
