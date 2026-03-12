# Aeroeduvison Admin Service

Rust admin service handling:
- Admin dashboard & overview
- User management
- Student management
- Analytics & stats
- Auth logs
- STEM sync

## Quick Start

```bash
cd /Users/pixibox/Aeroeduvison/rust-services/admin-service
cargo run
```

Default: `http://127.0.0.1:8094`

## Environment Variables

```bash
# Server
ADMIN_SERVICE_ADDR=127.0.0.1:8094

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aeroeduvison

# JWT (for auth validation)
JWT_SECRET=your-super-secret-key-min-32-chars
```

## API Endpoints

### Dashboard
- `GET /api/admin/overview` - Admin dashboard overview
- `GET /api/admin/stats` - Platform statistics

### User Management
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

### Student Management
- `GET /api/admin/students` - List all students
- `GET /api/admin/students/:id` - Get student details
- `PUT /api/admin/students/:id` - Update student
- `DELETE /api/admin/students/:id` - Delete student

### STEM
- `GET /api/admin/stem` - STEM data
- `POST /api/admin/stem/sync` - Sync STEM data

### System
- `GET /api/admin/alerts` - System alerts
- `GET /api/admin/auth-logs` - Authentication logs
- `POST /api/admin/unlock-account` - Unlock locked account

## Health Check

```bash
curl http://127.0.0.1:8094/health
```

## Testing

```bash
cargo test
```
