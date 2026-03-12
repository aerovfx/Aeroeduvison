# Aeroeduvison Media Service

Rust media service handling:
- Document CRUD & processing
- Exam generation from matrices
- File upload with presigned URLs
- GCS integration

## Quick Start

```bash
cd /Users/pixibox/Aeroeduvison/rust-services/media-service
cargo run
```

Default: `http://127.0.0.1:8098`

## Environment Variables

```bash
# Server
MEDIA_SERVICE_ADDR=127.0.0.1:8098

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aeroeduvison

# JWT (for auth validation)
JWT_SECRET=your-super-secret-key-min-32-chars

# GCS (Google Cloud Storage)
GCS_BUCKET=your-bucket-name
GCS_PROJECT_ID=your-project-id
GCS_CREDENTIALS_JSON=path/to/credentials.json

# Or use ADC (Application Default Credentials)
# GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
```

## API Endpoints

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Create document
- `GET /api/documents/:id` - Get document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `POST /api/documents/:id/process` - Process document
- `POST /api/documents/upload` - Upload document

### Exams
- `GET /api/exam-matrices` - List exam matrices
- `POST /api/exam-matrices` - Create exam matrix
- `GET /api/exam-matrices/:id` - Get matrix
- `POST /api/exam-matrices/:id/process` - Process matrix
- `POST /api/exams/generate-from-matrix` - Generate exam

### Upload
- `POST /api/upload/presigned-url` - Get presigned URL
- `POST /api/upload/gcs-presigned-url` - Get GCS presigned URL

## Health Check

```bash
curl http://127.0.0.1:8098/health
```

## Testing

```bash
cargo test
```
