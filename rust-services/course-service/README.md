# Aeroeduvison Course Service

Rust course management service handling:
- Course CRUD operations
- Chapter management
- Progress tracking
- Course publishing/unpublishing
- Attachments

## Quick Start

```bash
cd /Users/pixibox/Aeroeduvison/rust-services/course-service
cargo run
```

Default: `http://127.0.0.1:8093`

## Environment Variables

```bash
# Server
COURSE_SERVICE_ADDR=127.0.0.1:8093

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aeroeduvison

# JWT (for auth validation)
JWT_SECRET=your-super-secret-key-min-32-chars

# File storage (GCS/S3)
GCS_BUCKET=your-bucket-name
GCS_PROJECT_ID=your-project-id
```

## API Endpoints

### Courses
- `POST /api/courses` - Create course
- `GET /api/courses` - List courses
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course
- `POST /api/courses/:id/publish` - Publish course
- `POST /api/courses/:id/unpublish` - Unpublish course

### Chapters
- `POST /api/courses/:courseId/chapters` - Create chapter
- `GET /api/courses/:courseId/chapters` - List chapters
- `GET /api/courses/:courseId/chapters/:id` - Get chapter
- `PUT /api/courses/:courseId/chapters/:id` - Update chapter
- `DELETE /api/courses/:courseId/chapters/:id` - Delete chapter
- `POST /api/courses/:courseId/chapters/reorder` - Reorder chapters
- `POST /api/courses/:courseId/chapters/:id/publish` - Publish chapter
- `POST /api/courses/:courseId/chapters/:id/unpublish` - Unpublish chapter

### Progress
- `GET /api/courses/:courseId/chapters/:id/progress` - Get progress
- `POST /api/courses/:courseId/chapters/:id/progress` - Update progress

## Health Check

```bash
curl http://127.0.0.1:8093/health
```

## Testing

```bash
cargo test
```
