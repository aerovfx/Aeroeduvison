# Aeroeduvison Student Service

Rust student service handling:
- Student CRUD operations
- Class management
- Learning paths
- PLG (Personalized Learning) system
- Skill tracking & recommendations

## Quick Start

```bash
cd /Users/pixibox/Aeroeduvison/rust-services/student-service
cargo run
```

Default: `http://127.0.0.1:8096`

## Environment Variables

```bash
# Server
STUDENT_SERVICE_ADDR=127.0.0.1:8096

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aeroeduvison

# JWT (for auth validation)
JWT_SECRET=your-super-secret-key-min-32-chars
```

## API Endpoints

### Students
- `GET /api/students` - List students
- `GET /api/students/:id` - Get student details
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Classes
- `GET /api/classes` - List classes
- `GET /api/classes/:id` - Get class details
- `POST /api/classes` - Create class
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class
- `GET /api/classes/:id/students` - List class students
- `POST /api/classes/:id/students/:studentId` - Add student to class

### Learning Paths
- `GET /api/learning-paths` - List learning paths
- `POST /api/learning-path/create` - Create learning path

### PLG (Personalized Learning)
- `GET /api/plg/:studentId` - Get PLG data
- `POST /api/plg/:studentId/update-skill` - Update skill
- `POST /api/plg/:studentId/record-interaction` - Record interaction
- `GET /api/plg/:studentId/recommendations` - Get recommendations

## Health Check

```bash
curl http://127.0.0.1:8096/health
```

## Testing

```bash
cargo test
```
