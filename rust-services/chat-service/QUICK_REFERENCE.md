# Quick Reference Guide

## 30-Second Start

```bash
cp .env.example .env
docker-compose up
curl http://localhost:8096/health
```

## Endpoints Quick Reference

| Method | Endpoint | Purpose | Returns |
|--------|----------|---------|---------|
| GET | `/health` | Health check | 200 OK |
| GET | `/api/chat/rooms` | List user's rooms | Array of ChatRoom |
| POST | `/api/chat/rooms` | Create room | 201 ChatRoom |
| GET | `/api/chat/rooms/:id/messages` | Get messages | Array of ChatMessage |
| POST | `/api/chat/rooms/:id/messages` | Send message | 201 ChatMessage |
| GET | `/api/chat/rooms/:id/members` | List members | Array of RoomMember |
| GET | `/ws?room_id=X&token=Y` | WebSocket | Upgrade to WS |

## Environment Variables

```
DATABASE_URL=postgres://user:pass@host:5432/db
CHAT_SERVICE_ADDR=0.0.0.0:8096
JWT_SECRET=your-secret-key
RUST_LOG=debug
```

## Common Commands

```bash
# Development
cargo run                    # Start service
cargo test                   # Run tests
cargo build --release       # Build optimized

# Docker
docker-compose up           # Start with database
docker-compose down         # Stop everything
docker build -t chat:1.0.0 .  # Build image

# Database
sqlx migrate run            # Run migrations manually
psql $DATABASE_URL          # Connect to database

# Testing
curl -H "Authorization: Bearer $TOKEN" http://localhost:8096/api/chat/rooms
websocat "ws://localhost:8096/ws?room_id=X&token=$TOKEN"
```

## JWT Token (Python)

```python
import jwt
from datetime import datetime, timedelta

token = jwt.encode({
    'sub': 'user-123',
    'email': 'user@example.com',
    'role': 'student',
    'exp': datetime.now() + timedelta(hours=1)
}, 'your-secret-key', algorithm='HS256')
print(token)
```

## Request Examples

### Create Room
```bash
curl -X POST http://localhost:8096/api/chat/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Room","description":"Desc","room_type":"study_group"}'
```

### Send Message
```bash
curl -X POST http://localhost:8096/api/chat/rooms/room-id/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello"}'
```

### Get Messages
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8096/api/chat/rooms/room-id/messages
```

### WebSocket
```bash
websocat "ws://localhost:8096/ws?room_id=room-id&token=$TOKEN"
# Then type: {"content":"Your message"}
```

## Data Models (Minimal)

### ChatRoom
```json
{
  "id": "room-123",
  "name": "Physics 12A",
  "description": "Optional description",
  "room_type": "study_group|course|direct",
  "created_by": "user-456",
  "last_message": "Last message text",
  "last_message_at": "2024-04-09T10:30:00Z",
  "member_count": 24,
  "created_at": "2024-04-08T10:00:00Z",
  "updated_at": "2024-04-09T10:30:00Z"
}
```

### ChatMessage
```json
{
  "id": "msg-789",
  "room_id": "room-123",
  "user_id": "user-456",
  "user_name": "student@school.edu",
  "content": "Hello everyone",
  "message_type": "text",
  "created_at": "2024-04-09T10:30:00Z"
}
```

### RoomMember
```json
{
  "id": "member-000",
  "room_id": "room-123",
  "user_id": "user-456",
  "user_name": "student@school.edu",
  "role": "admin|member",
  "joined_at": "2024-04-08T10:00:00Z"
}
```

## Error Responses

```json
{
  "error": "Unauthorized|Room not found|Invalid request|..."
}
```

Status codes:
- 200: OK
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Database connection fails | Check `DATABASE_URL` format |
| Unauthorized errors | Verify JWT token and secret |
| WebSocket won't connect | Check room exists, token valid, bearer format |
| Messages not persisting | Check database connectivity |
| High memory usage | Reduce broadcast channel buffer or close old channels |

## File Locations

- **Source Code**: `src/`
- **Database Schema**: `migrations/001_chat.sql`
- **Config Template**: `.env.example`
- **Docker**: `Dockerfile`, `docker-compose.yml`
- **Documentation**: `README.md`, `SETUP.md`, `EXAMPLES.md`, `TESTING.md`, `DEPLOYMENT.md`

## Key Files to Read

1. **Getting Started**: README.md → SETUP.md
2. **API Usage**: EXAMPLES.md
3. **Testing**: TESTING.md
4. **Production**: DEPLOYMENT.md
5. **Architecture**: FILE_STRUCTURE.md

## Common URLs

```
http://localhost:8096/health          - Health check
http://localhost:8096/api/chat/rooms  - List rooms
ws://localhost:8096/ws?room_id=X      - WebSocket
```

## Port Reference

- **Chat Service**: 8096 (default)
- **PostgreSQL**: 5432 (default)

## Performance Tips

- Use connection pooling for high load
- Set appropriate database timeout
- Keep broadcast channel buffers sized for traffic
- Archive old messages periodically
- Use indexes for queries (already configured)

## Security Checklist

- [ ] JWT_SECRET is strong (32+ characters)
- [ ] Database password is strong
- [ ] HTTPS/TLS enabled in production
- [ ] CORS configured for your domain
- [ ] Database backups enabled
- [ ] Logs are monitored and rotated
- [ ] Access logs are retained 90+ days

## Monitoring

```bash
# Check service health
curl http://localhost:8096/health

# View logs
docker-compose logs chat-service

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM chat_messages;"
```

## Database Queries

```sql
-- Count messages in room
SELECT COUNT(*) FROM chat_messages WHERE room_id = 'room-id';

-- Find user's rooms
SELECT * FROM chat_rooms cr
INNER JOIN room_members rm ON cr.id = rm.room_id
WHERE rm.user_id = 'user-id';

-- Recent messages
SELECT * FROM chat_messages 
WHERE room_id = 'room-id'
ORDER BY created_at DESC 
LIMIT 50;

-- Room stats
SELECT cr.name, COUNT(DISTINCT cm.id) as msg_count, cr.member_count
FROM chat_rooms cr
LEFT JOIN chat_messages cm ON cr.id = cm.room_id
GROUP BY cr.id;
```

## Deployment Quick Steps

1. Set strong secrets: `openssl rand -base64 32`
2. Build image: `docker build -t chat:v1.0 .`
3. Push to registry: `docker push registry.../chat:v1.0`
4. Update Kubernetes/ECS manifests
5. Deploy and monitor

## Getting Help

1. Check [SETUP.md](./SETUP.md) troubleshooting section
2. Review [EXAMPLES.md](./EXAMPLES.md) for API usage
3. Read [TESTING.md](./TESTING.md) for test scenarios
4. Check logs: `RUST_LOG=debug cargo run`
5. Verify database: `psql $DATABASE_URL -c "SELECT 1;"`

## Feature Checklist

- [x] REST API for rooms and messages
- [x] WebSocket real-time messaging
- [x] PostgreSQL persistence
- [x] JWT authentication
- [x] Room membership management
- [x] Message history (last 50)
- [x] CORS support
- [x] Health check endpoint
- [x] Automatic migrations
- [x] Docker support
- [x] Comprehensive documentation
- [x] Error handling
- [x] Logging

## Version Information

- Rust Edition: 2021
- Service Version: 0.1.0
- Supports: PostgreSQL 12+
- Language: Rust
- Framework: Axum 0.7

## License

Part of AeroEduVision project

---

**For detailed information, see the main documentation files listed above.**
